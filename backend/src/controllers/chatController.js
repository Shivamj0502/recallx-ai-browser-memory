const Activity = require("../models/Activity");
const getEmbedding = require("../utils/embedding");
const { cosineSimilarity } = require("../services/vectorService");
const { askLLM } = require("../services/llmService");
const Chat = require("../models/Chat");
const extractTimeFilter = require("../utils/timeFilter");

// HELPERS

function isVagueQuery(query) {
    query = query.toLowerCase();
    return (
        query.includes("this blog") ||
        query.includes("that blog") ||
        query.includes("this article") ||
        query.includes("that article") ||
        query.includes("explain this") ||
        query.includes("explain that")
    );
}

function isAggregationQuery(query) {
    query = query.toLowerCase();
    return (
        query.includes("what did i") ||
        query.includes("did i read") ||
        query.includes("did i watch") ||
        query.includes("how many") ||
        query.includes("what all") ||
        query.includes("list") ||
        query.includes("all blogs") ||
        query.includes("all videos")
    );
}

function isLastActivityQuery(query) {
    query = query.toLowerCase();
    return (
        query.includes("last website") ||
        query.includes("just visited") ||
        query.includes("last site") ||
        query.includes("recent website")
    );
}

function isLastTypedQuery(query, type) {
    query = query.toLowerCase();

    if (type === "blog") {
        return query.includes("last blog");
    }

    if (type === "youtube") {
        return query.includes("last video") || query.includes("last watched");
    }

    return false;
}

// MAIN

exports.chatWithMemory = async (req, res) => {
    try {
        const { query, history = [] } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        console.log("\n==============================");
        console.log("ORIGINAL QUERY:", query);

        await Chat.create({ role: "user", text: query });

        let finalQuery = query;

        if (history.length > 0 && query.length < 40) {
            const lastUserMsg = history
                .filter(m => m.role === "user")
                .slice(-2, -1)[0];

            if (lastUserMsg) {
                finalQuery = `${lastUserMsg.text} ${query}`;
            }
        }

        console.log("FINAL QUERY:", finalQuery);

        // ======================
        // 🔥 DIRECT ANSWERS
        // ======================

        // LAST WEBSITE
        if (isLastActivityQuery(finalQuery)) {
            const last = await Activity.findOne().sort({ createdAt: -1 });

            if (!last) {
                return res.json({ answer: "No activity found." });
            }

            return res.json({
                answer: `The last website you visited was ${last.title || last.url}`
            });
        }

        // LAST BLOG
        if (isLastTypedQuery(finalQuery, "blog")) {
            const lastBlog = await Activity.findOne({ type: "blog" })
                .sort({ createdAt: -1 });

            if (!lastBlog) {
                return res.json({ answer: "No blog found." });
            }

            return res.json({
                answer: `The last blog you read was ${lastBlog.title}`
            });
        }

        // LAST VIDEO
        if (isLastTypedQuery(finalQuery, "youtube")) {
            const lastVideo = await Activity.findOne({ type: "youtube" })
                .sort({ createdAt: -1 });

            if (!lastVideo) {
                return res.json({ answer: "No video found." });
            }

            return res.json({
                answer: `The last video you watched was ${lastVideo.title}`
            });
        }

        // ======================
        // 🔥 NORMAL FLOW
        // ======================

        const vague = isVagueQuery(finalQuery);
        const aggregation = isAggregationQuery(finalQuery);

        let activities = [];
        let queryEmbedding = null;

        if (vague) {
            activities = await Activity.find()
                .sort({ createdAt: -1 })
                .limit(3);

        } else {
            const timeFilter = extractTimeFilter(finalQuery);

            let mongoQuery = {};

            if (timeFilter) {
                mongoQuery.createdAt = timeFilter;
            }

            activities = await Activity.find(mongoQuery)
                .sort({ createdAt: -1 })
                .limit(200);

            if (activities.length === 0) {
                if (timeFilter) {
                    return res.json({
                        answer: "No data available for this time range."
                    });
                }

                activities = await Activity.find()
                    .sort({ createdAt: -1 })
                    .limit(5);
            }

            queryEmbedding = await getEmbedding(finalQuery);
        }

        // ======================
        // 🔥 SELECTION
        // ======================

        let topResults = [];

        if (vague) {
            topResults = activities;

        } else if (aggregation) {
            console.log("Aggregation query");

            let typeFilter = {};

            if (finalQuery.toLowerCase().includes("blog")) {
                typeFilter.type = "blog";
            }

            if (
                finalQuery.toLowerCase().includes("video") ||
                finalQuery.toLowerCase().includes("watch")
            ) {
                typeFilter.type = "youtube";
            }

            if (Object.keys(typeFilter).length > 0) {
                topResults = await Activity.find(typeFilter)
                    .sort({ createdAt: -1 })
                    .limit(10);
            } else {
                topResults = activities.slice(0, 10);
            }

            // 🔥 CRITICAL FILTER (fix your bug)
            topResults = topResults.filter(item =>
                item.url &&
                !item.url.includes("google.com") &&
                item.title &&
                item.title.length > 3 &&
                item.content &&
                item.content.length > 10
            );

        } else {
            const scored = activities.map(item => {
                if (!item.embedding) return null;

                const score = cosineSimilarity(queryEmbedding, item.embedding);
                return { ...item._doc, score };
            }).filter(Boolean);

            topResults = scored
                .filter(r => r.score > 0.15)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        }

        // fallback
        if (!vague && topResults.length === 0) {
            topResults = activities.slice(0, 3);
        }

        if (topResults.length === 0) {
            return res.json({
                answer: "I couldn't find anything in your browsing history."
            });
        }

        // ======================
        // 🔥 CONTEXT
        // ======================

        const context = `
Total Results: ${topResults.length}

${topResults.map((r, i) =>
`Result ${i + 1}:
Title: ${r.title}
Content: ${r.content}`
).join("\n\n")}
`;

        const response = await askLLM(query, context, history);

        await Chat.create({
            role: "assistant",
            text: response
        });

        res.json({ answer: response });

    } catch (err) {
        console.error("ERROR:", err.message);
        res.status(500).json({ error: "Chat failed" });
    }
};