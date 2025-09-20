import { supabase } from "@/lib/supabase";

interface CachedReward {
  data: {
    collected_at: string;
    coins_earned: number;
    current_streak: number;
    max_streak: number;
    day_number: number;
  } | null;
  timestamp: number;
}

// Cache for last collected rewards to prevent excessive API calls
const rewardsCache = new Map<string, CachedReward>();
const CACHE_DURATION = 60000; // 1 minute cache

export const collectDailyRewardDB = async (
  userId: string,
  dayNumber: number,
  coinsEarned: number,
  streakBonus: number,
  currentStreak: number,
  maxStreak: number
) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("Invalid user ID");
    }

    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // First verify the user exists in telegram_users
    const { data: userExists, error: userCheckError } = await supabase
      .from("telegram_users")
      .select("user_id, game_state")
      .eq("user_id", userId)
      .single();

    if (userCheckError) {
      console.error("Error checking user:", userCheckError);
      throw new Error(`Failed to verify user: ${userCheckError.message}`);
    }

    if (!userExists) {
      console.error("User not found:", userId);
      throw new Error(
        "User not found in telegram_users table. Please restart the game or contact support if the issue persists."
      );
    }

    // Check if reward already collected today (UTC)
    const now = new Date();
    const todayUTC = now.toISOString().split("T")[0];
    const { data: existingReward, error: checkError } = await supabase
      .from("daily_rewards")
      .select("*")
      .eq("user_id", userId)
      .gte("collected_at", todayUTC + "T00:00:00Z")
      .lt("collected_at", todayUTC + "T23:59:59.999Z")
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingReward) {
      throw new Error("Daily reward already collected for today");
    }

    // Get the most recent reward to determine if a streak has been reset
    const { data: lastReward, error: lastRewardError } = await supabase
      .from("daily_rewards")
      .select("*")
      .eq("user_id", userId)
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRewardError) {
      console.error("Error getting last reward:", lastRewardError);
    }

    // For day numbers up to 15, ensure the current streak matches the day number
    // This corrects cases where a user has collected day 3 but has current streak of 1
    if (dayNumber <= 15) {
      // If this is a sequential collection (e.g., day 3 after day 2)
      if (lastReward && dayNumber === lastReward.day_number + 1) {
        // For sequential collections (e.g., day 3 after day 2), use day number as streak
        currentStreak = dayNumber;

        // Ensure max streak matches day number if it's the highest yet
        maxStreak = Math.max(maxStreak, dayNumber);
      }
    } else if (lastReward && dayNumber === lastReward.day_number + 1) {
      // For days beyond 15, increment streak if sequential
      currentStreak = Math.max(currentStreak, lastReward.current_streak + 1);

      // Update max streak if needed
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Check if user has missed a day for collecting rewards
    const hasMissedDay = lastReward
      ? getDaysDifference(new Date(lastReward.collected_at), now) > 1
      : false;

    // Check if we're resetting to day 1 from a higher day number
    const isResetToDay1 = dayNumber === 1 && lastReward && lastReward.day > 1;

    let dailyReward;
    let updatedExistingRecord = false; // Add a flag to track if we updated an existing record

    // Check if we already have a record for this day number for this user
    if ((hasMissedDay || isResetToDay1) && dayNumber === 1) {
      // Check if a record already exists for user_id and day=1
      const { data: existingDay1Record, error: existingDayError } =
        await supabase
          .from("daily_rewards")
          .select("*")
          .eq("user_id", userId)
          .eq("day", dayNumber)
          .maybeSingle();

      if (existingDayError) {
        console.error(
          "Error checking for existing day record:",
          existingDayError
        );
        throw new Error("Failed to check for existing day record");
      }

      if (existingDay1Record) {
        updatedExistingRecord = true; // Set the flag
        // Update the existing day 1 record instead of creating a new one
        const { data: updatedReward, error: updateError } = await supabase
          .from("daily_rewards")
          .update({
            coins: coinsEarned,
            streak_bonus: streakBonus,
            current_streak: currentStreak,
            max_streak: maxStreak,
            collected_at: now.toISOString(),
          })
          .eq("id", existingDay1Record.id as string)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating existing day record:", updateError);
          throw new Error(
            "Failed to update existing day record: " + updateError.message
          );
        }

        dailyReward = updatedReward;
      } else {
        // No existing record found, insert a new one
        const { data: newReward, error: insertError } = await supabase
          .from("daily_rewards")
          .insert({
            user_id: userId,
            day: dayNumber,
            coins: coinsEarned,
            streak_bonus: streakBonus,
            current_streak: currentStreak,
            max_streak: maxStreak,
            collected_at: now.toISOString(),
            reward_data: {},
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting daily reward:", insertError);
          throw new Error(
            "Failed to insert daily reward: " + insertError.message
          );
        }

        dailyReward = newReward;
      }
    } else {
      // Regular case, just insert a new record
      const { data: newReward, error: insertError } = await supabase
        .from("daily_rewards")
        .insert({
          user_id: userId,
          day: dayNumber,
          coins: coinsEarned,
          streak_bonus: streakBonus,
          current_streak: currentStreak,
          max_streak: maxStreak,
          collected_at: now.toISOString(),
          reward_data: {},
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting daily reward:", insertError);
        throw new Error(
          "Failed to insert daily reward: " + insertError.message
        );
      }

      dailyReward = newReward;
    }

    // Ensure game_state has the required structure
    const currentGameState = userExists.game_state || {};
    const currentProgress = currentGameState.progress || {};
    const currentDaily = currentProgress.daily || {};
    const currentSocial = currentProgress.social || {
      x: [],
      youtube: [],
      telegram: [],
    };

    // Update telegram_users table with new game state
    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        game_state: {
          ...currentGameState,
          coins: (currentGameState.coins || 0) + coinsEarned,
          progress: {
            ...currentProgress,
            daily: {
              ...currentDaily,
              streak: currentStreak,
              lastDay: dailyReward.collected_at,
            },
            social: currentSocial,
          },
          dailyRewards: {
            ...(currentGameState.dailyRewards || {}),
            lastCollected: dailyReward.collected_at,
            currentStreak,
            maxStreak,
            lastDay: dayNumber,
            collectedDays: {
              ...(currentGameState.dailyRewards?.collectedDays || {}),
              [dayNumber]: {
                collectedAt: dailyReward.collected_at,
                coins: coinsEarned,
              },
            },
          },
        },
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating user state:", updateError);
      // Try to rollback the daily reward insertion/update
      if (dailyReward?.id && !updatedExistingRecord && supabase) {
        // Only delete if we inserted a new record, not if we updated an existing one
        await supabase.from("daily_rewards").delete().eq("id", dailyReward.id);
      }
      throw new Error("Failed to update user state");
    }

    // Clear the cache for this user
    rewardsCache.delete(userId);

    return dailyReward;
  } catch (error) {
    console.error("Error collecting daily reward:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Internal server error while collecting daily reward");
  }
};

