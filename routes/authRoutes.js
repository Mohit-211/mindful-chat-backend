const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../db"); // or wherever you defined your DB connection

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me); // Keep this if you're using controller version

// Or define inline (only one of these is needed)
router.get("/me-inline", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const [rows] = await db.query(
    "SELECT id, name, email FROM users WHERE id = ?",
    [userId]
  );
  res.json(rows[0]);
});

module.exports = router;

