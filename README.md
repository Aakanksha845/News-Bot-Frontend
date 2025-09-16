# News-Bot-Frontend

React + Vite + SCSS chat UI for a RAG-powered news bot.

## Requirements

- Node 18+

## Setup

1. Install deps:

```bash
npm install
```

2. Configure env (optional if using vite proxy defaults):

Create `.env`:

```bash
VITE_API_BASE=http://localhost:8000
VITE_CHAT_ROUTE=/api/chat
```

3. Run dev server:

```bash
npm run dev
```

## Backend contract

The frontend expects these endpoints (all relative to `VITE_CHAT_ROUTE`):

- `GET /:sessionId` → `{ history: Array<{ role: 'user'|'bot', message: string }> }`
- `POST /:sessionId` `{ message: string }` → `{ answer: string }`
- `DELETE /:sessionId` → `{ message: string }`

Session id is generated client-side and persisted in `localStorage`.

## Features

- Navbar shows previous chat title (first user message) and current session id
- Chat window shows history, input box, and Send button
- Typed-out replies when streaming is unavailable
- Reset session button clears Redis history and rotates session id

## Notes

- Adjust proxy in `vite.config.js` or use `VITE_API_BASE` to point to your backend.
- Styling lives in `src/styles` with tokens and component SCSS modules.
