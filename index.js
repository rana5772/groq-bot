import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running...`);
});
import Groq from "groq-sdk";
import fs from "fs";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

// 1. Initialize Groq with your API Key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function startBot() {
  try {
    // 2. Load the Knowledge Base file
    if (!fs.existsSync("./knowledge_base.txt")) {
      console.error("Error: knowledge_base.txt not found!");
      process.exit(1);
    }
    const contextData = fs.readFileSync("./knowledge_base.txt", "utf8");

    console.log(
      "\x1b[32m%s\x1b[0m",
      "--- System: Rana.net.in Bot Ready (Groq) ---",
    );
    console.log("Rule: Answers are limited to 50 words.\n");

    // 3. Set up the Chat History with System Instructions
    let chatHistory = [
      {
        role: "system",
        content: `You are the official AI assistant for rana.net.in. 
        
        RULES:
        - Use this data to answer: ${contextData}
        - STRICTURE: Your answer must be 50 words or less.
        - Be professional and helpful.
        - If the information is not in the data, say: "I'm sorry, I don't have that information."`,
      },
    ];

    const ask = () => {
      rl.question("\x1b[36mYou: \x1b[0m", async (userInput) => {
        if (userInput.toLowerCase() === "exit") {
          console.log("Goodbye!");
          return rl.close();
        }

        // Add user's question to the history
        chatHistory.push({ role: "user", content: userInput });

        try {
          // 4. Call the Groq API
          const chatCompletion = await groq.chat.completions.create({
            messages: chatHistory,
            model: "llama-3.3-70b-versatile",
            temperature: 0.5, // Keeps responses focused
            max_tokens: 150, // Hard cap to prevent long rambling
          });

          const responseText =
            chatCompletion.choices[0]?.message?.content || "";

          console.log(`\n\x1b[33mBot:\x1b[0m ${responseText}\n`);

          // Add bot's answer to history for conversation memory
          chatHistory.push({ role: "assistant", content: responseText });

          // Prevent history from getting too long (Optional: keeps only last 10 exchanges)
          if (chatHistory.length > 10) {
            chatHistory.splice(1, 2);
          }
        } catch (err) {
          console.error("\nAPI Error:", err.message);
        }
        ask();
      });
    };

    ask();
  } catch (error) {
    console.error("Startup Error:", error.message);
  }
}

startBot();
