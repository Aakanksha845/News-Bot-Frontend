import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function useChatSession() {
  const [sessionId, setSessionId] = useState(null);
  const [previousTitle, setPreviousTitle] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await api.getSession();
        if (!ignore) {
          setSessionId(data.sessionId);
          setPreviousTitle(data.previousTitle || null);
        }
      } catch (e) {
        console.error("Failed to fetch session", e);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const resetSession = async () => {
    setIsResetting(true);
    try {
      const data = await api.resetSession();
      setSessionId(data.sessionId);
      setPreviousTitle(data.previousTitle || null);
    } catch (e) {
      console.error("Failed to reset session", e);
    } finally {
      setIsResetting(false);
    }
  };

  return { sessionId, previousTitle, resetSession, isResetting };
}
