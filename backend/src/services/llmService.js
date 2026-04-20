const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.askLLM = async (query, context, history = []) => {

    const messages = [
  {
    role: "system",
    content: `
You are an AI assistant with strict rules.

Rules:
1. Answer ONLY from the provided context.
2. Do NOT use your own knowledge.
3. If not found, say:
   "I could not find this in your browsing history."
4. If multiple results are provided, analyze ALL of them.
5. If the question involves count, explicitly count and answer clearly.
6. Be concise and accurate.
`
  }
];

    // past conversation
    history.slice(-5).forEach(msg => {
        messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
        });
    });

    // context + question
    messages.push({
        role: "user",
        content: `
Context:
${context}

Question:
${query}
`
    });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2, // less creativity = less bakchodi
    });

    return response.choices[0].message.content;
};