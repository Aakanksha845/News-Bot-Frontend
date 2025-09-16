import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const controllerRef = useRef(null);

  const loadHistory = async () => {
    try {
      const history = await api.getHistory();
      setMessages(history);
    } catch (e) {
      setMessages([]);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const history = await api.getHistory();
        if (!ignore) setMessages(history);
      } catch (e) {
        if (!ignore) setMessages([]);
      }
    })();

    const onReset = (e) => {
      setStreamingText("");
      setMessages([]);
      loadHistory();
    };
    window.addEventListener("session:reset", onReset);

    return () => {
      ignore = true;
      window.removeEventListener("session:reset", onReset);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const typeOut = async (fullText) => {
    setStreamingText("");
    const step = Math.max(1, Math.ceil(fullText.length / 80));
    for (let i = 0; i < fullText.length; i += step) {
      setStreamingText(fullText.slice(0, i + step));
      await new Promise((r) => setTimeout(r, 16));
    }
    setStreamingText(fullText);
  };

  const sendMessage = async (text) => {
    setIsSending(true);
    setStreamingText("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      if (api.supportsStreaming) {
        controllerRef.current = new AbortController();
        const { stream, onChunk, onDone } = await api.streamMessage(
          text,
          controllerRef.current.signal
        );
        let acc = "";
        onChunk((chunk) => {
          acc += chunk;
          setStreamingText(acc);
        });
        const final = await onDone();
        setStreamingText("");
        setMessages((prev) => [...prev, { role: "assistant", content: final }]);
        return;
      }
      const reply = await api.sendMessage(text);
      await typeOut(reply);
      setStreamingText("");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("Send failed", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return { messages, sendMessage, isSending, streamingText };
}
