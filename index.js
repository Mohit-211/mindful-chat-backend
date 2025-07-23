require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const feedbackRoutes = require("./routes/feedback");
const guestRoutes = require("./routes/guestRoutes");
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/*
app.use(
  cors({
    origin: "https://madira.xyz",
    credentials: true,
  })
);
*/

app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/guest", guestRoutes);
app.get("/", (req, res) => {
  res.send("API is running.");
});

// Serve frontend
const clientBuildPath = path.join(
  __dirname,
  "..",
  "mindful-chat-frontend",
  "build"
);
app.use(express.static(clientBuildPath));
app.get(/^\/(?!api).*/, (req, res) => {
  const indexFile = path.join(clientBuildPath, "index.html");
  fs.existsSync(indexFile)
    ? res.sendFile(indexFile)
    : res.status(404).send("Not built.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
