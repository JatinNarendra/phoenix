'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function ViewportManager() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isNexus = pathname?.startsWith('/nexus');

  // Skip viewport height manipulation for Nexus routes
  const shouldManageViewport = !isNexus;

  const setViewportHeight = useCallback(() => {
    if (!mounted || !shouldManageViewport) return;

    try {
      // Use RAF to batch DOM reads and writes
      let vh = 0;
      requestAnimationFrame(() => {
        // Read
        vh = window.innerHeight;
        
        requestAnimationFrame(() => {
          // Write
          document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
          document.documentElement.style.setProperty('--tg-viewport-stable-height', `${vh}px`);
        });
      });
    } catch (error) {
      console.error('ViewportManager: Error setting viewport height', error);
    }
  }, [mounted, shouldManageViewport]);

  // Set mounted state after hydration is complete
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use timeout to ensure this happens after hydration
      const timer = setTimeout(() => {
        setMounted(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !shouldManageViewport) return;
    
    console.log('ViewportManager: Initializing viewport management');

    // Initial set
    setViewportHeight();

    // Debounce resize events
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setViewportHeight, 100);
    };

    // Use passive event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [mounted, setViewportHeight, shouldManageViewport]);

  return null;
} 