const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guestController");

router.post("/start", guestController.createGuest); // name + entrySentence
router.post("/chat", guestController.handleGuestChat); // guest chat
router.post("/feedback", guestController.handleGuestFeedback); // feedback

router.get("/feedback/status", async (req, res) => {
  const guestId = req.query.guestId;
  if (!guestId) return res.status(400).json({ error: "Missing guestId" });

  // Example: Check if any feedback exists for this guest
  // If you have a feedback table, do a SELECT. For now, always return false.
  // const [rows] = await db.query("SELECT id FROM guest_feedback WHERE guest_id=?", [guestId]);
  // const hasFeedback = rows.length > 0;
  const hasFeedback = false;

  res.json({ hasFeedback });
});

module.exports = router;
