"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./ErrorBoundary";
import GameProviders from "./GameProviders";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProduction, setIsProduction] = useState(false);

  // Check if this is a Nexus route (exclude nexuslogin)
  const isNexus = pathname?.startsWith("/nexus") && pathname !== "/nexuslogin";

  // Check if we're on production URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isVercelApp = hostname.includes("vercel.app");
      const isSparkyDomain = hostname.includes("sparky-kappa.vercel.app");
      const isHTTPS = window.location.protocol === "https:";

      const productionResult =
        isSparkyDomain ||
        (isVercelApp && isHTTPS) ||
        (isHTTPS && !hostname.includes("localhost"));

      setIsProduction(productionResult);
    }
  }, []);

  // For Nexus routes, completely bypass GameLayout and let NexusDashboard handle everything
  if (isNexus) {
    return null;
  }

  // For all other routes, render full game layout
  return (
    <ErrorBoundary>
      <GameProviders>
        <Toaster
          position="top-center"
          containerClassName="game-toast-container"
          toastOptions={{
            duration: 3000,
            style: {
              background: "rgba(41, 24, 24, 0.9)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              backdropFilter: "blur(14px)",
            },
          }}
        />
        {children}
      </GameProviders>
    </ErrorBoundary>
  );
}
