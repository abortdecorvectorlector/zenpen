import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ChatModal from "./ChatModal";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

function Library() {
  const [sessions, setSessions] = useState([]);
  const [summaries, setSummaries] = useState(() => {
    const saved = localStorage.getItem("journalSummaries");
    return saved ? JSON.parse(saved) : {};
  });
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [activeChatEntry, setActiveChatEntry] = useState(null);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  // Load sessions
  useEffect(() => {
    const saved = localStorage.getItem("journalSessions");
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  // Persist summaries
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

  // Map sessions by date
  const sessionsMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => map[s.id] = s);
    return map;
  }, [sessions]);

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Filter by selectedDate or show all
  const filteredSessions = useMemo(() => {
    if (selectedDate) {
      const s = sessionsMap[selectedDate];
      return s ? [s] : [];
    }
    return sessions;
  }, [sessions, selectedDate, sessionsMap]);

  const generateSummary = async (session) => {
    setLoadingSummaryId(session.id);
    const combined = session.entries
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(e => `★${e.importance} ${e.user}`)
      .join("\n");

    if (!combined) {
      alert("No entries to summarize.");
      setLoadingSummaryId(null);
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: `Summarize these entries for ${session.id} in 2-3 concise bullet points:` },
            { role: "user", content: combined }
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content;
      if (summary) setSummaries(prev => ({ ...prev, [session.id]: summary }));
      else throw new Error("Empty summary");
    } catch {
      alert("Error generating summary.");
    } finally {
      setLoadingSummaryId(null);
    }
  };

  return (
    <div className="min-h-screen w-screen flex justify-center items-start bg-white dark:bg-gray-900">
      <div className="w-full max-w-2xl px-4 sm:px-6 md:px-8 py-6">
        <header className="flex justify-between items-center mb-6 text-gray-900 dark:text-gray-100">
          <Link to="/" className="underline hover:text-purple-400">← Back</Link>
          <button onClick={clearAll} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm">
            🗑 Clear All
          </button>
        </header>

        {/* Calendar View */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-2 text-gray-900 dark:text-gray-100">
            <button onClick={prevMonth} className="text-xl">←</button>
            <h2 className="text-lg font-semibold">{months[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="text-xl">→</button>
          </div>
          <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {weekdays.map(w => (<div key={w}>{w}</div>))}
          </div>
          <div className="grid grid-cols-7 text-center mt-2 gap-1">
            {calendarCells.map((day, idx) => {
              const dateStr = day
                ? `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                : null;
              const session = dateStr && sessionsMap[dateStr];
              const avgImp = session ?
                Math.round(session.entries.reduce((sum,e) => sum+e.importance,0)/session.entries.length)
                : 0;

              return (
                <div key={idx}
                  onClick={() => day && setSelectedDate(dateStr)}
                  className={`relative h-12 flex flex-col justify-center items-center text-sm p-1 rounded cursor-pointer
                    ${day?'border border-gray-200 dark:border-gray-700':''}
                    ${session?'bg-purple-50 dark:bg-purple-800':''}
                    hover:bg-gray-100 dark:hover:bg-gray-800`
                >
                  {day}
                  {session && (
                    <span className="absolute bottom-1 text-xs text-purple-600 dark:text-purple-300">{avgImp}★</span>
                  )}
                </div>
              );
            })}
          </div>
          {selectedDate && (
            <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">
              <button onClick={() => setSelectedDate(null)} className="underline">Show all entries</button>
            </div>
          )}
        </section>

        {/* Sessions / Summaries */}
        <div className="space-y-8">
          {filteredSessions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">No entries found.</p>
          ) : (
            filteredSessions.map(session => (
              <article key={session.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{session.id}</h3>
                  <button
                    onClick={() => generateSummary(session)}
                    disabled={loadingSummaryId===session.id}
                    className={`text-sm px-3 py-1 rounded border transition
                      ${loadingSummaryId===session.id ? 'bg-gray-300 text-gray-600 cursor-wait' : 'bg-purple-400 text-white hover:bg-purple-500'}`
                  >
                    {loadingSummaryId===session.id ? 'Summarizing…' : '🧠 Generate Summary'}
                  </button>
                </div>
                {summaries[session.id] && (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                    <strong>🧠 Daily Reflection:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{summaries[session.id]}</p>
                  </div>
                )}
                {session.entries.map((e,i) => (
                  <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">🕒 {e.timestamp}</span>
                      <span className="text-yellow-400">{'★'.repeat(e.importance)}{'☆'.repeat(5-e.importance)}</span>
                    </div>
                    <p><strong>📝 You:</strong> {e.user}</p>
                    <p className="italic text-gray-600 dark:text-gray-400"><strong>🔍 Insight:</strong> {e.ai}</p>
                    <button
                      onClick={() => setActiveChatEntry(e)}
                      className="text-sm underline hover:text-purple-400 mt-1"
                    >
                      🗣 Continue Chat
                    </button>
                  </div>
                ))}
              </article>
            ))
          )}
        </div>

        {activeChatEntry && (
          <ChatModal entry={activeChatEntry} onClose={() => setActiveChatEntry(null)} />
        )}
      </div>
    </div>
  );
}

export default Library;
