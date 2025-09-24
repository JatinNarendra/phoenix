"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { isClientDevEnvironment } from "@/app/lib/urlUtils";
import type { TelegramWebApp, WebAppInstance } from "@/app/types/telegram";
import Loader from "@/app/components/ui/Loader";

// Declare custom window interface with our retry counter
interface CustomWindow extends Window {
  __webAppInitRetries?: number;
}
declare const window: CustomWindow & typeof globalThis;

const WebAppContext = createContext<WebAppInstance | null>(null);

export const WebAppProvider = ({ children }: { children: React.ReactNode }) => {
  const [WebApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isTelegramApp, setIsTelegramApp] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const hasInitialized = useRef(false);
  const hasCalledReady = useRef(false);
  const lastKnownUserId = useRef<string | null>(null);
  const initDataCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const refreshCooldownRef = useRef<number>(0);

  useEffect(() => {
    if (hasInitialized.current) return;
    // Set hasInitialized immediately to prevent multiple initialization attempts
    hasInitialized.current = true;

    // Check if we're in a Telegram WebApp environment first
    const isTelegramEnvironment =
      typeof window !== "undefined" &&
      window.Telegram?.WebApp &&
      window.Telegram.WebApp.isTelegramApp;

    console.log("WebAppContext: Telegram environment check:", {
      hasWindow: typeof window !== "undefined",
      hasTelegram: !!window?.Telegram,
      hasWebApp: !!window?.Telegram?.WebApp,
      isTelegramApp: window?.Telegram?.WebApp?.isTelegramApp,
      isTelegramEnvironment,
    });

    const initializeWebApp = () => {
      if (typeof window === "undefined") return;

      // Check if we're accessing a Nexus route (including /nexuslogin)
      const isNexusRoute =
        window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin";

      // If it's a Nexus route, bypass Telegram WebApp check completely
      if (isNexusRoute) {
        console.log("Nexus route detected, bypassing Telegram WebApp check");

        const dummyNexusWebApp: TelegramWebApp = {
          platform: "web",
          isTelegramApp: true,
          BackButton: {
            show: () => {},
            hide: () => {},
            onClick: () => {},
            offClick: () => {},
            isVisible: false,
          },
          HapticFeedback: {
            impactOccurred: () => {},
            notificationOccurred: () => {},
            selectionChanged: () => {},
          },
          enableClosingConfirmation: () => {},
          disableClosingConfirmation: () => {},
          onEvent: () => {},
          offEvent: () => {},
          initData: "",
          initDataUnsafe: {
            user: {
              id: 0,
              username: "admin",
              first_name: "Admin",
              last_name: "User",
              language_code: "en",
              photo_url: "",
              allows_write_to_pm: false,
            },
          },
          close: () => {},
          openLink: () => {},
          ready: () => {},
          openInvoice: (invoiceUrl, callback) => {
            console.log("Mock openInvoice called with:", invoiceUrl);
            setTimeout(() => callback("paid"), 2000);
          },
        };

        setWebApp(dummyNexusWebApp);
        setIsTelegramApp(true);
        setIsLoading(false);
        setIsReady(true);
        return;
      }

      // First try to get Telegram WebApp data
      const checkTelegramApp = () => {
        if (window.Telegram?.WebApp) {
          const telegramWebApp = window.Telegram.WebApp;
          if (telegramWebApp.initDataUnsafe?.user || telegramWebApp.initData) {
            if (!hasCalledReady.current) {
              try {
                telegramWebApp.ready();
                hasCalledReady.current = true;
              } catch (e) {
                console.error("Error calling WebApp.ready():", e);
              }
            }
            console.log(
              "Telegram WebApp initialized:",
              telegramWebApp.initDataUnsafe || "No user data available"
            );
            setWebApp(telegramWebApp);
            setIsTelegramApp(true);
            setIsLoading(false);
            setIsReady(true);
            return true;
          }
        }
        return false;
      };

      const isLocalhost = isClientDevEnvironment();
      const telegramAppFound = checkTelegramApp();

      if (
        !telegramAppFound ||
        (isLocalhost &&
          window.Telegram?.WebApp &&
          !window.Telegram.WebApp.initDataUnsafe?.user)
      ) {
        if (isLocalhost) {
          console.log("Running in localhost mode with dummy data");
          const dummyWebApp: TelegramWebApp = {
            platform: "web",
            isTelegramApp: true,
            BackButton: {
              show: () => {},
              hide: () => {},
              onClick: () => {},
              offClick: () => {},
              isVisible: false,
            },
            HapticFeedback: {
              impactOccurred: () => {},
              notificationOccurred: () => {},
              selectionChanged: () => {},
            },
            enableClosingConfirmation: () => {},
            disableClosingConfirmation: () => {},
            onEvent: () => {},
            offEvent: () => {},
            initData:
              "user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%7D",
            initDataUnsafe: {
              user: {
                id: 123456789,
                username: "testuser",
                first_name: "Test",
                last_name: "User",
                language_code: "en",
                photo_url: "https://example.com/photo.jpg",
                allows_write_to_pm: true,
              },
            },
            close: () => {},
            openLink: () => {},
            ready: () => {},
            openInvoice: (invoiceUrl, callback) => {
              console.log("Mock openInvoice called with:", invoiceUrl);
              setTimeout(() => callback("paid"), 2000);
            },
          };
          setWebApp(dummyWebApp);
          setIsTelegramApp(true);
          setIsLoading(false);
          setIsReady(true);
        } else {
          if (document.readyState === "complete") {
            console.warn(
              "Telegram WebApp not found, using fallback WebApp instance"
            );
            const fallbackWebApp: TelegramWebApp = {
              platform: "web",
              isTelegramApp: false,
              BackButton: {
                show: () => {},
                hide: () => {},
                onClick: () => {},
                offClick: () => {},
                isVisible: false,
              },
              HapticFeedback: {
                impactOccurred: () => {},
                notificationOccurred: () => {},
                selectionChanged: () => {},
              },
              enableClosingConfirmation: () => {},
              disableClosingConfirmation: () => {},
              onEvent: () => {},
              offEvent: () => {},
              initData: "",
              initDataUnsafe: {},
              close: () => {},
              openLink: () => {},
              ready: () => {},
              openInvoice: (invoiceUrl, callback) => {
                console.log("Fallback openInvoice called with:", invoiceUrl);
                setTimeout(() => callback("paid"), 2000);
              },
            };
            setWebApp(fallbackWebApp);
            setIsTelegramApp(false);
            setIsLoading(false);
            setIsReady(true);
          } else {
            const maxRetries = 10;
            const retryCount = window.__webAppInitRetries || 0;
            if (retryCount < maxRetries) {
              window.__webAppInitRetries = retryCount + 1;
              setTimeout(() => {
                if (!hasCalledReady.current) {
                  initializeWebApp();
                }
              }, 100);
            } else {
              console.warn(
                "Max retries exceeded for WebApp initialization, using fallback"
              );
              const fallbackWebApp: TelegramWebApp = {
                platform: "web",
                isTelegramApp: false,
                BackButton: {
                  show: () => {},
                  hide: () => {},
                  onClick: () => {},
                  offClick: () => {},
                  isVisible: false,
                },
                HapticFeedback: {
                  impactOccurred: () => {},
                  notificationOccurred: () => {},
                  selectionChanged: () => {},
                },
                enableClosingConfirmation: () => {},
                disableClosingConfirmation: () => {},
                onEvent: () => {},
                offEvent: () => {},
                initData: "",
                initDataUnsafe: {},
                close: () => {},
                openLink: () => {},
                ready: () => {},
                openInvoice: (invoiceUrl, callback) => {
                  console.log("Fallback openInvoice called with:", invoiceUrl);
                  setTimeout(() => callback("paid"), 2000);
                },
              };
              setWebApp(fallbackWebApp);
              setIsTelegramApp(false);
              setIsLoading(false);
              setIsReady(true);
            }
          }
        }
      }
    };

    initializeWebApp();
  }, []);

  // Add initData monitoring to detect account switches
  useEffect(() => {
    // Only enable monitoring for Telegram apps, not Nexus or localhost
    if (!isTelegramApp || !WebApp || WebApp.initDataUnsafe?.user?.id === 0) {
      return;
    }

    if (!isTelegramApp || !WebApp) return;

    const startInitDataMonitoring = () => {
      if (initDataCheckInterval.current) {
        clearInterval(initDataCheckInterval.current);
      }

      const currentUserId = WebApp?.initDataUnsafe?.user?.id?.toString();
      if (currentUserId) {
        lastKnownUserId.current = currentUserId;
        console.log("WebAppContext: Initial user ID set:", currentUserId);
      }

      initDataCheckInterval.current = setInterval(() => {
        const currentUserId = WebApp?.initDataUnsafe?.user?.id?.toString();
        const now = Date.now();

        if (!currentUserId) {
          return;
        }

        if (!lastKnownUserId.current) {
          lastKnownUserId.current = currentUserId;
          console.log("WebAppContext: Initial user ID set:", currentUserId);
          return;
        }

        if (currentUserId !== lastKnownUserId.current) {
          console.log("WebAppContext: User ID change detected!", {
            previousUserId: lastKnownUserId.current,
            currentUserId: currentUserId,
            timeSinceLastRefresh: now - refreshCooldownRef.current,
          });

          if (now - refreshCooldownRef.current > 3000) {
            refreshCooldownRef.current = now;
            lastKnownUserId.current = currentUserId;

            console.log(
              "WebAppContext: Forcing page refresh due to account switch"
            );
            window.location.reload();
            return;
          } else {
            console.log(
              "WebAppContext: Skipping refresh due to recent refresh"
            );
            lastKnownUserId.current = currentUserId;
          }
        }
      }, 2000);
    };

    startInitDataMonitoring();

    return () => {
      if (initDataCheckInterval.current) {
        clearInterval(initDataCheckInterval.current);
      }
    };
  }, [isTelegramApp, WebApp]);

  const showBackButton = () => {
    if (WebApp?.BackButton) {
      WebApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    if (WebApp?.BackButton) {
      WebApp.BackButton.hide();
    }
  };

  const enableCloseConfirmation = () => {
    if (WebApp) {
      WebApp.enableClosingConfirmation();
    }
  };

  const disableCloseConfirmation = () => {
    if (WebApp) {
      WebApp.enableClosingConfirmation();
    }
  };

  const triggerHapticFeedback = (
    intensity: "light" | "medium" | "heavy" | "rigid" | "soft" = "medium"
  ) => {
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred(intensity);
    }
  };

  const value = {
    instance: WebApp,
    isLoading,
    error,
    isTelegramApp,
    isReady,
    showBackButton,
    hideBackButton,
    enableCloseConfirmation,
    disableCloseConfirmation,
    triggerHapticFeedback,
  };

  console.log("WebAppContext: Rendering with state:", {
    isReady,
    isLoading,
    isTelegramApp,
  });

  return (
    <WebAppContext.Provider value={value}>{children}</WebAppContext.Provider>
  );
};

export const useWebApp = () => {
  const context = useContext(WebAppContext);

  if (!context) {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin")
    ) {
      console.warn(
        "useWebApp called on Nexus route without WebAppProvider, returning null context"
      );
      return {
        instance: null,
        isLoading: false,
        error: null,
        isTelegramApp: false,
        isReady: true,
        showSplash: false,
        showBackButton: () => {},
        hideBackButton: () => {},
        enableCloseConfirmation: () => {},
        disableCloseConfirmation: () => {},
        triggerHapticFeedback: () => {},
      };
    }
    throw new Error("useWebApp must be used within a WebAppProvider");
  }
  return context;
};
