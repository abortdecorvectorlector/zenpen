import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function App() {
  const [entry, setEntry] = useState("");
  const [messages, setMessages] = useState([]);
  const [importance, setImportance] = useState(3); // default 3/5
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("journalSessions");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("journalSessions", JSON.stringify(messages));
  }, [messages]);

  const handleSubmit = async () => {
    if (!entry.trim()) return;

    const timestamp = new Date().toLocaleString();
    const sessionId = new Date().toISOString().split("T")[0];

    const updated = [
      ...(messages || []),
      {
        id: sessionId,
        entries: [
          ...(messages.find((s) => s.id === sessionId)?.entries || []),
          {
            timestamp,
            user: entry,
            ai: "",
            importance,
          },
        ],
      },
    ];

    const merged = Object.values(
      updated.reduce((acc, session) => {
        acc[session.id] = {
          id: session.id,
          entries: [...(acc[session.id]?.entries || []), ...session.entries],
        };
        return acc;
      }, {})
    );

    setMessages(merged);
    setEntry("");
    setImportance(3);
    setIsLoading(true);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a warm journaling companion. Offer helpful, kind insight.",
          },
          { role: "user", content: entry },
        ],
      }),
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "No response.";

    const updatedSessions = merged.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            entries: s.entries.map((e, i) =>
              i === s.entries.length - 1 ? { ...e, ai: aiReply } : e
            ),
          }
        : s
    );

    setMessages(updatedSessions);
    setIsLoading(false);
  };

  return (
    <div className="px-6 py-8 max-w-xl mx-auto text-dark bg-lightest min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center">📝 AI Journal</h1>

      <textarea
        className="w-full h-32 p-3 border border-gray-300 rounded mb-4"
        placeholder="What's on your mind?"
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
      />

      <div className="mb-4 text-sm text-dark">
        <label className="font-semibold mr-2">Importance:</label>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setImportance(star)}
            className={star <= importance ? "text-yellow-500" : "text-gray-300"}
          >
            ★
          </button>
        ))}
      </div>

      <button
        className={`w-full bg-dark text-white px-4 py-2 rounded hover:bg-accent ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Thinking..." : "Submit Entry"}
      </button>

      <Link
        to="/library"
        className="block mt-4 text-center text-sm underline text-dark hover:text-accent"
      >
        📚 View Library
      </Link>
    </div>
  );
}

export default App;
