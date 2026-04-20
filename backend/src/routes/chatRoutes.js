const express = require("express");
const router = express.Router();
const { chatWithMemory } = require("../controllers/chatController");
const Chat = require("../models/Chat");

router.post("/chat", chatWithMemory);

//  GET CHAT HISTORY
router.get("/chat-history", async (req, res) => {
    try {
        const chats = await Chat.find()
            .sort({ createdAt: 1 })
            .limit(50);

        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

module.exports = router;