export const getDailyRewardHistory = async (userId: string) => {
  try {
    if (!supabase) {
      console.error("Supabase client not available");
      return [];
    }

    const { data, error } = await supabase
      .from("daily_rewards")
      .select("*")
      .eq("user_id", userId)
      .order("collected_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching daily reward history:", error);
    throw error;
  }
};

export const getLastCollectedReward = async (userId: string) => {
  try {
    // Ensure userId is a string and exists
    if (!userId) {
      console.error("Invalid user ID provided");
      return null;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return null;
    }

    // Check cache first
    const cached = rewardsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // First verify the user exists in telegram_users
    const { data: userExists, error: userCheckError } = await supabase
      .from("telegram_users")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (userCheckError) {
      if (userCheckError.code === "PGRST116") {
        // User not found - normal for new users
        return null;
      }
      console.error("Error checking user existence:", userCheckError);
      return null;
    }

    if (!userExists) {
      console.error("User not found in telegram_users table");
      return null;
    }

    // Get the most recent reward for this user
    const { data, error } = await supabase
      .from("daily_rewards")
      .select("*")
      .eq("user_id", userId)
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error getting last collected reward:", error);
      return null;
    }

    // Cache the result
    rewardsCache.set(userId, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error("Error getting last collected reward:", error);
    return null;
  }
};

