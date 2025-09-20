"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWebApp } from "./useWebApp";
import { initializeUserOnce } from "@/app/lib/userInitializer";

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  telegram_username: string;
  language_code?: string;
  photo_url?: string;
  isLoading: boolean;
}

export const useUser = () => {
  const [user, setUser] = useState<User>({
    id: 0,
    username: "",
    first_name: "",
    last_name: "",
    telegram_username: "",
    isLoading: true,
  });

  const { instance: WebApp, isReady } = useWebApp(true);
  const hasLogged = useRef(false);
  const initializationAttempted = useRef(false);
  const initializationCompleted = useRef(false);

  useEffect(() => {
    console.log("useUser effect triggered:", {
      isReady,
      initializationAttempted: initializationAttempted.current,
    });
    if (!isReady || initializationAttempted.current) return;
    initializationAttempted.current = true;
    console.log("useUser: Starting user initialization");

    const initializeUser = async () => {
      // Check if we're on a Nexus route - if so, bypass Telegram checks
      const isNexusRoute =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/nexus");

      if (isNexusRoute) {
        console.log(
          "Nexus route detected in useUser, bypassing Telegram user checks"
        );
        setUser((prev) => ({
          ...prev,
          isLoading: false,
        }));
        initializationCompleted.current = true;
        return;
      }

      if (!WebApp?.initData || !WebApp?.initDataUnsafe?.user) {
        if (!hasLogged.current) {
          console.log("No Telegram initData found");
          console.log("WebApp state:", {
            hasWebApp: !!WebApp,
            hasInitData: !!WebApp?.initData,
            hasInitDataUnsafe: !!WebApp?.initDataUnsafe,
            hasUser: !!WebApp?.initDataUnsafe?.user,
          });
          hasLogged.current = true;
        }
        localStorage.removeItem("playerScore");
        localStorage.removeItem("boosterUsage");

        setUser((prev) => ({
          ...prev,
          isLoading: false,
        }));
        return;
      }

      if (!hasLogged.current) {
        console.log("Telegram initData found:", WebApp.initData);
        hasLogged.current = true;
      }

      const telegramUser = WebApp.initDataUnsafe.user;
      const username =
        telegramUser.username ||
        `${telegramUser.first_name}${
          telegramUser.last_name ? ` ${telegramUser.last_name}` : ""
        }`;

      const userData = {
        id: telegramUser.id,
        username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || "",
        telegram_username: telegramUser.username || "",
        language_code: telegramUser.language_code,
        photo_url: telegramUser.photo_url,
        isLoading: false,
      };

      console.log("useUser: Setting user data:", userData);
      try {
        const result = await initializeUserOnce(WebApp);
        if (!result.success) {
          console.error("User initialization failed:", result.error);
          // Even if initialization fails, we still want to set the user data
          // as we have it from Telegram
        }
        setUser(userData);
        initializationCompleted.current = true;
        console.log("useUser: User initialization completed");
      } catch (error) {
        console.error("User initialization error:", error);
        // Set user data even if initialization fails
        setUser(userData);
        initializationCompleted.current = true;
        console.log("useUser: User initialization completed (with error)");
      }
    };

    initializeUser();
  }, [WebApp, isReady]);

  // Add a method to check if initialization is complete
  const isInitialized = useCallback(() => {
    return initializationCompleted.current;
  }, []);

  return { ...user, isInitialized };
};
