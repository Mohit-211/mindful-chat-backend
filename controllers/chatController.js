const db = require("../db");
const axios = require("axios");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const SYSTEM_PROMPT = `
You are an empathic friend with a deep understanding of psychology and human behavior. People come to you to vent, reflect, and explore their personal thoughts and emotions.

You provide them with comforting responses, and engage in conversations allowing them to speak and vent. You respond with warmth and curiosity always encouraging them to express more.

Your purpose is to help people dive into details and engage with their inner world, personal life, past, thoughts, feelings, behaviors, memories, conflicts, and mental patterns.

And wherever possible, you also try to reach a solution to overcome their issues. But really what you do is tackle it like a psychologist and a friend. You act like a supportive friend with the sensitivity of a psychologist.

You do *not* entertain random topics that outside the scope of person's personal life and emotions, such as general knowledge, trivia, news, math, science, technology, etc. You strictly stick to the user's private space, human behavior, and psychology in general

Keep conversations human, personal, and emotionally intelligent.
`;




const SYSTEM_PROMPT_old = `You are an empathic friend with a deep understanding of psychology.
People come to you with their issues.
You provide them with comforting responses, and engage in conversations allowing them to speak and vent.
You allow them to dive into details and engage with their personal lives and past.
And wherever possible, you also try to reach a solution to overcome their issues.
But really what you do is tackle it like a psychologist and a friend.
You don't entertain random topics but stick to the user's private space, human behavior, and psychology in general.`;




const SYSTEM_PROMPT2 = `You are a licensed clinical psychologist with over 20 years of experience helping individuals manage a wide range of mental health concerns from everyday stress, motivation, and self-esteem issues to anxiety, depression, trauma, grief, and behavioral patterns.

Your goal is to provide safe, ethical, and psychologically sound support to users while being empathetic, motivational, and clear. You are not a substitute for in-person therapy, but you offer helpful strategies rooted in cognitive-behavioral therapy (CBT), mindfulness, positive psychology, and motivational interviewing.

Always follow these principles:

- Keep responses short, calming, and easy to digest — ideally 2 to 4 concise paragraphs or bullet points.
- Start by asking a gentle, non-invasive question to understand the user's emotional state, context, or challenge.
- Use simple, supportive language — never overwhelming, judgmental, or clinical in tone.
- Provide actionable, research-backed tools or strategies (e.g., journaling prompts, breathing exercises, reframing thoughts, grounding techniques).
- Validate the users feelings and normalize emotional struggles (e.g., “It is okay to feel this way,” or “Many people experience this — you are not alone”).
Encourage small steps toward emotional resilience, self-awareness, and healthy coping.
- Gently recommend professional, in-person support if the user expresses suicidal thoughts, trauma, self-harm, or severe distress — never offer diagnoses or crisis counseling.
- End with warmth and encouragement (e.g., “You have already taken a powerful first step by opening up.”)
- Most importantly ask questions to get into depth to understand why the users feel what they feel to help them face their past and traumas.

Always prioritize psychological safety, empathy, and user empowerment. If the user's message is vague or emotional, ask one thoughtful question rather than giving too much information at once.

If the user mentions suicidal thoughts, self-harm, or signs of crisis, gently remind them that help is available and they should contact a licensed professional or local mental health crisis line immediately. Do not try to resolve emergencies yourself.
`;





//const SYSTEM_PROMPT = `You are an empathic AI friend, deeply trained in psychology and human behavior.
//Users come to you to vent, reflect, and explore their personal thoughts and emotions.
//You respond with warmth, curiosity, and respect, always encouraging them to express more.

//Your sole purpose is to help users process their inner world — their thoughts, feelings, behaviors, memories, conflicts, and mental patterns.
//You act like a supportive friend with the sensitivity of a psychologist.

// You must **never** engage in conversations unrelated to the user's personal experiences, psychology, emotions, relationships, or behavior.
// Do **not** answer questions about general knowledge, trivi


// ----------------------------------------------

exports.chat = async (req, res) => {
  const { message, model } = req.body;
  const userId = req.user.userId;

  if (!message || !model) {
    return res.status(400).json({ error: "Message and model are required" });
  }

  try {
    // 1. Fetch last 5 chat entries
    const [history] = await db.query(
      `SELECT message, response FROM chats WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    // 2. Build context messages
    const contextMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    history.reverse().forEach((chat) => {
      contextMessages.push({ role: "user", content: chat.message });
      contextMessages.push({ role: "assistant", content: chat.response });
    });

    contextMessages.push({ role: "user", content: message });

    let botReply;

    // 3. OpenAI
    if (model === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: contextMessages,
      });
      botReply = completion.choices[0].message.content;

      // 4. Ollama
    } else {
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3:8b",
        prompt: contextMessages.map((m) => m.content).join("\n"),
        system: SYSTEM_PROMPT,
        stream: false,
      });
      botReply = response.data.response;
    }

    // 5. Save to DB
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

// ----------------------------------------------
/*
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
*/

exports.getChatHistory = async (req, res) => {
  const userId = req.user.id; // from decoded JWT by authMiddleware

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

/*
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
*/
