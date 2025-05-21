import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function App() {
  const [entry, setEntry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [insightLevel, setInsightLevel] = useState(5);
  const [topic, setTopic] = useState("life");
  const [mood, setMood] = useState(5);
  const [stressful, setStressful] = useState(false);
  const [motivated, setMotivated] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("journalSessions");
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("journalSessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const getTodayDate = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTimestamp = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const getMoodData = (value) => {
    const map = {
      1: { color: "blue", label: "😢 Sad" },
      2: { color: "red", label: "😡 Angry" },
      3: { color: "green", label: "😰 Anxious" },
      4: { color: "yellow", label: "🙂 Neutral" },
      5: { color: "yellow", label: "🙂 Okay" },
      6: { color: "yellow", label: "😊 Content" },
      7: { color: "yellow", label: "😄 Good" },
      8: { color: "yellow", label: "😁 Great" },
      9: { color: "green", label: "😎 Happy" },
      10: { color: "green", label: "🤩 Amazing" },
    };
    return map[value] || { color: "gray", label: "Unspecified" };
  };

  const handleSubmit = async () => {
    if (!entry.trim()) return;
    setIsLoading(true);

    const userEntry = entry.trim();
    const today = getTodayDate();

    const moodText = getMoodData(mood).label;
    const contextText = `The user’s mood was ${mood}/10 (${moodText}), and they said it was${
      stressful ? " a stressful day" : " not a stressful day"
    } and${motivated ? " they felt motivated." : " they did not feel motivated."}`;

    const prompt = `${contextText}\nThey wrote: ${userEntry}\nGive insight or a blindspot they might not see.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a warm, reflective journaling companion." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await res.json();
    const aiReply = data.choices?.[0]?.message?.content || "No insight available.";

    const newMessage = {
      timestamp: formatTimestamp(),
      user: userEntry,
      ai: aiReply,
      topic,
      mood,
      stressful,
      motivated,
    };

    const updatedSessions = [...sessions];
    const existingSession = updatedSessions.find((s) => s.date === today);

    if (existingSession) {
      existingSession.entries.unshift(newMessage);
    } else {
      updatedSessions.unshift({
        id: Date.now(),
        date: today,
        entries: [newMessage],
      });
    }

    setSessions(updatedSessions);
    setEntry("");
    setIsLoading(false);
  };

  const moodData = getMoodData(mood);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 lg:px-10 max-w-2xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center">Reflect</h1>

      <div className="text-right mb-6">
        <button
          onClick={() => navigate("/library")}
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          📚 View Library
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-gray-300 rounded p-2"
        >
          <option value="life">Life</option>
          <option value="work">Work</option>
          <option value="school">School</option>
          <option value="relationships">Relationships</option>
          <option value="goals">Goals</option>
          <option value="emotions">Emotions</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Insight Level: {insightLevel}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          value={insightLevel}
          onChange={(e) => setInsightLevel(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          0 = Silent | 5 = Gentle | 10 = Deep Insight
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
        <input
          type="range"
          min="1"
          max="10"
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className={`w-full accent-${moodData.color}-500`}
        />
        <p className={`text-sm mt-1 text-${moodData.color}-600`}>{moodData.label}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={stressful}
            onChange={() => setStressful(!stressful)}
            className="mr-2"
          />
          Stressful day?
        </label>
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={motivated}
            onChange={() => setMotivated(!motivated)}
            className="mr-2"
          />
          Felt motivated?
        </label>
      </div>

      <textarea
        className="w-full h-32 p-3 border border-gray-300 rounded mb-6"
        placeholder="Write your thoughts here..."
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
      />

      <button
        className={`w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Thinking..." : "Add Entry & Get Reflection"}
      </button>
    </div>
  );
}

export default App;
