import express from "express";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import readline from "readline";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- Health Check Route ---
app.get("/", (req, res) => {
  res.send("server is running");
});

// --- Helper: Load Knowledge Base ---
const getKnowledgeBase = () => {
  try {
    const filePath = path.join(process.cwd(), "knowledge_base.txt");
    return fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "No data.";
  } catch (err) {
    return "Error reading file.";
  }
};

// --- API Logic (For React/Vercel) ---
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  try {
    const contextData = getKnowledgeBase();
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Use this data: ${contextData}. Limit to 50 words.`,
        },
        ...messages,
      ],
      model: "llama-3.3-70b-versatile",
    });
    res.json({ reply: chatCompletion.choices[0]?.message?.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Terminal Logic (For Local Testing) ---
if (!process.env.VERCEL) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const startTerminalBot = async () => {
    const contextData = getKnowledgeBase();
    console.log("\x1b[32m%s\x1b[0m", "--- Terminal Mode Active ---");

    const ask = () => {
      rl.question("\x1b[36mYou: \x1b[0m", async (input) => {
        if (input.toLowerCase() === "exit") return rl.close();

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `Use this data: ${contextData}. Limit to 50 words.`,
            },
            { role: "user", content: input },
          ],
          model: "llama-3.3-70b-versatile",
        });

        console.log(
          `\n\x1b[33mBot:\x1b[0m ${response.choices[0].message.content}\n`,
        );
        ask();
      });
    };
    ask();
  };

  startTerminalBot();
}

const PORT = process.env.PORT || 8080;
// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
