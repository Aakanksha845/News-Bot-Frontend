import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat.js";
import "../styles/components/chat-window.scss";

export default function ChatWindow() {
  const { messages, sendMessage, isSending, streamingText } = useChat();
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    await sendMessage(text);
  };

  return (
    <div className="chat">
      <div className="chat__messages" ref={listRef}>
        {messages.map((m, idx) => (
          <div key={idx} className={`chat__message chat__message--${m.role}`}>
            <div className="chat__bubble">{m.content}</div>
          </div>
        ))}
        {isSending ? <div>Waiting for the reponse</div> : null}
        {streamingText && (
          <div className="chat__message chat__message--assistant">
            <div className="chat__bubble chat__bubble--streaming">
              {streamingText}
            </div>
          </div>
        )}
      </div>
      <form className="chat__input" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Ask about the news…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !input.trim()}>
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
