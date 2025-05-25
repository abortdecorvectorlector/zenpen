// src/App.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function App() {
  const [entry, setEntry] = useState("");
  const [messages, setMessages] = useState([]);
  const [importance, setImportance] = useState(3);
  const [insightLevel, setInsightLevel] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
    else localStorage.setItem("theme", "light");
  }, []);

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load journal sessions
  useEffect(() => {
    const saved = localStorage.getItem("journalSessions");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Persist sessions on change
  useEffect(() => {
    localStorage.setItem("journalSessions", JSON.stringify(messages));
  }, [messages]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const handleSubmit = async () => {
    if (!entry.trim()) return;
    setIsLoading(true);

    const timestamp = new Date().toLocaleString();
    const sessionId = new Date().toISOString().split("T")[0];

    // Build or append to today’s session
    const updated = [
      ...messages.filter((s) => s.id !== sessionId),
      {
        id: sessionId,
        entries: [
          ...(messages.find((s) => s.id === sessionId)?.entries || []),
          { timestamp, user: entry, ai: "", importance, insightLevel },
        ],
      },
    ];

    setMessages(updated);
    setEntry("");

    // Prompt the AI, factoring in star-rating and insight level
    const tone =
      insightLevel === 1 ? "gentle" : insightLevel === 2 ? "balanced" : "deep";
    const systemPrompt = `You are a journaling assistant. In a ${tone} tone, summarize the top ${importance}★ entries in 2–3 concise bullet points.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: entry },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const aiReply = data.choices?.[0]?.message?.content || "No response.";

    // Attach AI reply to the last entry
    setMessages((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              entries: s.entries.map((e, i) =>
                i === s.entries.length - 1 ? { ...e, ai: aiReply } : e
              ),
            }
          : s
      )
    );

    setIsLoading(false);
  };

  const insightLabel = {
    1: "🌱 Gentle",
    2: "🔍 Balanced",
    3: "🧠 Deep Insight",
  };

  return (
    <div className="min-h-screen w-screen flex justify-center items-start bg-white dark:bg-gray-900">
      <div className="w-full max-w-lg px-4 sm:px-6 md:px-8 py-6">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            📝 AI Journal
          </h1>
          <button onClick={toggleTheme} className="p-2 rounded">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </header>

        <textarea
          className="w-full h-32 p-3 border border-gray-300 dark:border-gray-700 rounded mb-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="What's on your mind?"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
        />

        <div className="mb-4 text-sm">
          <label className="font-semibold mr-2 text-gray-900 dark:text-gray-100">
            Importance:
          </label>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setImportance(star)}
              className={`text-xl focus:outline-none transition ${
                star <= importance
                  ? "text-yellow-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm">
          <label className="font-semibold block mb-1 text-gray-900 dark:text-gray-100">
            Insight Level: {insightLabel[insightLevel]}
          </label>
          <input
            type="range"
            min="1"
            max="3"
            value={insightLevel}
            onChange={(e) => setInsightLevel(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full px-4 py-2 rounded text-white font-semibold transition ${
            isLoading
              ? "opacity-60 cursor-wait animate-pulse bg-purple-500"
              : "bg-purple-400 hover:bg-purple-500"
          }`}
        >
          {isLoading ? "💬 Thinking..." : "💭 Submit Thought"}
        </button>

        <Link
          to="/library"
          className="block mt-4 text-center text-sm underline text-gray-900 dark:text-gray-100 hover:text-purple-400"
        >
          📚 View Library
        </Link>
      </div>
    </div>
  );
}

export default App;