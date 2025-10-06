"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    console.log("SplashScreen: Starting splash screen display");

    // Show splash for 3 seconds
    const timer = setTimeout(() => {
      console.log("SplashScreen: Hiding splash screen");
      setShowSplash(false);
      // Call onComplete after fade out animation completes
      setTimeout(() => {
        console.log("SplashScreen: Splash screen completed");
        onComplete();
      }, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

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
            <Image
              src="/assets/splashscreen.png"
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
