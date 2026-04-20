export default function MessageBubble({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
          isUser
            ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
            : "bg-gray-800 text-gray-200 border border-gray-700"
        }`}
      >
        {text}
      </div>
    </div>
  );
}