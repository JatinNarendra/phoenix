"use client";

import { useEffect } from "react";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useUser } from "@/app/hooks/useUser";

export const FrontendInitializationTest = () => {
  // Only show in development and client-side
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return null;
  }

  const { instance: WebApp, isReady } = useWebApp(true);
  const user = useUser();

  useEffect(() => {
    console.log("🧪 FRONTEND TEST - WebApp State:", {
      isReady,
      hasWebApp: !!WebApp,
      hasInitData: !!WebApp?.initData,
      hasInitDataUnsafe: !!WebApp?.initDataUnsafe,
      hasUser: !!WebApp?.initDataUnsafe?.user,
      userData: WebApp?.initDataUnsafe?.user,
      initData: WebApp?.initData?.substring(0, 100) + "...",
    });

    console.log("🧪 FRONTEND TEST - User State:", {
      isLoading: user.isLoading,
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      isInitialized: user.isInitialized?.(),
    });
  }, [WebApp, isReady, user]);

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
        background: "rgba(255,0,0,0.8)",
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
        🧪 Frontend Test
      </div>
      <div>WebApp Ready: {isReady ? "✅" : "❌"}</div>
      <div>Has WebApp: {WebApp ? "✅" : "❌"}</div>
      <div>Has User Data: {WebApp?.initDataUnsafe?.user ? "✅" : "❌"}</div>
      <div>User ID: {user.id || "N/A"}</div>
      <div>User Loading: {user.isLoading ? "⏳" : "✅"}</div>
      <div>Initialized: {user.isInitialized?.() ? "✅" : "❌"}</div>
    </div>
  );
};
