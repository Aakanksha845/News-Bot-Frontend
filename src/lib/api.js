const API_BASE = import.meta.env.VITE_API_BASE || "";
const CHAT_ROUTE = import.meta.env.VITE_CHAT_ROUTE || "/api/chat";

const SESSION_KEY = "chat_session_id";
const SESSIONS_LIST_KEY = "chat_sessions_meta";
const PENDING_CHAT_ID = "__pending__";

function readSessionsList() {
  try {
    const raw = localStorage.getItem(SESSIONS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSessionsList(list) {
  localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(list));
}

function getOrCreateSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sid);
    const list = readSessionsList();
    list.unshift({ id: sid, title: "New Chat", updatedAt: Date.now() });
    writeSessionsList(list);
  }
  return sid;
}

function setCurrentSessionId(sessionId) {
  localStorage.setItem(SESSION_KEY, sessionId);
}

function chatKeyForSession(sessionId) {
  return `chat_current_chat_id_${sessionId}`;
}

function getSelectedChatIdInternal() {
  const sid = getOrCreateSessionId();
  return localStorage.getItem(chatKeyForSession(sid));
}

function setSelectedChatIdInternal(chatId) {
  const sid = getOrCreateSessionId();
  if (chatId) localStorage.setItem(chatKeyForSession(sid), chatId);
  else localStorage.removeItem(chatKeyForSession(sid));
}

