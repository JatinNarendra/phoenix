"use client";
import React, { useEffect, useRef, useCallback } from "react";
import HomePhoenixTap from "./HomePhoenixTap/page";
import { useReferral } from "./context/ReferralContext";
import { useUser } from "./hooks/useUser";

export default function Tap() {
  console.log("=== ROOT PAGE (app/page.tsx) COMPONENT STARTED ===");
  console.log("Root Page: Current pathname:", window?.location?.pathname);

  // Get context access
  const { checkUserReferral, resetReferralCheck } = useReferral();
  const user = useUser();
  const hasCheckedRef = useRef(false);

  // Check and handle localStorage for referrals
  const checkAndClearReferralCache = useCallback(() => {
    if (typeof window === "undefined" || !user.id) return;

    console.log("[REFERRAL DEBUG] Checking referral cache for user:", user.id);

    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const startappParam = params.get("startapp");
    const refIdParam = params.get("refId");

    // Force clear localStorage if we have referral parameters
    if (
      startappParam?.startsWith("r_") ||
      startappParam?.startsWith("ref_") ||
      refIdParam
    ) {
      console.log(
        "[REFERRAL DEBUG] Found referral parameter, clearing referral popup cache"
      );

      // Clear cache to ensure popup shows
      const popupShownKey = `referral_popup_shown_${user.id}`;
      const popupClaimedKey = `referral_reward_claimed_${user.id}`;

      // Check if these exist
      const popupShown = localStorage.getItem(popupShownKey);
      const rewardClaimed = localStorage.getItem(popupClaimedKey);

      console.log("[REFERRAL DEBUG] Current localStorage state:", {
        popupShown,
        rewardClaimed,
      });

      // Clear if coming from a referral link
      if (popupShown) {
        console.log(
          "[REFERRAL DEBUG] Clearing popup shown flag to force popup display"
        );
        localStorage.removeItem(popupShownKey);
      }
    }

    // Always make sure we have the latest startapp parameter saved
    if (startappParam) {
      console.log(
        "[REFERRAL DEBUG] Saving startapp parameter to localStorage:",
        startappParam
      );
      localStorage.setItem("last_startapp_param", startappParam);
    }
  }, [user.id]);

  // Run on initial load and whenever user ID changes
  useEffect(() => {
    if (user.id) {
      checkAndClearReferralCache();
    }
  }, [user.id, checkAndClearReferralCache]);

  // Force a referral check when the main page loads
  useEffect(() => {
    // For localhost testing: Check URL for referral parameters directly
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const startappParam = params.get("startapp");

      if (startappParam) {
        localStorage.setItem("last_startapp_param", startappParam);

        // Force reset of referral check
        resetReferralCheck();
      }
    }

    // Check if we have a saved referral parameter
    const savedStartappParam = localStorage.getItem("last_startapp_param");

    // Always reset and check on page load if there's a saved parameter
    if (savedStartappParam) {
      resetReferralCheck();

      // Small delay to ensure the reset has taken effect
      const timer = setTimeout(() => {
        checkUserReferral();
      }, 100);

      return () => clearTimeout(timer);
    }
    // If no saved parameter but we haven't checked yet, still do a check
    else if (!hasCheckedRef.current) {
      // Mark as checked to prevent future checks
      hasCheckedRef.current = true;

      // Reset the check state and then trigger a new check
      resetReferralCheck();

      // Small delay to ensure the reset has taken effect
      const timer = setTimeout(() => {
        checkUserReferral();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [resetReferralCheck, checkUserReferral]);

  return (
    <div className="h-full w-full">
      <HomePhoenixTap />
    </div>
  );
}
