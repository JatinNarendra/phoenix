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
import SplashScreen from "@/app/components/SplashScreen";

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
  const [showSplash, setShowSplash] = useState<boolean>(false); // Don't show by default
  const [showLoader, setShowLoader] = useState<boolean>(true); // Track if we should show loader
  const hasInitialized = useRef(false);
  const hasCalledReady = useRef(false);
  const lastKnownUserId = useRef<string | null>(null);
  const initDataCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const refreshCooldownRef = useRef<number>(0);
  const splashShownKey = "phoenix_splash_shown";

  // Clear splash screen flag when app is refreshed or closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(splashShownKey);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // App is being hidden/closed, clear the flag
        if (typeof window !== "undefined") {
          localStorage.removeItem(splashShownKey);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, []);

  // Add timeout to automatically hide loader after short delay
  useEffect(() => {
    if (showLoader) {
      const loaderTimeout = setTimeout(() => {
        console.log("WebAppContext: Loader timeout, hiding loader");
        setShowLoader(false);
      }, 1000); // Hide loader after 1 second max

      return () => clearTimeout(loaderTimeout);
    }
  }, [showLoader]);

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

    // Check if splash screen has been shown before in this session
    const hasShownSplash =
      typeof window !== "undefined" &&
      localStorage.getItem(splashShownKey) === "true";

    // Show splash screen only if we're in Telegram environment AND haven't shown it before
    if (isTelegramEnvironment && !hasShownSplash) {
      console.log(
        "WebAppContext: First time in Telegram environment, showing splash screen"
      );
      setShowSplash(true);
      // Mark that we've shown the splash screen
      if (typeof window !== "undefined") {
        localStorage.setItem(splashShownKey, "true");
      }
    } else if (isTelegramEnvironment && hasShownSplash) {
      console.log(
        "WebAppContext: Splash screen already shown in this session, skipping"
      );
    }

    const initializeWebApp = () => {
      if (typeof window === "undefined") return;

      // Check if we're accessing a Nexus route (including /nexuslogin)
      const isNexusRoute =
        window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin";

      // If it's a Nexus route, bypass Telegram WebApp check completely
      if (isNexusRoute) {
        console.log("Nexus route detected, bypassing Telegram WebApp check");

        // Create a dummy WebApp instance for Nexus routes to provide consistent context
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
              id: 0, // Use 0 to indicate it's a dummy admin user
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
            // Simulate successful payment after 2 seconds
            setTimeout(() => callback("paid"), 2000);
          },
        };

        // For Nexus routes, we set both WebApp and isTelegramApp to handle other components
        setWebApp(dummyNexusWebApp);
        setIsTelegramApp(true);
        setIsLoading(false);
        setIsReady(true);
        setShowLoader(false);
        return;
      }

      // First try to get Telegram WebApp data
      const checkTelegramApp = () => {
        if (window.Telegram?.WebApp) {
          const telegramWebApp = window.Telegram.WebApp;
          // Check if we have any Telegram WebApp data with actual user, not just empty initDataUnsafe
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
            setShowLoader(false);
            return true;
          }
        }
        return false;
      };

      // Check if we're on localhost:3000
      const isLocalhost = isClientDevEnvironment();

      // Try to initialize Telegram first
      const telegramAppFound = checkTelegramApp();

      // If no Telegram app found, or if we're in localhost and Telegram app has no user data
      if (
        !telegramAppFound ||
        (isLocalhost &&
          window.Telegram?.WebApp &&
          !window.Telegram.WebApp.initDataUnsafe?.user)
      ) {
        if (isLocalhost) {
          console.log("Running in localhost mode with dummy data");
          console.log("Creating dummy WebApp with user ID: 123456789");
          // Show splash screen for localhost development only if not shown before
          if (!hasShownSplash) {
            setShowSplash(true);
            if (typeof window !== "undefined") {
              localStorage.setItem(splashShownKey, "true");
            }
          }
          // Create dummy WebApp instance for local development
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
              // Simulate successful payment after 2 seconds
              setTimeout(() => callback("paid"), 2000);
            },
          };
          setWebApp(dummyWebApp);
          setIsTelegramApp(true);
          setIsLoading(false);
          setIsReady(true);
          setShowLoader(false);
          console.log("Dummy WebApp set successfully:", {
            hasInitData: !!dummyWebApp.initData,
            hasInitDataUnsafe: !!dummyWebApp.initDataUnsafe,
            hasUser: !!dummyWebApp.initDataUnsafe?.user,
            userId: dummyWebApp.initDataUnsafe?.user?.id,
          });
        } else {
          // If document is complete and still no Telegram WebApp, provide fallback
          if (document.readyState === "complete") {
            console.warn(
              "Telegram WebApp not found, using fallback WebApp instance"
            );
            // Create a fallback WebApp instance for production
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
            // Don't show splash screen for fallback (non-Telegram) WebApp
            setIsReady(true);
            setShowLoader(false);
          } else {
            // If document not ready, try again in 100ms but with a max retry count
            const maxRetries = 10; // Set a max retry count to prevent infinite attempts
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
              // Create a fallback WebApp instance after max retries
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
              // Don't show splash screen for fallback (non-Telegram) WebApp
              setIsReady(true);
              setShowLoader(false);
            }
          }
        }
      }
    };

    initializeWebApp();
  }, []);

  // Add initData monitoring to detect account switches
  useEffect(() => {
    if (!isTelegramApp || !WebApp) return;

    const startInitDataMonitoring = () => {
      // Clear any existing interval
      if (initDataCheckInterval.current) {
        clearInterval(initDataCheckInterval.current);
      }

      // Set initial user ID
      const currentUserId = WebApp.initDataUnsafe?.user?.id?.toString();
      if (currentUserId) {
        lastKnownUserId.current = currentUserId;
        console.log("WebAppContext: Initial user ID set:", currentUserId);
      }

      // Monitor for user ID changes every 3 seconds
      initDataCheckInterval.current = setInterval(() => {
        const currentUserId = WebApp.initDataUnsafe?.user?.id?.toString();
        const now = Date.now();

        // Only check for user changes if we have a valid current user ID
        if (!currentUserId) {
          return;
        }

        // If this is the first time we're setting a user ID, just store it
        if (!lastKnownUserId.current) {
          lastKnownUserId.current = currentUserId;
          console.log("WebAppContext: Initial user ID set:", currentUserId);
          return;
        }

        // Check if user ID has changed
        if (currentUserId !== lastKnownUserId.current) {
          console.log("WebAppContext: User ID change detected!", {
            previousUserId: lastKnownUserId.current,
            currentUserId: currentUserId,
            timeSinceLastRefresh: now - refreshCooldownRef.current,
          });

          // Only refresh if we haven't refreshed very recently (prevent rapid loops)
          if (now - refreshCooldownRef.current > 3000) {
            // 3 second minimum cooldown
            // Always refresh on user change - this is critical for data integrity
            // Update refresh tracking
            refreshCooldownRef.current = now;
            lastKnownUserId.current = currentUserId;

            // Force refresh the page to get fresh initData
            console.log(
              "WebAppContext: Forcing page refresh due to account switch"
            );
            window.location.reload();
            return;
          } else {
            console.log(
              "WebAppContext: Skipping refresh due to recent refresh"
            );
            // Still update the last known user ID to prevent repeated checks
            lastKnownUserId.current = currentUserId;
          }
        }
      }, 2000); // Check every 2 seconds
    };

    startInitDataMonitoring();

    // Cleanup on unmount
    return () => {
      if (initDataCheckInterval.current) {
        clearInterval(initDataCheckInterval.current);
      }
    };
  }, [isTelegramApp, WebApp]);

  // Add timeout to hide splash screen if it stays too long
  useEffect(() => {
    if (showSplash) {
      const splashTimeout = setTimeout(() => {
        console.log("WebAppContext: Splash screen timeout, forcing hide");
        setShowSplash(false);
      }, 10000); // Hide splash after 10 seconds max

      return () => clearTimeout(splashTimeout);
    }
  }, [showSplash]);

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
    showSplash,
    showBackButton,
    hideBackButton,
    enableCloseConfirmation,
    disableCloseConfirmation,
    triggerHapticFeedback,
  };

  console.log("WebAppContext: Rendering with state:", {
    showSplash,
    isReady,
    isLoading,
    isTelegramApp,
  });

  return (
    <WebAppContext.Provider value={value}>
      <SplashScreen
        isVisible={showSplash}
        onComplete={() => {
          console.log("WebAppContext: Splash screen completed, hiding splash");
          setShowSplash(false);
        }}
      />
      {!isReady && showLoader && <Loader isLoading={true} />}
      {children}
    </WebAppContext.Provider>
  );
};

export const useWebApp = () => {
  const context = useContext(WebAppContext);

  // Check if we're on a Nexus route and handle gracefully
  if (!context) {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/nexus") ||
        window.location.pathname === "/nexuslogin")
    ) {
      console.warn(
        "useWebApp called on Nexus route without WebAppProvider, returning null context"
      );
      // Return a safe default context for Nexus routes
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
