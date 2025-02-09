// ========== IMPORTS & CONSTANTS ==========
import greetings from "./greetings.js";

// DOM Elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const deleteBtn = document.getElementById("delete-btn");
const themeBtn = document.getElementById("theme-btn");

// API Configuration
// const API_URL =
// "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
// API Configuration
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const API_KEY = "AIzaSyDm2rejQY3dUFQHEMVf9kG9lxKOgkKGzGE";
const THEME_KEY = "chatTheme";

// ========== UTILITY FUNCTIONS ==========

const formatText = (text) =>
  text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

const splitIntoPassages = (text, maxLines = 4) => {
  const lines = text.split("\n");
  return lines
    .reduce((passages, line, index) => {
      const passageIndex = Math.floor(index / maxLines);
      if (!passages[passageIndex]) passages[passageIndex] = "";
      passages[passageIndex] += line + "\n";
      return passages;
    }, [])
    .map((p) => p.trim());
};

// ========== THEME MANAGEMENT ==========

const setTheme = (isDark) => {
  document.body.classList.toggle("dark-theme", isDark);
  themeBtn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
};

const autoSetTheme = () => {
  const hours = new Date().getHours();
  const isNight = hours >= 19 || hours < 6; // 7 PM to 6 AM
  setTheme(isNight);
  return isNight;
};

const createMessageElement = (role, text) => {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const messageTextDiv = document.createElement("div");
  messageTextDiv.className = "message-text";

  // Format and split text into passages
  const formattedText = formatText(text);
  const passages = splitIntoPassages(formattedText);

  passages.forEach((passage) => {
    const p = document.createElement("p");
    p.innerHTML = passage;
    messageTextDiv.appendChild(p);
  });

  // Add timestamp
  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.append(messageTextDiv, timestamp);
  return messageDiv;
};

const addMessage = (role, text) => {
  const messageElement = createMessageElement(role, text);
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
};

const sendToGemini = async (userMessage) => {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const botResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm having trouble understanding. Please try again.";
    addMessage("bot", botResponse);
  } catch (error) {
    console.error("API Error:", error);
    addMessage(
      "bot",
      "Sorry, I'm currently unavailable. Please try again later."
    );
  }
};

/**
 * Clears all chat messages
 */
const clearChat = () => {
  chatBox.innerHTML = "";
  addMessage("bot", greetings[Math.floor(Math.random() * greetings.length)]);
};

// ========== EVENT HANDLERS ==========
/**
 * Handles message sending
 */
const handleSend = () => {
  const message = userInput.value.trim();
  if (message) {
    addMessage("user", message);
    userInput.value = "";
    sendToGemini(message);
  }
};

/**
 * Toggles between light/dark themes
 */
const toggleTheme = () => {
  const isDark = !document.body.classList.contains("dark-theme");
  setTheme(isDark);
};

// ========== EVENT LISTENERS ==========
sendBtn.addEventListener("click", handleSend);
deleteBtn.addEventListener("click", clearChat);
themeBtn.addEventListener("click", toggleTheme);
userInput.addEventListener(
  "keypress",
  (e) => e.key === "Enter" && handleSend()
);

// ========== INITIALIZATION ==========
window.addEventListener("load", () => {
  // Theme initialization
  const savedTheme = localStorage.getItem(THEME_KEY);
  savedTheme ? setTheme(savedTheme === "dark") : autoSetTheme();

  // Set up automatic theme updates if using system time
  if (!savedTheme) setInterval(autoSetTheme, 60000);

  // Initial greeting
  setTimeout(() => {
    addMessage("bot", greetings[Math.floor(Math.random() * greetings.length)]);
  }, 500);
});
