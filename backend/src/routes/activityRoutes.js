const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const getEmbedding = require("../utils/embedding");

// TYPE DETECTOR 
function detectType(url, title) {
    if (!url) return "other";

    // ignore backend API calls
    if (url.includes("/api/")) {
        return "other";
    }

    // REAL ERROR 
    if (title === "Frontend Error") {
        return "error";
    }

    //  YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return "youtube";
    }

    //  Blog
    if (url.includes("medium.com") || url.includes("blog")) {
        return "blog";
    }

    // Localhost but NOT error
    if (url.includes("localhost:5173")) {
        return "other";
    }

    return "other";
}

// Cosine similarity
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
}

// POST /activity
router.post("/activity", async (req, res) => {
    try {
        const data = req.body;

        const content = (data.content || "").trim();
        const title = (data.title || "").trim();

        const type = detectType(data.url, data.title);

        // HARD VALIDATION (skip only for NON-error)
        if (type !== "error" && (!content || content.length < 20)) {
            return res.status(400).json({ message: "Content too small" });
        }

        // avoid duplicates (recent same content)
        const existing = await Activity.findOne({
            url: data.url,
            content: content
        });

        if (existing) {
            return res.json({ message: "Duplicate skipped" });
        }

        // ONLY generate embedding for NON-error
        let embedding = null;

        if (type !== "error") {
            const combinedText = title + " " + content;
            embedding = await getEmbedding(combinedText);
        }

        console.log("👉 TYPE:", type, "| TITLE:", title);

        const newActivity = new Activity({
            url: data.url,
            title: title,
            content: content,
            embedding: embedding,
            type: type
        });

        await newActivity.save();

        res.json({ message: "Activity stored", type });

    } catch (error) {
        console.error("❌ ERROR:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

//  GET /activity
router.get("/activity", async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(20);

        const cleanData = activities.map(item => ({
            url: item.url,
            title: item.title,
            content: item.content,
            type: item.type
        }));

        res.json(cleanData);

    } catch (error) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

//  SMART SEARCH
router.get("/smart-search", async (req, res) => {
    try {
        const query = req.query.q;

        const queryEmbedding = await getEmbedding(query);

        const activities = await Activity.find({
            embedding: { $exists: true }
        }).limit(200);

        const scored = activities.map(item => ({
            item,
            score: cosineSimilarity(queryEmbedding, item.embedding)
        }));

        const filtered = scored.filter(x => x.score > 0.4);

        filtered.sort((a, b) => b.score - a.score);

        const results = filtered.slice(0, 10).map(x => ({
            url: x.item.url,
            title: x.item.title,
            content: x.item.content,
            type: x.item.type,
            score: x.score
        }));

        res.json(results);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Smart search failed" });
    }
});

//  ERROR SUMMARY + EXPLANATION
router.get("/error-summary", async (req, res) => {
    try {
        // only error type
        const errors = await Activity.find({ type: "error" })
            .sort({ createdAt: -1 })
            .limit(20);

        if (!errors.length) {
            return res.json({ message: "No errors found" });
        }

        //  combine errors
        const errorText = errors
            .map(e => e.content)
            .join("\n");

        const prompt = `
            You are a senior frontend mentor.

            These are my recent errors:
            ${errorText}

            Do the following:
            1. Group similar errors
            2. Explain each error in simple terms
            3. Give exact fix
            4. Suggest 1-2 YouTube tutorials (title only)

            Keep it short and clear.
            `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            })
        });

        const data = await response.json();

        const answer = data.choices?.[0]?.message?.content || "No response";

        res.json({ summary: answer });

    } catch (err) {
        console.error("❌ ERROR SUMMARY FAIL:", err);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

module.exports = router;