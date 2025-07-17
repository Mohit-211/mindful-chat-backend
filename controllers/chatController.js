const db = require("../db");
const axios = require("axios");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an empathic friend with a deep understanding of psychology.
People come to you with their issues.
You provide them with comforting responses, and engage in conversations allowing them to speak and vent.
You allow them to dive into details and engage with their personal lives and past.
And wherever possible, you also try to reach a solution to overcome their issues.
But really what you do is tackle it like a psychologist and a friend.
You don't entertain random topics but stick to the user's private space, human behavior, and psychology in general.`;

exports.chat = async (req, res) => {
  const { message, model } = req.body;
  const userId = req.user.userId;

  if (!message || !model) {
    return res.status(400).json({ error: "Message and model are required" });
  }

  try {
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
};

exports.getChatHistory = async (req, res) => {
  const userId = req.user.userId;

  try {
    const [chats] = await db.query(
      "SELECT message, response, created_at FROM chats WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );

    res.json({ chats });
  } catch (err) {
    console.error("Fetch history error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
