// ===================== IMPORTS & CONSTANTS =====================
import greetings from "./greetings.js";

class StreamAPIClient {
  #apiUrl;
  #apiKey;
  #abortController;

  constructor(apiUrl, apiKey) {
    this.#apiUrl = apiUrl;
    this.#apiKey = apiKey;
  }

  async streamRequest(payload, onData, onComplete, onError) {
    this.#abortController = new AbortController();

    try {
      const response = await fetch(this.#apiUrl, {
        method: "POST",
        headers: this.#getHeaders(),
        body: JSON.stringify(payload),
        signal: this.#abortController.signal,
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      await this.#processStream(response, onData);
      onComplete?.();
    } catch (error) {
      error.name === "AbortError"
        ? console.log("Request aborted")
        : onError?.(error);
    }
  }

  abort() {
    this.#abortController?.abort();
  }

  async #processStream(response, onData) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = this.#processBuffer(buffer, onData);
    }

    this.#processBuffer(buffer, onData, true);
  }

  #processBuffer(buffer, onData, isFinal = false) {
    const lines = buffer.split("\n");
    lines.forEach((line) => {
      const event = this.#parseLine(line);
      if (event) onData(event.content);
    });
    return isFinal ? "" : lines.pop() || "";
  }

  #parseLine(line) {
    if (!line.startsWith("data:")) return null;
    try {
      const jsonData = JSON.parse(line.replace(/^data:\s*/, ""));
      return { content: jsonData.choices[0].delta?.content || "" };
    } catch (error) {
      console.warn("Skipping invalid line:", line);
      return null;
    }
  }

  #getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.#apiKey}`,
    };
  }
}

// DOM Elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const deleteBtn = document.getElementById("delete-btn");
const themeBtn = document.getElementById("theme-btn");

// API Configuration
const API_ENDPOINT = "https://www.deepseekapp.io/v1/chat/completions";
const API_KEY = "sk-PRx8SirvbTDMQTq86UuiRchSxxbTL1FU7oGWPGV5X71uPCq";
const apiClient = new StreamAPIClient(API_ENDPOINT, API_KEY);

// Local Storage Keys
const THEME_KEY = "chatTheme";

// ===================== UTILITY FUNCTIONS =====================
const formatText = (text) =>
  text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

const splitIntoPassages = (text, maxLines = 4) => {
  const lines = text.split("\n");
  return Array.from({ length: Math.ceil(lines.length / maxLines) }, (_, i) =>
    lines.slice(i * maxLines, (i + 1) * maxLines).join("\n")
  );
};

// ===================== THEME MANAGEMENT =====================
const setTheme = (isDark) => {
  document.body.classList.toggle("dark-theme", isDark);
  themeBtn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
};

const autoSetTheme = () => {
  const isNight = new Date().getHours() >= 19 || new Date().getHours() < 6;
  setTheme(isNight);
  return isNight;
};

// ===================== CHAT MANAGEMENT =====================
const createMessageElement = (role, text) => {
  const container = document.createElement("div");
  container.className = `message ${role}`;

  const content = document.createElement("div");
  content.className = "message-text";

  splitIntoPassages(formatText(text)).forEach((passage) => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = passage;
    content.appendChild(paragraph);
  });

  const timestamp = document.createElement("span");
  timestamp.className = "timestamp";
  timestamp.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  container.append(content, timestamp);
  return container;
};

const addMessage = (role, text) => {
  chatBox.appendChild(createMessageElement(role, text));
  chatBox.scrollTop = chatBox.scrollHeight;
};

const clearChat = () => {
  chatBox.innerHTML = "";
  addMessage("bot", greetings[Math.floor(Math.random() * greetings.length)]);
};

// ===================== API COMMUNICATION =====================
const sendToDeepSeek = (message) => {
  addMessage("user", message);
  userInput.value = "";

  const botMessageElement = createMessageElement("bot", "");
  chatBox.appendChild(botMessageElement);
  chatBox.scrollTop = chatBox.scrollHeight;

  const contentDiv = botMessageElement.querySelector(".message-text");
  let buffer = "";

  apiClient.streamRequest(
    {
      model: "deepseek-v3",
      messages: [{ role: "user", content: message }],
    },
    (chunk) => {
      buffer += chunk;
      contentDiv.innerHTML = `<p>${formatText(buffer)}</p>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    },
    () => {
      contentDiv.innerHTML = splitIntoPassages(formatText(buffer))
        .map((p) => `<p>${p}</p>`)
        .join("");
    },
    (error) => {
      console.error("Stream error:", error);
      contentDiv.innerHTML =
        "<p>⚠️ Service unavailable. Please try again later.</p>";
    }
  );
};

// ===================== EVENT HANDLERS =====================
const handleSend = () => {
  const message = userInput.value.trim();
  message && sendToDeepSeek(message);
};

const toggleTheme = () => {
  setTheme(!document.body.classList.contains("dark-theme"));
};

// ===================== INITIALIZATION =====================
const initializeApp = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  savedTheme ? setTheme(savedTheme === "dark") : autoSetTheme();
  !savedTheme && setInterval(autoSetTheme, 60000);
  setTimeout(clearChat, 500);
};

// ===================== EVENT LISTENERS =====================
sendBtn.addEventListener("click", handleSend);
deleteBtn.addEventListener("click", clearChat);
themeBtn.addEventListener("click", toggleTheme);
userInput.addEventListener(
  "keypress",
  (e) => e.key === "Enter" && handleSend()
);
window.addEventListener("load", initializeApp);
