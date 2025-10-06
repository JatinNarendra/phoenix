"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/hooks/useUser";
import { useWebApp } from "@/app/hooks/useWebApp";

export const UserInitializationDebugger = () => {
  const { instance: WebApp, isReady } = useWebApp();
  const user = useUser();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-9), `[${timestamp}] ${message}`]);
    };

    // Monitor WebApp state
    addLog(`WebApp Ready: ${isReady}`);
    addLog(`WebApp Available: ${!!WebApp}`);
    addLog(`Has InitData: ${!!WebApp?.initData}`);
    addLog(`Has InitDataUnsafe: ${!!WebApp?.initDataUnsafe}`);
    addLog(`Has User: ${!!WebApp?.initDataUnsafe?.user}`);

    if (WebApp?.initDataUnsafe?.user) {
      addLog(`User ID: ${WebApp.initDataUnsafe.user.id}`);
      addLog(`Username: ${WebApp.initDataUnsafe.user.username || "N/A"}`);
      addLog(`First Name: ${WebApp.initDataUnsafe.user.first_name}`);
    }

    // Monitor user state
    addLog(`User Loading: ${user.isLoading}`);
    addLog(`User ID: ${user.id}`);
    addLog(`User Initialized: ${user.isInitialized?.() || false}`);
  }, [WebApp, isReady, user]);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
        🔍 User Init Debug
      </div>
      {logs.map((log, index) => (
        <div key={index} style={{ marginBottom: "2px" }}>
          {log}
        </div>
      ))}
    </div>
  );
};
