"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import HomePhoenixTap from "./HomePhoenixTap/page";
import { useReferral } from "./context/ReferralContext";
import { useUser } from "./hooks/useUser";
import SplashScreen from "./components/SplashScreen";

export default function Tap() {
  console.log("=== ROOT PAGE (app/page.tsx) COMPONENT STARTED ===");
  console.log("Root Page: Current pathname:", window?.location?.pathname);

  // Splash screen state - only show once per session
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return true;

    // Check if splash has been shown in this session
    const splashShownKey = "phoenix_splash_shown_session";
    const hasShownSplash = sessionStorage.getItem(splashShownKey) === "true";

    if (!hasShownSplash) {
      console.log("Main Page: First visit in session, will show splash screen");
      return true;
    } else {
      console.log("Main Page: Splash already shown in this session, skipping");
      return false;
    }
  });

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
    console.log("[REFERRAL DEBUG] useEffect triggered", {
      hasCheckedRef: hasCheckedRef.current,
    });

    // Prevent infinite loops by checking if we've already processed this
    if (hasCheckedRef.current) {
      console.log("[REFERRAL DEBUG] Already checked, skipping");
      return;
    }

    // For localhost testing: Check URL for referral parameters directly
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const startappParam = params.get("startapp");

      if (startappParam) {
        console.log(
          "[REFERRAL DEBUG] Found startapp param in URL:",
          startappParam
        );
        localStorage.setItem("last_startapp_param", startappParam);

        // Force reset of referral check
        resetReferralCheck();
      }
    }

    // Check if we have a saved referral parameter
    const savedStartappParam = localStorage.getItem("last_startapp_param");
    console.log("[REFERRAL DEBUG] Saved startapp param:", savedStartappParam);

    // Always reset and check on page load if there's a saved parameter
    if (savedStartappParam) {
      console.log("[REFERRAL DEBUG] Processing saved referral parameter");
      // Don't mark as checked yet - let the user ID useEffect handle it

      resetReferralCheck();

      // Call immediately instead of using timeout
      console.log("[REFERRAL DEBUG] Calling checkUserReferral immediately");
      checkUserReferral();
    }
    // If no saved parameter but we haven't checked yet, still do a check
    else {
      console.log("[REFERRAL DEBUG] No saved parameter, doing general check");
      // Don't mark as checked yet - let the user ID useEffect handle it

      // Reset the check state and then trigger a new check
      resetReferralCheck();

      // Call immediately instead of using timeout
      console.log(
        "[REFERRAL DEBUG] Calling checkUserReferral immediately (no param)"
      );
      checkUserReferral();
    }
  }, [resetReferralCheck, checkUserReferral]);

  // Trigger referral check when user ID becomes available
  useEffect(() => {
    if (user.id && !hasCheckedRef.current) {
      console.log(
        "[REFERRAL DEBUG] User ID available, triggering referral check"
      );
      hasCheckedRef.current = true;
      resetReferralCheck();
      checkUserReferral();
    }
  }, [user.id, resetReferralCheck, checkUserReferral]);

  const handleSplashComplete = () => {
    console.log("Main Page: Splash screen completed");

    // Mark splash as shown in this session
    const splashShownKey = "phoenix_splash_shown_session";
    sessionStorage.setItem(splashShownKey, "true");

    setShowSplash(false);
  };

  return (
    <div className="h-full w-full">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <HomePhoenixTap />
    </div>
  );
}
