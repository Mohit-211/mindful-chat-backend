const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Register new user
router.post("/register", authController.register);

// Verify OTP
router.post("/verify-otp", authController.verifyOtp);

// Login
router.post("/login", authController.login);

// Logout
router.post("/logout", authMiddleware, authController.logout);

// Get current user info
router.get("/me", authMiddleware, authController.me);

module.exports = router;
