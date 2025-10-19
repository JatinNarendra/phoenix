"use client";

import { useEffect, useRef } from "react";
import { useReferral } from "../context/ReferralContext";
import { useUser } from "./useUser";
import { useSearchParams } from "next/navigation";

/**
 * Hook to automatically check if a user was referred and needs to claim their bonus
 * Can be used in any component where you want to check and show the referral popup
 * Prioritizes the Telegram initDataUnsafe.start_param for referral detection
 */
export const useCheckReferral = () => {
  const {
    checkUserReferral,
    resetReferralCheck,
    showReferralPopup,
    handleCloseReferralPopup,
  } = useReferral();
  const user = useUser();
  const searchParams = useSearchParams();
  // Track if parameters have been checked
  const paramsCheckedRef = useRef(false);

  useEffect(() => {
    if (user.id && !user.isLoading) {
      if (typeof window !== "undefined") {
        // ✅ PRIORITY 1: Check for Telegram's initDataUnsafe.start_param (correct way for Mini Apps)
        if (window.Telegram?.WebApp) {
          try {
            // Safely access and log initDataUnsafe using a type declaration
            type TelegramWebAppExtended = {
              initDataUnsafe?: {
                start_param?: string;
                [key: string]: unknown;
              };
            };

            const webAppData = window.Telegram
              .WebApp as unknown as TelegramWebAppExtended;
            const initDataUnsafe = webAppData.initDataUnsafe || {};

            // Check for start_param
            const telegramStartParam = initDataUnsafe.start_param;

            console.log(
              "[REFERRAL DEBUG] Telegram start_param:",
              telegramStartParam
            );
            console.log(
              "[REFERRAL DEBUG] Full initDataUnsafe:",
              JSON.stringify(initDataUnsafe)
            );

            if (telegramStartParam) {
              console.log(
                "[REFERRAL DEBUG] Found valid Telegram start_param:",
                telegramStartParam
              );
              localStorage.setItem("last_startapp_param", telegramStartParam);
              // Force a check
              resetReferralCheck();

              // Small delay to ensure the reset has taken effect
              const timer = setTimeout(() => {
                paramsCheckedRef.current = true;
                console.log(
                  "[REFERRAL DEBUG] Checking user referral after Telegram start_param"
                );
                checkUserReferral();
              }, 100);

              return () => clearTimeout(timer);
            }
          } catch (e) {
            console.error(
              "[REFERRAL DEBUG] Error accessing Telegram WebApp parameters:",
              e
            );
          }
        } else {
          console.log("[REFERRAL DEBUG] window.Telegram.WebApp not available");
        }

        // ✅ PRIORITY 2: Check URL parameters (for testing or alternative access methods)
        const refParam = searchParams.get("refId");
        const startappParam = searchParams.get("startapp");
        const refDirectParam = searchParams.get("ref");
        const urlStartParam = searchParams.get("start_param");

        console.log("[REFERRAL DEBUG] URL parameters:", {
          refParam,
          startappParam,
          refDirectParam,
          urlStartParam,
        });

        // Check if we have a startapp parameter and save it
        if (startappParam) {
          console.log(
            "[REFERRAL DEBUG] Found startapp param in URL:",
            startappParam
          );
          localStorage.setItem("last_startapp_param", startappParam);

          // Force a check immediately for localhost testing
          resetReferralCheck();

          // Small delay to ensure the reset has taken effect
          const timer = setTimeout(() => {
            paramsCheckedRef.current = true;
            console.log(
              "[REFERRAL DEBUG] Checking user referral after URL startapp param"
            );
            checkUserReferral();
          }, 100);

          return () => clearTimeout(timer);
        }

        // ✅ PRIORITY 3: Check for saved referral parameter from previous visit
        const savedStartappParam = localStorage.getItem("last_startapp_param");
        console.log(
          "[REFERRAL DEBUG] Saved startapp parameter:",
          savedStartappParam
        );

        // Always check the referral on each mount of the hook
        paramsCheckedRef.current = false;

        // If any referral parameter is present OR we have a saved one
        if (
          refParam ||
          startappParam ||
          refDirectParam ||
          urlStartParam ||
          savedStartappParam
        ) {
          console.log(
            "[REFERRAL DEBUG] Referral parameter found, resetting check"
          );
          resetReferralCheck();

          // Small delay to ensure the reset has taken effect
          const timer = setTimeout(() => {
            paramsCheckedRef.current = true;
            console.log(
              "[REFERRAL DEBUG] Checking user referral after found parameter"
            );
            checkUserReferral();
          }, 100);

          return () => clearTimeout(timer);
        } else if (!paramsCheckedRef.current) {
          console.log(
            "[REFERRAL DEBUG] No specific referral parameters, doing regular check"
          );
          // Small delay to ensure UI is ready for regular referral checks
          const timer = setTimeout(() => {
            // Mark as checked
            paramsCheckedRef.current = true;
            console.log("[REFERRAL DEBUG] Triggering regular referral check");
            checkUserReferral();
          }, 800);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    user.id,
    user.isLoading,
    searchParams,
    checkUserReferral,
    resetReferralCheck,
  ]);

  return {
    showReferralPopup,
    closeReferralPopup: handleCloseReferralPopup,
  };
};
