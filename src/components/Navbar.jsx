import React from "react";
import { useChatSession } from "../hooks/useChatSession.js";
import "../styles/components/navbar.scss";

export default function Navbar({ onToggleSidebar }) {
  const { sessionId, previousTitle, resetSession, isResetting } =
    useChatSession();

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button
          className="navbar__hamburger"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="navbar__brand">Newsie</div>
      </div>
      <div className="navbar__meta">
        <button
          className="navbar__reset"
          onClick={resetSession}
          disabled={isResetting}
        >
          {isResetting ? "Resetting…" : "Reset Session"}
        </button>
      </div>
    </header>
  );
}
