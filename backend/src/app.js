const express = require("express");
const cors = require("cors");
const activityRoutes = require("./routes/activityRoutes");
const rateLimit = require("express-rate-limit");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

app.use(limiter); 

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.use("/api", activityRoutes);

app.use("/api", chatRoutes);


app.get('/', (req, res) => {
    res.send("Backend running");
});

module.exports = app;