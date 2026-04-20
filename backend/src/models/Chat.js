const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    role: String,   // user / assistant
    text: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Chat", chatSchema);