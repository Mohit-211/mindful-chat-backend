const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/feedback
router.post("/", authMiddleware, async (req, res) => {
  console.log("💡 DEBUG: req.user =", req.user); // <--- Add this
  const userId = req.user?.userId;

  const { feedback } = req.body;

  if (!feedback || feedback.trim().length < 3) {
    return res.status(400).json({ error: "Feedback is too short" });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM feedbacks WHERE user_id = ?",
      [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Feedback already submitted" });
    }

    await db.query("INSERT INTO feedbacks (user_id, feedback) VALUES (?, ?)", [
      userId,
      feedback.trim(),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback saving failed:", err);
    res.status(500).json({ error: "Server error while saving feedback" });
  }
});

// GET /api/feedback
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      "SELECT id FROM feedbacks WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (rows.length > 0) {
      res.json({ hasFeedback: true });
    } else {
      res.json({ hasFeedback: false });
    }
  } catch (err) {
    console.error("Feedback lookup failed:", err);
    res.status(500).json({ error: "Server error checking feedback status" });
  }
});

module.exports = router;
