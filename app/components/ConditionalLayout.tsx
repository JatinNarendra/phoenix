"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GameLayout from "./GameLayout";
import NexusDashboard from "./NexusDashboard";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNexus, setIsNexus] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if this is a Nexus route (exclude nexuslogin)
    const nexusRoute =
      pathname?.startsWith("/nexus") && pathname !== "/nexuslogin";

    setIsNexus(nexusRoute);
    setIsReady(true);
  }, [pathname]);

  // Don't render anything until we know the route type
  if (!isReady) {
    return null;
  }

  // Render only the appropriate layout
  if (isNexus) {
    return <NexusDashboard>{children}</NexusDashboard>;
  } else {
    return <GameLayout>{children}</GameLayout>;
  }
}
