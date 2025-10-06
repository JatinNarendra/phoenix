"use client";
import React, { createContext, useContext, useCallback } from 'react';

interface LevelUpContextType {
  showLevelUpAnimation: (newLevel: number, onComplete?: () => void) => void;
}

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined);

export const useLevelUp = () => {
  const context = useContext(LevelUpContext);
  
  // Check if we're on a Nexus route and handle gracefully
  if (!context) {
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/nexus') || window.location.pathname === '/nexuslogin')) {
      console.warn("useLevelUp called on Nexus route without LevelUpProvider, returning null context");
      // Return a safe default context for Nexus routes
      return {
        showLevelUpAnimation: () => {},
      };
    }
    throw new Error('useLevelUp must be used within a LevelUpProvider');
  }
  return context;
};

export const LevelUpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simplified showLevelUpAnimation that just calls the callback immediately
  const showLevelUpAnimation = useCallback((newLevel: number, onComplete?: () => void) => {
    console.log('LevelUpContext: Level up to level', newLevel, '(animation removed)');
    // Call the onComplete callback immediately if provided
    if (onComplete) {
      onComplete();
    }
  }, []);

  return (
    <LevelUpContext.Provider value={{ showLevelUpAnimation }}>
      {children}
    </LevelUpContext.Provider>
  );
}; 