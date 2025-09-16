import React from "react";
import Navbar from "./components/Navbar.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import Sidebar from "./components/Sidebar.jsx";

export default function App() {
  const [activeSessionId, setActiveSessionId] = React.useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-root">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div
        className="app-shell"
        style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}
      >
        <Sidebar
          open={isSidebarOpen}
          onSelect={(id) => {
            setActiveSessionId(id);
            closeSidebar();
          }}
          onClose={closeSidebar}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatWindow key={activeSessionId || "current"} />
        </div>
      </div>
    </div>
  );
}
