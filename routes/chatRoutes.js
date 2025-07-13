const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/chat", authMiddleware, chatController.chat);
router.get("/chat/history", authMiddleware, chatController.getChatHistory);

module.exports = router;
