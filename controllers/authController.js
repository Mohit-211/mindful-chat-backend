const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const transporter = require("../utils/mailer");
const generateOTP = require("../utils/generateOTP");

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (name, email, phone, password_hash, otp, otp_expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone, hashedPassword, otp, otpExpiresAt]
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Mindful Chat",
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    });

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = rows[0];
    if (user.is_verified)
      return res.status(400).json({ error: "Already verified" });
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date(user.otp_expires_at) < new Date())
      return res.status(400).json({ error: "OTP expired" });

    await db.query(
      "UPDATE users SET is_verified = true, otp = NULL, otp_expires_at = NULL WHERE email = ?",
      [email]
    );
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
exports.logout = async (req, res) => {
  // No token invalidation server-side unless you're using token blacklists
  // Instead, we handle this on the client by deleting token from storage
  res.json({ message: "Logged out successfully" });
};
