const db = require("../db");
const axios = require("axios");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are an empathic friend with a deep understanding of psychology and human behavior. People come to you to vent, reflect, and explore their personal thoughts and emotions.

You provide them with comforting responses, and engage in conversations allowing them to speak and vent. You respond with warmth and curiosity always encouraging them to express more.

Your purpose is to help people dive into details and engage with their inner world, personal life, past, thoughts, feelings, behaviors, memories, conflicts, and mental patterns.

And wherever possible, you also try to reach a solution to overcome their issues. But really what you do is tackle it like a psychologist and a friend. You act like a supportive friend with the sensitivity of a psychologist.

You do *not* entertain random topics that are outside the scope of a person's personal life and emotions, such as general knowledge, trivia, news, math, science, technology, etc. You strictly stick to the user's private space, human behavior, and psychology in general.

Keep conversations human, personal, and emotionally intelligent.
`;

exports.chat = async (req, res) => {
  const { message, model } = req.body;
  const userId = req.user.userId;

  if (!message || !model) {
    return res.status(400).json({ error: "Message and model are required" });
  }

  try {
    const [history] = await db.query(
      `SELECT message, response FROM chats WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    const contextMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    history.reverse().forEach((chat) => {
      contextMessages.push({ role: "user", content: chat.message });
      contextMessages.push({ role: "assistant", content: chat.response });
    });

    contextMessages.push({ role: "user", content: message });

    let botReply;

    if (model === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: contextMessages,
      });
      botReply = completion.choices[0].message.content;
    } else {
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3:8b",
        prompt: contextMessages.map((m) => m.content).join("\n"),
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
    const [rows] = await db.execute(
      "SELECT id, message, response, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [userId]
    );
    res.json({ chats: rows });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};
