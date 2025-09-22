"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./ErrorBoundary";
import NexusHeader from "../nexus/components/NexusHeader";
import NexusSidebar from "../nexus/components/NexusSidebar";
import AccessCodeModal from "../nexus/components/AccessCodeModal";

export default function NexusDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a Nexus route (exclude nexuslogin)
  const isNexus = pathname?.startsWith("/nexus") && pathname !== "/nexuslogin";

  // Check authentication status
  useEffect(() => {
    if (isNexus) {
      const checkAuth = async () => {
        try {
          const response = await fetch("/api/nexus/auth/session");
          const data = await response.json();
          setIsAuthenticated(data.authenticated);
        } catch (error) {
          console.error("Auth check failed:", error);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    } else {
      // Not a nexus route, skip authentication
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  }, [isNexus]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // If not a nexus route, don't render anything (let GameLayout handle it)
  if (!isNexus) {
    return null;
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center"
        style={{ backgroundColor: "#f5f5f5", color: "#333333" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show access code modal if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <div
          className="h-screen w-full"
          style={{ backgroundColor: "#f5f5f5", color: "#333333" }}
        >
          <AccessCodeModal onAuthenticated={handleAuthenticated} />
        </div>
      </ErrorBoundary>
    );
  }

  // Show normal nexus layout if authenticated
  return (
    <ErrorBoundary>
      <div
        className="h-screen w-full nexus-page"
        style={{ backgroundColor: "#f5f5f5", color: "#333333" }}
      >
        <Toaster
          position="top-right"
          containerClassName="nexus-toast-container"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#ffffff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: "16px 20px",
              fontSize: "14px",
              fontWeight: "500",
            },
            success: {
              style: {
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
              },
              iconTheme: {
                primary: "#22c55e",
                secondary: "#ffffff",
              },
            },
            error: {
              style: {
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
              },
              iconTheme: {
                primary: "#ef4444",
                secondary: "#ffffff",
              },
            },
            loading: {
              style: {
                background: "#eff6ff",
                color: "#1e40af",
                border: "1px solid #bfdbfe",
              },
              iconTheme: {
                primary: "#3b82f6",
                secondary: "#ffffff",
              },
            },
          }}
        />
        <NexusHeader />
        <NexusSidebar />
        <div className="pt-16 md:pl-16 pb-16 md:pb-0">{children}</div>
      </div>
    </ErrorBoundary>
  );
}
