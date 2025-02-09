import greetings from "./greetings.js";
console.log("Testing script running");

// DOM Elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const deleteBtn = document.getElementById("delete-btn");

// Gemini API Configuration
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const API_KEY = "AIzaSyDm2rejQY3dUFQHEMVf9kG9lxKOgkKGzGE";

// Utility functions
const formatText = (text) =>
  text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

const splitIntoPassages = (text, maxLines = 4) => {
  const lines = text.split("\n");
  const passages = [];
  let currentPassage = "";
  lines.forEach((line, index) => {
    currentPassage += line + "\n";
    if ((index + 1) % maxLines === 0 || index === lines.length - 1) {
      passages.push(currentPassage.trim());
      currentPassage = "";
    }
  });
  return passages;
};

const createMessageElement = (role, text) => {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", role);

  const messageTextDiv = document.createElement("div");
  messageTextDiv.classList.add("message-text");

  const formattedText = formatText(text);
  const passages = splitIntoPassages(formattedText);
  passages.forEach((passage) => {
    const p = document.createElement("p");
    p.innerHTML = passage;
    messageTextDiv.appendChild(p);
  });

  const timestampSpan = document.createElement("span");
  timestampSpan.classList.add("timestamp");
  timestampSpan.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.appendChild(messageTextDiv);
  messageDiv.appendChild(timestampSpan);

  return messageDiv;
};

const addMessage = (role, text) => {
  const messageElement = createMessageElement(role, text);
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
};

const sendToGemini = async (userMessage) => {
  try {
    addMessage("user", userMessage);

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
      }),
    });

    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();
    const botMessage =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";
    addMessage("bot", botMessage);
  } catch (error) {
    console.error("Error:", error);
    addMessage("bot", "Error connecting to the AI server.");
  }
};

const clearChat = () => {
  chatBox.innerHTML = "";
};

const handleSend = () => {
  const userMessage = userInput.value.trim();
  if (userMessage) {
    userInput.value = "";
    sendToGemini(userMessage);
  }
};

// Event Listeners
sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});
deleteBtn.addEventListener("click", clearChat);

// Initial Greeting
window.addEventListener("load", () => {
  const randomGreeting =
    greetings[Math.floor(Math.random() * greetings.length)];
  setTimeout(() => {
    addMessage("bot", randomGreeting);
    setTimeout(() => {
      const lastBotMessage = document.querySelector(
        ".message.bot:last-child p"
      );
      if (lastBotMessage) lastBotMessage.classList.add("show");
    }, 100);
  }, 200);
});