export const getDailyRewardStatus = async (userId: string) => {
  try {
    const lastReward = await getLastCollectedReward(userId);

    // Get current UTC time
    const now = new Date();
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    // If no last reward, user can collect
    if (!lastReward) {
      return {
        canCollect: true,
        timeUntilNext: 0,
        nextRewardAt: utcNow.toISOString(),
        missedDay: false,
      };
    }

    const lastCollectedDate = new Date(lastReward.collected_at);
    const utcLastCollected = new Date(
      Date.UTC(
        lastCollectedDate.getUTCFullYear(),
        lastCollectedDate.getUTCMonth(),
        lastCollectedDate.getUTCDate(),
        lastCollectedDate.getUTCHours(),
        lastCollectedDate.getUTCMinutes(),
        lastCollectedDate.getUTCSeconds()
      )
    );

    // Get next UTC midnight
    const nextUTCMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );

    // Calculate time differences
    const timeSinceCollection = utcNow.getTime() - utcLastCollected.getTime();
    const timeUntilNextMidnight = nextUTCMidnight.getTime() - utcNow.getTime();

    // Check if we're in a new UTC day AND if we haven't already collected today
    const lastCollectedDay = new Date(
      Date.UTC(
        lastCollectedDate.getUTCFullYear(),
        lastCollectedDate.getUTCMonth(),
        lastCollectedDate.getUTCDate()
      )
    );
    const currentUTCDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const isNewDay = currentUTCDay.getTime() > lastCollectedDay.getTime();
    const hasCollectedToday =
      currentUTCDay.getTime() === lastCollectedDay.getTime();
    const canCollect = isNewDay && !hasCollectedToday;
    const missedDay = timeSinceCollection >= 48 * 60 * 60 * 1000;

    return {
      canCollect,
      timeUntilNext: canCollect ? 0 : timeUntilNextMidnight,
      nextRewardAt: nextUTCMidnight.toISOString(),
      missedDay,
    };
  } catch (error) {
    console.error("Error checking daily reward status:", error);
    throw error;
  }
};

// Add a helper function for client-side reward status check
export const checkRewardAvailability = (lastCollected: string | null) => {
  const now = new Date();
  const utcNow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )
  );

  if (!lastCollected || lastCollected === "1970-01-01T00:00:00.000Z") {
    return {
      canCollect: true,
      timeUntilNext: 0,
      nextRewardAt: utcNow.toISOString(),
      missedDay: false,
    };
  }

  const lastCollectedDate = new Date(lastCollected);
  const utcLastCollected = new Date(
    Date.UTC(
      lastCollectedDate.getUTCFullYear(),
      lastCollectedDate.getUTCMonth(),
      lastCollectedDate.getUTCDate(),
      lastCollectedDate.getUTCHours(),
      lastCollectedDate.getUTCMinutes(),
      lastCollectedDate.getUTCSeconds()
    )
  );

  // Get next UTC midnight
  const nextUTCMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );

  // Calculate time differences
  const timeSinceCollection = utcNow.getTime() - utcLastCollected.getTime();
  const timeUntilNextMidnight = nextUTCMidnight.getTime() - utcNow.getTime();

  // Check if we're in a new UTC day AND if we haven't already collected today
  const lastCollectedDay = new Date(
    Date.UTC(
      lastCollectedDate.getUTCFullYear(),
      lastCollectedDate.getUTCMonth(),
      lastCollectedDate.getUTCDate()
    )
  );
  const currentUTCDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const isNewDay = currentUTCDay.getTime() > lastCollectedDay.getTime();
  const hasCollectedToday =
    currentUTCDay.getTime() === lastCollectedDay.getTime();
  const canCollect = isNewDay && !hasCollectedToday;
  const missedDay = timeSinceCollection >= 48 * 60 * 60 * 1000;

  return {
    canCollect,
    timeUntilNext: canCollect ? 0 : timeUntilNextMidnight,
    nextRewardAt: nextUTCMidnight.toISOString(),
    missedDay,
  };
};

// Helper function to calculate days difference
function getDaysDifference(date1: Date, date2: Date): number {
  const utcDate1 = new Date(
    Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate())
  );

  const utcDate2 = new Date(
    Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate())
  );

  return Math.floor(
    (utcDate2.getTime() - utcDate1.getTime()) / (24 * 60 * 60 * 1000)
  );
}
