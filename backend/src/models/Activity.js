const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    url: String,
    title: String,
    content: String,
    embedding: [Number],

    // NEW FIELD
    type: {
        type: String,
        enum: ["youtube", "blog", "error", "other"],
        default: "other"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Activity", activitySchema);