"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PiSignOutBold } from "react-icons/pi";

export default function NexusHeader() {
  console.log("NexusHeader: Component rendering started");

  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  console.log("NexusHeader: Component state initialized");

  useEffect(() => {
    console.log("NexusHeader: Component mounted");
    setIsReady(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/nexus/auth/logout", { method: "POST" });
      // Redirect to /nexus to trigger authentication modal
      router.push("/nexus");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getBreadcrumbText = () => {
    try {
      if (pathname === "/nexus") return "";

      const segments = pathname.split("/").filter(Boolean);

      // Special cases for known routes
      if (segments.length >= 1) {
        if (segments[1] === "customers") return "Customers";
        if (segments[1] === "analytics") return "Analytics";
        if (segments[1] === "new") return "New Customer";

        // For customer-specific pages, just use the slug from the URL
        if (segments.length >= 2 && segments[0] === "nexus") {
          return segments[1]; // This is the slug from the URL, e.g., "sparky" from "/nexus/sparky"
        }
      }

      // Otherwise, capitalize the last segment
      const lastSegment = segments[segments.length - 1];
      return lastSegment.replace(/^\w/, (c) => c.toUpperCase());
    } catch (err) {
      console.error("Error in getBreadcrumbText:", err);
      return "Nexus";
    }
  };

  // Simple version for initial render
  if (!isReady) {
    return (
      <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 z-50">
        <div className="flex justify-between items-center h-full px-6">
          <div className="flex items-center text-sm">
            <span className="text-2xl font-bold text-gray-900">Nexus</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 z-50">
      {/* Mobile Header */}
      <div className="flex md:hidden justify-between items-center h-full px-6">
        <div className="flex items-center text-sm">
          <Link href="/nexus" className="text-2xl font-bold text-gray-900">
            Nexus
          </Link>
          {pathname !== "/nexus" && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">
                {getBreadcrumbText()}
              </span>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
          title="Logout"
        >
          <PiSignOutBold className="text-xl font-bold" />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center h-full px-6">
        <div className="flex items-center text-sm">
          <Link
            href="/nexus"
            className="text-2xl font-bold text-gray-900 hover:text-gray-700"
          >
            Nexus
          </Link>
          {pathname !== "/nexus" && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">
                {getBreadcrumbText()}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors"
            title="Logout"
          >
            <span className="text-sm font-medium">Logout</span>
            <PiSignOutBold />
          </button>
        </div>
      </div>
    </header>
  );
}
