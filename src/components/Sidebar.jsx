import React from "react";
import { api } from "../lib/api.js";
import "../styles/components/sidebar.scss";

export default function Sidebar({ onSelect, open = false, onClose }) {
  const [chats, setChats] = React.useState([]);
  const [currentChatId, setCurrentChatIdState] = React.useState(
    api.getSelectedChatId() || null
  );

  const refresh = async () => {
    try {
      const list = await api.listChats();
      setChats(Array.isArray(list) ? list : []);
    } catch {
      setChats([]);
    }
    setCurrentChatIdState(api.getSelectedChatId() || null);
  };

  React.useEffect(() => {
    refresh();
    const onReset = () => {
      setCurrentChatIdState(null);
      refresh();
    };
    window.addEventListener("session:reset", onReset);
    return () => window.removeEventListener("session:reset", onReset);
  }, []);

  const selectChat = async (chatId) => {
    api.setSelectedChatId(chatId);
    setCurrentChatIdState(chatId);
    onSelect?.(chatId);
  };

  const createNew = async () => {
    try {
      const data = await api.createChat();
      await refresh();
      const newId = data?.chatId || api.getSelectedChatId();
      if (newId) onSelect?.(newId);
    } catch {
      // improve further to manage the failures and show the user the corresponding error message as a banner
    }
  };

  return (
    <>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar__header">
          <div className="sidebar__title">Chats</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sidebar__new" onClick={createNew}>
              + New
            </button>
          </div>
        </div>
        <div className="sidebar__list">
          {(!chats || chats.length === 0) && (
            <div className="sidebar__empty">No previous chats</div>
          )}
          {chats.map(
            (c, idx) => (
              console.log(c, idx),
              (
                <button
                  key={c.chatId}
                  className={`sidebar__item ${
                    c.chatId === currentChatId ? "is-active" : ""
                  }`}
                  title={c.title || `Chat ${idx + 1}`}
                  onClick={() => selectChat(c.chatId)}
                >
                  <div className="sidebar__item-title">{`Chat ${idx + 1}`}</div>
                </button>
              )
            )
          )}
        </div>
      </aside>
      {open && (
        <button
          className="sidebar__backdrop"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}