async function http(method, path, body, signal) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  supportsStreaming: false,

  get sessionId() {
    return getOrCreateSessionId();
  },

  listSessions() {
    return readSessionsList();
  },

  setSession(sessionId) {
    setCurrentSessionId(sessionId);
    const list = readSessionsList();
    if (!list.find((s) => s.id === sessionId)) {
      list.unshift({ id: sessionId, title: "New Chat", updatedAt: Date.now() });
      writeSessionsList(list);
    }
    return { sessionId };
  },

  createNewSession() {
    const id =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCurrentSessionId(id);
    const list = readSessionsList();
    list.unshift({ id, title: "New Chat", updatedAt: Date.now() });
    writeSessionsList(list);
    setSelectedChatIdInternal(null);
    return { sessionId: id };
  },

  upsertSessionTitle(sessionId, title) {
    const list = readSessionsList();
    const idx = list.findIndex((s) => s.id === sessionId);
    const safeTitle = title?.trim() || "New Chat";
    if (idx >= 0) {
      list[idx] = { ...list[idx], title: safeTitle, updatedAt: Date.now() };
    } else {
      list.unshift({ id: sessionId, title: safeTitle, updatedAt: Date.now() });
    }
    writeSessionsList(list);
  },

  getSelectedChatId() {
    return getSelectedChatIdInternal();
  },
  setSelectedChatId(chatId) {
    setSelectedChatIdInternal(chatId);
  },
  markPendingNewChat() {
    setSelectedChatIdInternal(PENDING_CHAT_ID);
  },

  async fetchSession() {
    const sessionId = getOrCreateSessionId();
    return http("GET", `${CHAT_ROUTE}/${encodeURIComponent(sessionId)}`);
  },

  async listChats() {
    const sessionId = getOrCreateSessionId();
    const data = await http(
      "GET",
      `${CHAT_ROUTE}/${encodeURIComponent(sessionId)}/chats`
    ); // { chats: [...] }
    return data?.chats || [];
  },

  async createChat(title) {
    const sessionId = getOrCreateSessionId();
    const data = await http(
      "POST",
      `${CHAT_ROUTE}/${encodeURIComponent(sessionId)}/chats`,
      title ? { title } : undefined
    );
    const { chatId } = data || {};
    if (chatId) setSelectedChatIdInternal(chatId);
    return data;
  },

  async deleteChat(chatId) {
    const sessionId = getOrCreateSessionId();
    await http(
      "DELETE",
      `${CHAT_ROUTE}/${encodeURIComponent(
        sessionId
      )}/chats/${encodeURIComponent(chatId)}`
    );
    const current = getSelectedChatIdInternal();
    if (current === chatId) setSelectedChatIdInternal(null);
  },

  async getSession() {
    const sessionId = getOrCreateSessionId();
    try {
      const { session } = await this.fetchSession();
      const chats = session?.chats || [];
      const selectedId = getSelectedChatIdInternal();
      if (selectedId === PENDING_CHAT_ID)
        return { sessionId, previousTitle: "New Chat" };
      let title = null;
      if (selectedId) {
        const matchIdx = chats.findIndex((c) => c.chatId === selectedId);
        if (matchIdx >= 0)
          title = chats[matchIdx]?.title || `Chat ${matchIdx + 1}`;
      }
      if (!title && chats.length > 0) title = chats[0]?.title || `Chat 1`;
      if (title) return { sessionId, previousTitle: title };
    } catch {}

    const list = readSessionsList();
    const meta = list.find((s) => s.id === sessionId);
    if (meta?.title && meta.title !== "New Chat") {
      return { sessionId, previousTitle: meta.title };
    }
    const { history } = await this._safeGetHistory(sessionId);
    const firstUser = history.find((m) => m.role === "user");
    const previousTitle = firstUser?.message?.slice(0, 40) || null;
    if (previousTitle) this.upsertSessionTitle(sessionId, previousTitle);
    return { sessionId, previousTitle };
  },

  async getHistory() {
    const sessionId = getOrCreateSessionId();
    const selectedChatId = getSelectedChatIdInternal();
    if (selectedChatId === PENDING_CHAT_ID) return [];
    if (selectedChatId) {
      const data = await http(
        "GET",
        `${CHAT_ROUTE}/${encodeURIComponent(
          sessionId
        )}/chats/${encodeURIComponent(selectedChatId)}`
      );
      const messages = data?.messages || [];
      return messages.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.message,
      }));
    }
    const sess = await this.fetchSession();
    const chats = sess?.session?.chats || [];
    const defaultChat = chats.find((c) => c.chatId === "default") || chats[0];
    const messages = defaultChat?.messages || [];
    return messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.message,
    }));
  },

  async sendMessage(message) {
    const sessionId = getOrCreateSessionId();
    const selectedChatId = getSelectedChatIdInternal();
    if (!selectedChatId || selectedChatId === PENDING_CHAT_ID) {
      const title = message.slice(0, 40);
      const created = await this.createChat(title);
      const newId = created?.chatId;
      if (newId) setSelectedChatIdInternal(newId);
      const data = await http(
        "POST",
        `${CHAT_ROUTE}/${encodeURIComponent(
          sessionId
        )}/chats/${encodeURIComponent(newId)}`,
        { message }
      );
      return data.answer;
    }
    const data = await http(
      "POST",
      `${CHAT_ROUTE}/${encodeURIComponent(
        sessionId
      )}/chats/${encodeURIComponent(selectedChatId)}`,
      { message }
    ); // { answer }
    return data.answer;
  },

  async streamMessage(message, signal) {
    const final = await this.sendMessage(message);
    let chunkHandler = () => {};
    return {
      stream: null,
      onChunk: (cb) => {
        chunkHandler = cb;
      },
      onDone: async () => final,
    };
  },

  async resetSession() {
    const oldId = getOrCreateSessionId();
    try {
      localStorage.removeItem(chatKeyForSession(oldId));
    } catch {}
    try {
      await http("DELETE", `${CHAT_ROUTE}/${encodeURIComponent(oldId)}`);
    } catch (e) {
      // show the error message to the user - future enhancements
    }
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    const newId = getOrCreateSessionId();
    try {
      window.dispatchEvent(
        new CustomEvent("session:reset", {
          detail: { sessionId: newId, previousSessionId: oldId },
        })
      );
    } catch {}
    return { sessionId: newId, previousTitle: null };
  },

  async _safeGetHistory(sessionId) {
    try {
      return await http(
        "GET",
        `${CHAT_ROUTE}/${encodeURIComponent(sessionId)}`
      );
    } catch {
      return { history: [] };
    }
  },
};
