"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useUser } from "../hooks/useUser";
import { supabase } from "../lib/supabase";
import ReferralClaimPopup from "../components/ReferralClaimPopup";
import { useSearchParams } from "next/navigation";

interface ReferralContextType {
  showReferralPopup: boolean;
  setShowReferralPopup: (show: boolean) => void;
  handleCloseReferralPopup: () => void;
  checkUserReferral: () => Promise<void>;
  resetReferralCheck: () => void;
}

const ReferralContext = createContext<ReferralContextType>({
  showReferralPopup: false,
  setShowReferralPopup: () => {},
  handleCloseReferralPopup: () => {},
  checkUserReferral: async () => {},
  resetReferralCheck: () => {},
});

export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [checkedReferral, setCheckedReferral] = useState(false);
  const user = useUser();
  const searchParams = useSearchParams();

  // Initialize WebApp parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        // Get the start parameter if it exists
        const telegramStartParam =
          window.Telegram.WebApp.initDataUnsafe?.start_param;
        if (telegramStartParam) {
          localStorage.setItem("last_startapp_param", telegramStartParam);
        }
      } catch {
        // Silent fail
      }
    }
  }, []);

  const handleCloseReferralPopup = () => {
    setShowReferralPopup(false);
    if (user.id) {
      localStorage.setItem(`referral_popup_shown_${user.id}`, "true");
    }
  };

  const checkUserReferral = useCallback(async () => {
    if (!user.id || checkedReferral) {
      console.log(
        "[REFERRAL CONTEXT DEBUG] Skipping referral check - already checked or no user ID",
        { userId: user.id, checkedReferral }
      );
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    console.log("[REFERRAL CONTEXT DEBUG] Checking user referral:", user.id);

    try {
      // First, check for popup already shown in localStorage
      const popupShownKey = `referral_popup_shown_${user.id}`;
      const popupAlreadyShown = localStorage.getItem(popupShownKey);
      console.log(
        "[REFERRAL CONTEXT DEBUG] Popup already shown (localStorage)?",
        popupAlreadyShown
      );

      // If popup was shown previously, we might want to skip
      if (popupAlreadyShown === "true") {
        console.log(
          "[REFERRAL CONTEXT DEBUG] Popup has been shown before, might skip showing again"
        );
        // We'll continue checking anyway, but make a note of this
      }

      // Query direct from URL params if present
      const refParam = searchParams.get("refId");
      const startappParam = searchParams.get("startapp");

      console.log(
        "[REFERRAL CONTEXT DEBUG] URL Parameters - refId:",
        refParam,
        "startapp:",
        startappParam
      );

      // Check localStorage for saved start_param (from Telegram WebApp)
      const savedStartParam = localStorage.getItem("last_startapp_param");
      console.log(
        "[REFERRAL CONTEXT DEBUG] Saved start_param from localStorage:",
        savedStartParam
      );

      // Check for link params
      if (refParam) {
        // We have a refParam directly in the URL - check if this is a new referral
        console.log(
          "[REFERRAL CONTEXT DEBUG] Processing direct refId parameter:",
          refParam
        );

        const { data: userData, error: userError } = await supabase
          .from("telegram_users")
          .select("referred_by")
          .eq("user_id", user.id.toString())
          .single();

        console.log(
          "[REFERRAL CONTEXT DEBUG] User referred_by data:",
          userData,
          "Error:",
          userError
        );

        // Only process if this is a new user or user without referral yet
        if (
          !userError &&
          (!userData?.referred_by || userData?.referred_by === "")
        ) {
          // First, validate that the referrer exists in the database
          console.log(
            "[REFERRAL CONTEXT DEBUG] Validating referrer exists:",
            refParam
          );

          const { data: referrerData, error: referrerError } = await supabase
            .from("telegram_users")
            .select("user_id")
            .eq("user_id", refParam)
            .single();

          if (referrerError || !referrerData) {
            console.error(
              "[REFERRAL CONTEXT DEBUG] Referrer does not exist in database:",
              refParam,
              referrerError
            );
            return;
          }

          console.log(
            "[REFERRAL CONTEXT DEBUG] Referrer validated, setting referred_by and pending_referral_claim for new user"
          );

          const { data: updateData, error: updateError } = await supabase
            .from("telegram_users")
            .update({
              referred_by: refParam,
              pending_referral_claim: true,
            })
            .eq("user_id", user.id.toString());

          console.log(
            "[REFERRAL CONTEXT DEBUG] Update result:",
            updateData,
            "Error:",
            updateError
          );

          if (!updateError) {
            console.log(
              "[REFERRAL CONTEXT DEBUG] Successfully updated user with new referral"
            );
            // Show popup - this is a validated referral
            setShowReferralPopup(true);
            return;
          } else {
            console.error(
              "[REFERRAL CONTEXT DEBUG] Error updating user with new referral:",
              updateError
            );
          }
        } else if (userData?.referred_by) {
          console.log(
            `[REFERRAL CONTEXT DEBUG] User already has a referrer: ${userData.referred_by}, not changing`
          );
        }
      } else if (
        startappParam &&
        (startappParam.startsWith("r_") || startappParam.startsWith("ref_"))
      ) {
        // Handle startapp param format
        const referrerId = startappParam.startsWith("r_")
          ? startappParam.replace("r_", "")
          : startappParam.replace("ref_", "");

        console.log(
          "[REFERRAL CONTEXT DEBUG] Processing startapp referral parameter:",
          startappParam,
          "Extracted ID:",
          referrerId
        );

        if (referrerId !== user.id.toString()) {
          // Same processing as above for ref param
          const { data: userData, error: userError } = await supabase
            .from("telegram_users")
            .select("referred_by")
            .eq("user_id", user.id.toString())
            .single();

          console.log(
            "[REFERRAL CONTEXT DEBUG] User referral data:",
            userData,
            "Error:",
            userError
          );

          // Only process if this is a new user or user without referral yet
          if (
            !userError &&
            (!userData?.referred_by || userData?.referred_by === "")
          ) {
            // First, validate that the referrer exists in the database
            console.log(
              "[REFERRAL CONTEXT DEBUG] Validating referrer exists for startapp param:",
              referrerId
            );

            const { data: referrerData, error: referrerError } = await supabase
              .from("telegram_users")
              .select("user_id")
              .eq("user_id", referrerId)
              .single();

            if (referrerError || !referrerData) {
              console.error(
                "[REFERRAL CONTEXT DEBUG] Referrer does not exist in database for startapp param:",
                referrerId,
                referrerError
              );
              return;
            }

            console.log(
              "[REFERRAL CONTEXT DEBUG] Referrer validated, setting referred_by and pending_referral_claim for new user from startapp param"
            );

            const { data: updateData, error: updateError } = await supabase
              .from("telegram_users")
              .update({
                referred_by: referrerId,
                pending_referral_claim: true,
              })
              .eq("user_id", user.id.toString());

            console.log(
              "[REFERRAL CONTEXT DEBUG] Update result:",
              updateData,
              "Error:",
              updateError
            );

            if (!updateError) {
              console.log(
                "[REFERRAL CONTEXT DEBUG] Successfully updated user with new referral from startapp param"
              );
              // Show popup - this is a validated referral
              setShowReferralPopup(true);
              return;
            } else {
              console.error(
                "[REFERRAL CONTEXT DEBUG] Error updating user with new referral from startapp param:",
                updateError
              );
            }
          } else if (userData?.referred_by) {
            console.log(
              `[REFERRAL CONTEXT DEBUG] User already has a referrer: ${userData.referred_by}, not changing`
            );
          }
        } else {
          console.log(
            `[REFERRAL CONTEXT DEBUG] User ${user.id} attempted to refer themselves, ignoring`
          );
        }
      } else if (
        savedStartParam &&
        (savedStartParam.startsWith("r_") || savedStartParam.startsWith("ref_"))
      ) {
        // Process saved start param from localStorage (from Telegram WebApp)
        const referrerId = savedStartParam.startsWith("r_")
          ? savedStartParam.replace("r_", "")
          : savedStartParam.replace("ref_", "");

        console.log(
          "[REFERRAL CONTEXT DEBUG] Processing saved start param:",
          savedStartParam,
          "Extracted ID:",
          referrerId
        );

        if (referrerId !== user.id.toString()) {
          // Same processing as above
          const { data: userData, error: userError } = await supabase
            .from("telegram_users")
            .select("referred_by")
            .eq("user_id", user.id.toString())
            .single();

          console.log(
            "[REFERRAL CONTEXT DEBUG] User referral data from saved param:",
            userData,
            "Error:",
            userError
          );

          // Only process if this is a new user or user without referral yet
          if (
            !userError &&
            (!userData?.referred_by || userData?.referred_by === "")
          ) {
            // First, validate that the referrer exists in the database
            console.log(
              "[REFERRAL CONTEXT DEBUG] Validating referrer exists for saved param:",
              referrerId
            );

            const { data: referrerData, error: referrerError } = await supabase
              .from("telegram_users")
              .select("user_id")
              .eq("user_id", referrerId)
              .single();

            if (referrerError || !referrerData) {
              console.error(
                "[REFERRAL CONTEXT DEBUG] Referrer does not exist in database for saved param:",
                referrerId,
                referrerError
              );
              return;
            }

            console.log(
              "[REFERRAL CONTEXT DEBUG] Referrer validated, setting referred_by and pending_referral_claim for user from saved param"
            );

            const { data: updateData, error: updateError } = await supabase
              .from("telegram_users")
              .update({
                referred_by: referrerId,
                pending_referral_claim: true,
              })
              .eq("user_id", user.id.toString());

            console.log(
              "[REFERRAL CONTEXT DEBUG] Update result for saved param:",
              updateData,
              "Error:",
              updateError
            );

            if (!updateError) {
              console.log(
                "[REFERRAL CONTEXT DEBUG] Successfully updated user with new referral from saved param"
              );
              // Show popup - this is a validated referral
              setShowReferralPopup(true);
              return;
            } else {
              console.error(
                "[REFERRAL CONTEXT DEBUG] Error updating user with new referral from saved param:",
                updateError
              );
            }
          } else if (userData?.referred_by) {
            console.log(
              `[REFERRAL CONTEXT DEBUG] User already has a referrer: ${userData.referred_by}, not changing`
            );
          }
        } else {
          console.log(
            `[REFERRAL CONTEXT DEBUG] User ${user.id} attempted to refer themselves with saved param, ignoring`
          );
        }
      }

      // If we've reached here, we didn't process a new referral from params,
      // so check if the user has a pending claim in the database
      console.log(
        "[REFERRAL CONTEXT DEBUG] Checking for pending referral claim in database"
      );

      const { data: userDbData, error: userError } = await supabase
        .from("telegram_users")
        .select("referred_by, pending_referral_claim")
        .eq("user_id", user.id.toString())
        .single();

      console.log(
        "[REFERRAL CONTEXT DEBUG] User database data:",
        userDbData,
        "Error:",
        userError
      );

      if (userError) {
        console.error(
          "[REFERRAL CONTEXT DEBUG] Error fetching user data:",
          userError
        );
        return;
      }

      if (userDbData?.referred_by && userDbData?.pending_referral_claim) {
        console.log(
          "[REFERRAL CONTEXT DEBUG] User has pending referral claim:",
          userDbData
        );

        // Check if the reward has already been claimed using API
        const referralResponse = await fetch(
          `/api/referrals?userId=${user.id}&action=check_pending_reward`
        );
        const referralData = referralResponse.ok
          ? await referralResponse.json()
          : null;

        console.log(
          "[REFERRAL CONTEXT DEBUG] Existing referral reward status:",
          referralData
        );

        // Check if popup was previously shown for this user
        if (popupAlreadyShown === "true" && !referralData?.hasPendingReward) {
          console.log(
            "[REFERRAL CONTEXT DEBUG] Popup already shown and reward claimed, not showing again"
          );
        } else if (referralData?.hasPendingReward) {
          console.log(
            "[REFERRAL CONTEXT DEBUG] Showing referral popup for unclaimed reward"
          );
          setShowReferralPopup(true);
        } else {
          console.log(
            "[REFERRAL CONTEXT DEBUG] Reward already claimed, not showing popup"
          );
        }
      } else {
        console.log("[REFERRAL CONTEXT DEBUG] No pending referral claim found");
      }
    } catch (error) {
      console.error(
        "[REFERRAL CONTEXT DEBUG] Error in checkUserReferral:",
        error
      );
    } finally {
      setCheckedReferral(true);
    }
  }, [
    user.id,
    checkedReferral,
    searchParams,
    setCheckedReferral,
    setShowReferralPopup,
  ]);

  const resetReferralCheck = useCallback(() => {
    setCheckedReferral(false);
  }, []);

  return (
    <ReferralContext.Provider
      value={{
        showReferralPopup,
        setShowReferralPopup,
        handleCloseReferralPopup,
        checkUserReferral,
        resetReferralCheck,
      }}
    >
      {children}
      {showReferralPopup && user.id && (
        <ReferralClaimPopup
          userId={user.id.toString()}
          onClose={handleCloseReferralPopup}
        />
      )}
    </ReferralContext.Provider>
  );
};
