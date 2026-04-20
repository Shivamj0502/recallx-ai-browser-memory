import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  //  LOAD OLD CHATS
  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/chat-history");
        const data = await res.json();

        const formatted = data.map(msg => ({
          role: msg.role === "assistant" ? "bot" : "user",
          text: msg.text
        }));

        setMessages(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    loadChats();
  }, []);

  // AUTO SCROLL
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input,
          history: updatedMessages
        }),
      });

      const data = await res.json();

      const botMessage = { role: "bot", text: data.answer };
      setMessages(prev => [...prev, botMessage]);

    } catch (err) {
      console.error(err);
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">

      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-widest text-blue-400 drop-shadow-lg">
          RECALL<span className="text-cyan-400">X</span>
        </h1>

        <button
          onClick={() => setMessages([])}
          className="text-sm px-3 py-1 border border-gray-600 rounded hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, index) => (
          <MessageBubble key={index} role={msg.role} text={msg.text} />
        ))}

        {loading && (
          <p className="text-gray-400 animate-pulse">Thinking...</p>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-gray-800 flex gap-3 bg-black/40 backdrop-blur-md">
        <input
          className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask RecallX..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 rounded-lg font-semibold hover:scale-105 transition transform"
        >
          Send
        </button>
      </div>
    </div>
  );
}