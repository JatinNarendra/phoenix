"use client";

import type { TelegramWebApp } from "../types/telegram";

// Define the return type
export interface InitializeResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
}

// Global state to track initialization
let hasInitialized = false;
let initializationPromise: Promise<InitializeResult> | null = null;
let lastInitializedUserId: string | null = null;

// Utility function to reset user progression data
export const resetUserProgressionData = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("spinProgression");
    console.log("User progression data reset");
  }
};

export const initializeUserOnce = (
  WebApp: TelegramWebApp
): Promise<InitializeResult> => {
  const currentUserId = WebApp.initDataUnsafe.user?.id?.toString();

  // If user has changed, reset initialization state
  if (lastInitializedUserId && lastInitializedUserId !== currentUserId) {
    console.log("User changed, resetting initialization state:", {
      lastUserId: lastInitializedUserId,
      currentUserId: currentUserId,
    });
    hasInitialized = false;
    initializationPromise = null;
  }

  // If we've already started initialization for this user, return the existing promise
  if (initializationPromise && lastInitializedUserId === currentUserId) {
    return initializationPromise;
  }

  // If we've already completed initialization for this user, return a resolved promise
  if (hasInitialized && lastInitializedUserId === currentUserId) {
    return Promise.resolve({ success: true });
  }

  const telegramUser = WebApp.initDataUnsafe.user;
  if (!telegramUser) {
    console.error("No user data found in WebApp");
    return Promise.resolve({ success: false, error: "No user data found" });
  }

  // Check if this is a dummy user in localhost mode
  const isDummyUser =
    telegramUser.id === 123456789 &&
    telegramUser.username === "testuser" &&
    telegramUser.first_name === "Test";

  if (isDummyUser) {
    console.log("Dummy user detected, skipping API initialization");
    hasInitialized = true;
    return Promise.resolve({ success: true });
  }

  // Set flag to prevent re-initialization for this user
  hasInitialized = true;
  lastInitializedUserId = currentUserId || null;

  // Store the promise so we can return it if called again
  initializationPromise = fetch("/api/telegram/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "initialize",
      userData: {
        id: telegramUser.id,
        is_bot: false,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
        photo_url: telegramUser.photo_url,
      },
      initData: WebApp.initData,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));

        // If validation failed, try again without initData as fallback
        if (
          response.status === 401 &&
          errorData.error?.includes("Invalid Telegram WebApp data")
        ) {
          console.warn(
            "Telegram validation failed, retrying without initData..."
          );

          const fallbackResponse = await fetch("/api/telegram/user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "initialize",
              userData: {
                id: telegramUser.id,
                is_bot: false,
                username: telegramUser.username,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                language_code: telegramUser.language_code,
                photo_url: telegramUser.photo_url,
              },
              initData: null, // Skip validation
            }),
          });

          if (!fallbackResponse.ok) {
            const fallbackError = await fallbackResponse
              .json()
              .catch(() => ({ error: "Fallback failed" }));
            throw new Error(
              fallbackError.error || `Fallback HTTP ${fallbackResponse.status}`
            );
          }

          console.log("Fallback initialization successful");
          return await fallbackResponse.json();
        }

        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Clear any existing progression data for new users
      if (typeof window !== "undefined") {
        localStorage.removeItem("spinProgression");
        console.log("Cleared progression data for user initialization");
      }

      return { success: true };
    })
    .catch((error) => {
      console.error("Error initializing user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    });

  return initializationPromise;
};
