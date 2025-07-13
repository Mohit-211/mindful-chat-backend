const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);

module.exports = router;

router.get("/me", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const [rows] = await db.query(
    "SELECT id, name, email FROM users WHERE id = ?",
    [userId]
  );
  res.json(rows[0]);
});
