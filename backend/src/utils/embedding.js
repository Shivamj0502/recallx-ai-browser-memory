const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function getEmbedding(text) {
    try {
        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });

        const embedding = response.data[0].embedding;

        console.log("✅ Embedding length:", embedding.length);

        return embedding;

    } catch (error) {
        console.error("🔥 OpenAI Embedding Error:", error.message);

        return Array(1536).fill(0); // fallback
    }
}

module.exports = getEmbedding;