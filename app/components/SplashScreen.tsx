"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
  isVisible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isVisible,
}) => {
  const [showSplash, setShowSplash] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isVisible) return;

    console.log("SplashScreen: Starting splash screen display");
    setShowSplash(true);

    // Ensure minimum display time of 3 seconds
    const minDisplayTime = 3000;
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);

    const timer = setTimeout(() => {
      console.log("SplashScreen: Hiding splash screen");
      setShowSplash(false);
      // Call onComplete after fade out animation completes
      setTimeout(() => {
        console.log("SplashScreen: Splash screen completed");
        onComplete();
      }, 500);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete, startTime]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Background with phoenix and chips */}
            <Image
              src="/assets/firstscreen.png"
              alt="Phoenix Game Splash Screen"
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
