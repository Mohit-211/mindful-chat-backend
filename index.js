require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { OpenAI } = require("openai");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const db = require("./db");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an empathic friend with a deep understanding of psychology.
People come to you with their issues.
You provide them with comforting responses, and engage in conversations allowing them to speak and vent.
You allow them to dive into details and engage with their personal lives and past.
And wherever possible, you also try to reach a solution to overcome their issues.
But really what you do is tackle it like a psychologist and a friend.
You don't entertain random topics but stick to the user's private space, human behavior, and psychology in general.
`;

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  const { message, model, email } = req.body;

  if (!message || !model || !email) {
    return res
      .status(400)
      .json({ error: "Message, model, and email are required" });
  }

  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const userId = rows[0].id;
    let botReply;

    if (model === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      });
      botReply = completion.choices[0].message.content;
    } else {
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3:8b",
        prompt: message,
        system: SYSTEM_PROMPT,
        stream: false,
      });
      botReply = response.data.response;
    }

    await db.query(
      "INSERT INTO chats (user_id, message, response) VALUES (?, ?, ?)",
      [userId, message, botReply]
    );

    res.json({ response: botReply });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// OTP generator
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register endpoint
app.post("/api/register", async (req, res) => {
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
});

// Verify OTP endpoint
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = rows[0];

    if (user.is_verified) {
      return res.status(400).json({ error: "User already verified" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    await db.query(
      "UPDATE users SET is_verified = true, otp = NULL, otp_expires_at = NULL WHERE email = ?",
      [email]
    );

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get chat history
app.get("/api/chat/history", async (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const userId = rows[0].id;
    const [chats] = await db.query(
      "SELECT message, response, created_at FROM chats WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );

    res.json({ chats });
  } catch (err) {
    console.error("Fetch history error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Serve React frontend
const clientBuildPath = path.join(
  __dirname,
  "..",
  "mindful-chat-frontend",
  "build"
);

app.use(express.static(clientBuildPath));

app.get(/^\/(?!api).*/, (req, res) => {
  const indexFile = path.join(clientBuildPath, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("Frontend not built or index.html not found.");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
