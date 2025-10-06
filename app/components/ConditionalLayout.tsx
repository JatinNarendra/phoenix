'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import GameLayout from './GameLayout';
import NexusDashboard from './NexusDashboard';

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
    const nexusRoute = pathname?.startsWith('/nexus') && pathname !== '/nexuslogin';
    
    // Debug logging
    console.log('ConditionalLayout Debug:', {
      pathname,
      nexusRoute,
      startsWithNexus: pathname?.startsWith('/nexus'),
      isNotNexusLogin: pathname !== '/nexuslogin'
    });
    
    setIsNexus(nexusRoute);
    setIsReady(true);
  }, [pathname]);

  // Don't render anything until we know the route type
  if (!isReady) {
    console.log('ConditionalLayout: Not ready yet, returning null');
    return null;
  }

  // Debug logging for render decision
  console.log('ConditionalLayout: Rendering decision:', {
    pathname,
    isNexus,
    willRender: isNexus ? 'NexusDashboard' : 'GameLayout'
  });

  // Render only the appropriate layout
  if (isNexus) {
    console.log('ConditionalLayout: Rendering NexusDashboard for', pathname);
    return <NexusDashboard>{children}</NexusDashboard>;
  } else {
    console.log('ConditionalLayout: Rendering GameLayout for', pathname);
    return <GameLayout>{children}</GameLayout>;
  }
}
