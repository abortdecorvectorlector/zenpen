import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChatModal from "./ChatModal";

function Library() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [summaries, setSummaries] = useState(() => {
    const saved = localStorage.getItem("journalSummaries");
    return saved ? JSON.parse(saved) : {};
  });
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [activeChatEntry, setActiveChatEntry] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("journalSessions");
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("journalSummaries", JSON.stringify(summaries));
  }, [summaries]);

  const clearAll = () => {
    if (confirm("Clear all journal entries?")) {
      setSessions([]);
      setSummaries({});
      localStorage.removeItem("journalSessions");
      localStorage.removeItem("journalSummaries");
    }
  };

  const getTagColor = (topic) => {
    switch (topic) {
      case "work": return "bg-blue-100 text-blue-700";
      case "life": return "bg-green-100 text-green-700";
      case "school": return "bg-yellow-100 text-yellow-700";
      case "relationships": return "bg-pink-100 text-pink-700";
      case "goals": return "bg-purple-100 text-purple-700";
      case "emotions": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const matchesSearch = (entry) => {
    const term = searchTerm.toLowerCase();
    return (
      entry.user.toLowerCase().includes(term) ||
      entry.ai.toLowerCase().includes(term)
    );
  };

  const filteredSessions = sessions.map(session => {
    const filteredEntries = searchTerm
      ? session.entries.filter(matchesSearch)
      : session.entries;

    return {
      ...session,
      entries: filteredEntries,
    };
  }).filter(session => session.entries.length > 0);

  const groupEntriesByTopic = (entries) => {
    const grouped = {};
    entries.forEach(entry => {
      if (!grouped[entry.topic]) grouped[entry.topic] = [];
      grouped[entry.topic].push(entry);
    });
    return grouped;
  };

  const generateSummary = async (session) => {
    setLoadingSummaryId(session.id);
    const combinedText = session.entries.map(e => `User: ${e.user}\nAI: ${e.ai}`).join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}```,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant who reviews a person's daily journal entries. Summarize key themes, emotional tone, and areas for growth."
          },
          { role: "user", content: combinedText }
        ]
      })
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "No summary generated.";
    const updatedSummaries = { ...summaries, [session.id]: summary };
    setSummaries(updatedSummaries);
    setLoadingSummaryId(null);
  };

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 lg:px-10 max-w-2xl mx-auto text-sm">
      <h1 className="text-2xl font-bold mb-6 text-center">📚 Your Journal Library</h1>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <Link to="/" className="text-blue-600 underline hover:text-blue-800 text-sm">
          ← Back to Journal
        </Link>
        <button
          onClick={clearAll}
          className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
        >
          🗑️ Clear All Entries
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {filteredSessions.length === 0 && (
        <p className="text-center text-gray-500">No entries found.</p>
      )}

      <div className="space-y-10">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="p-4 bg-white border border-gray-200 rounded shadow-sm"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg font-semibold">{session.date}</h2>
              <button
                onClick={() => generateSummary(session)}
                disabled={loadingSummaryId === session.id}
                className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200"
              >
                {loadingSummaryId === session.id ? "Summarizing..." : "🧠 Generate Daily Summary"}
              </button>
            </div>

            {summaries[session.id] && (
              <div className="mb-4 p-4 border border-indigo-200 bg-indigo-50 text-sm rounded">
                <strong>🧠 Daily Reflection:</strong>
                <p className="mt-1 whitespace-pre-wrap">{summaries[session.id]}</p>
              </div>
            )}

            {Object.entries(groupEntriesByTopic(session.entries)).map(([topic, entries]) => (
              <div key={topic} className="mb-6">
                <h3 className={`text-sm font-semibold mb-2 px-2 py-1 inline-block rounded ${getTagColor(topic)}`}>
                  {topic.toUpperCase()}
                </h3>
                <div className="space-y-4">
                  {entries.map((msg, idx) => (
                    <div key={idx} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">🕒 {msg.timestamp}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getTagColor(msg.topic)}`}>
                          {msg.topic}
                        </span>
                      </div>
                      <p className="mb-2">
                        <strong>📝 You:</strong> {msg.user}
                      </p>
                      <p className="italic text-gray-700">
                        <strong>🔍 Insight:</strong> {msg.ai}
                      </p>
                      <button
                        onClick={() => setActiveChatEntry(msg)}
                        className="text-sm text-blue-600 underline mt-1 hover:text-blue-800"
                      >
                        🗣 Deeper Reflection
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {activeChatEntry && (
        <ChatModal entry={activeChatEntry} onClose={() => setActiveChatEntry(null)} />
      )}
    </div>
  );
}

export default Library;