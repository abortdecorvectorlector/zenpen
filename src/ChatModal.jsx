import { useState, useEffect } from "react";

export default function ChatModal({ entry, onClose }) {
  const localKey = `chatHistory-${entry.timestamp}`;
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(localKey);
    return saved
      ? JSON.parse(saved)
      : [
          {
            role: "system",
            content: `You are a reflective AI assistant helping the user explore their journal entry deeper. Their original entry was: "${entry.user}". Your previous insight was: "${entry.ai}".`,
          },
        ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(localKey, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const updated = [...messages, { role: "user", content: input.trim() }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: updated,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";

    setMessages([...updated, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-600 hover:text-black text-xl"
        >
          &times;
        </button>
        <h2 className="text-lg font-bold mb-2">🗣 Deeper Reflection</h2>
        <div className="text-sm mb-4 p-3 bg-gray-50 border rounded">
          <p><strong>Entry:</strong> {entry.user}</p>
          <p className="mt-2 italic text-gray-700">
            <strong>Insight:</strong> {entry.ai}</p>
        </div>
        <div className="space-y-3 mb-4">
          {messages
            .filter((m) => m.role !== "system")
            .map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-sm ${
                  m.role === "user"
                    ? "bg-blue-100 text-blue-900 self-end"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <strong>{m.role === "user" ? "You" : "AI"}:</strong> {m.content}
              </div>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow p-2 border rounded"
            placeholder="Ask a follow-up..."
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}