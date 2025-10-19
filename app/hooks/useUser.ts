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
    if (!isReady || initializationAttempted.current) return;
    initializationAttempted.current = true;

    // Check for user switching and handle localStorage appropriately
    if (typeof window !== "undefined") {
      try {
        const storedStateStr = localStorage.getItem("user");
        const lastUserId = localStorage.getItem("lastActiveUserId");
        const currentUserId = WebApp?.initDataUnsafe?.user?.id?.toString();

        if (storedStateStr && currentUserId) {
          const storedState = JSON.parse(storedStateStr);

          // If stored state belongs to a different user
          if (storedState.user_id && storedState.user_id !== currentUserId) {
            // Check if this is a legitimate user switch (not first-time initialization)
            if (lastUserId && lastUserId !== currentUserId) {
              // Clear localStorage data from previous user
              localStorage.removeItem("user");
              localStorage.removeItem("playerScore");
              localStorage.removeItem("boosterUsage");
              localStorage.removeItem("spinProgression");
            } else {
              // Don't clear data - this might be a legitimate account addition
            }
          }
        }

        // Update the last active user ID
        if (currentUserId) {
          localStorage.setItem("lastActiveUserId", currentUserId);
        }
      } catch (error) {
        console.error(
          "useUser: Error checking localStorage for user data:",
          error
        );
        // Clear localStorage if there's any error parsing it
        localStorage.removeItem("user");
        localStorage.removeItem("playerScore");
        localStorage.removeItem("boosterUsage");
        localStorage.removeItem("spinProgression");
        localStorage.removeItem("lastActiveUserId");
      }
    }

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

      // Validate initData integrity to detect cached/stale data
      const telegramUser = WebApp.initDataUnsafe.user;
      const initData = WebApp.initData;

      // Check if initData contains the correct user ID
      if (initData && telegramUser?.id) {
        try {
          // Decode URL-encoded initData to check for user ID
          const decodedInitData = decodeURIComponent(initData);
          const userIdInInitData = decodedInitData.includes(
            `"id":${telegramUser.id}`
          );

          if (!userIdInInitData) {
            // Only refresh if we haven't refreshed recently
            const lastRefresh = localStorage.getItem("lastInitDataRefresh");
            const now = Date.now();
            if (!lastRefresh || now - parseInt(lastRefresh) > 5000) {
              // 5 second cooldown
              localStorage.setItem("lastInitDataRefresh", now.toString());
              window.location.reload();
              return;
            } else {
            }
          }
        } catch (error) {
          console.warn(
            "useUser: Error decoding initData, skipping validation:",
            error
          );
          // If we can't decode the initData, we'll proceed without validation
          // This prevents the app from breaking due to malformed initData
        }
      }

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

      try {
        const result = await initializeUserOnce(WebApp);

        if (!result.success) {
          console.error("❌ User initialization failed:", result.error);
          console.error("❌ Full error details:", {
            success: result.success,
            error: result.error,
            isNewUser: result.isNewUser,
          });
          // Even if initialization fails, we still want to set the user data
          // as we have it from Telegram
        } else {
        }
        setUser(userData);
        initializationCompleted.current = true;
      } catch (error) {
        console.error("❌ User initialization error:", error);
        console.error(
          "❌ Error stack:",
          error instanceof Error ? error.stack : "No stack trace"
        );
        // Set user data even if initialization fails
        setUser(userData);
        initializationCompleted.current = true;
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
