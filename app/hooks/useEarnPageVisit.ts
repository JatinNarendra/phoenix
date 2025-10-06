import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "./useUser";

const EARN_PAGE_VISIT_KEY = "sparky_earn_page_visited";

export const useEarnPageVisit = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const user = useUser();

  useEffect(() => {
    const checkEarnPageVisit = async () => {
      if (!user.id) return;

      if (!supabase) {
        console.error("Supabase client not available");
        setShowWelcome(true);
        return;
      }

      try {
        // First check local storage
        const hasVisited = localStorage.getItem(
          `${EARN_PAGE_VISIT_KEY}_${user.id}`
        );

        if (hasVisited === "true") {
          setShowWelcome(false);
          return;
        }

        // If not in local storage, check Supabase
        const { data, error } = await supabase
          .from("telegram_users")
          .select("game_state")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          setShowWelcome(true);
          return;
        }

        const hasVisitedEarnPage =
          data?.game_state?.application_state?.has_visited_earn_page;

        // Update local storage if user has visited before
        if (hasVisitedEarnPage) {
          localStorage.setItem(`${EARN_PAGE_VISIT_KEY}_${user.id}`, "true");
        }

        setShowWelcome(!hasVisitedEarnPage);
      } catch (error) {
        console.error("Error checking earn page visit:", error);
        // If there's an error, check local storage as fallback
        const hasVisited = localStorage.getItem(
          `${EARN_PAGE_VISIT_KEY}_${user.id}`
        );
        setShowWelcome(hasVisited !== "true");
      }
    };

    checkEarnPageVisit();
  }, [user.id]);

  const handleCloseWelcome = () => {
    if (user.id) {
      localStorage.setItem(`${EARN_PAGE_VISIT_KEY}_${user.id}`, "true");
    }
    setShowWelcome(false);
  };

  return {
    showWelcome,
    handleCloseWelcome,
  };
};
