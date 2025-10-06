import { supabase } from "./supabase";
import { getBotUrl, getBotUsername } from "./telegram";
import { GameState } from "../types/gameTypes";

// Define a more complete ReferralData interface
export interface ReferralData {
  inviteLink: string;
  referredFriends: number;
  totalRewards: number;
  directMiniAppLink?: string;
  startCommandLink?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalRewards: number;
  referees: Array<{
    userId: string;
    firstName: string;
    joinedAt: string;
    level?: number;
  }>;
}

// Define the interface for the referee data structure
interface RefereeData {
  referee_id: string;
  created_at: string;
  telegram_users:
    | {
        first_name: string;
        game_state?: {
          level?: number;
        };
      }
    | {
        first_name: string;
        game_state?: {
          level?: number;
        };
      }[]
    | null;
}

/**
 * Generate a referral link for a user
 * @param userId User ID to generate a referral link for
 * @returns Referral link that can be shared
 */
export const generateReferralLink = (userId: string) => {
  // Using the tg:// protocol allows direct mini app opening on mobile devices
  // Format: tg://resolve?domain=botusername&appname=botusername&startapp=r_USERID
  const botUsername = getBotUsername();
  return `tg://resolve?domain=${botUsername}&appname=${botUsername}&startapp=r_${userId}`;
};

/**
 * Generate a fallback HTTP referral link for a user (for platforms that don't support tg:// links)
 * @param userId User ID to generate a referral link for
 * @returns HTTP referral link that can be shared
 */
export const generateHTTPReferralLink = (userId: string) => {
  // Use the same format as the direct MiniApp link for consistency
  return `${getBotUrl()}?startapp=r_${userId}`;
};

/**
 * Generate a direct MiniApp referral link that opens the app with the referral popup
 * @param userId User ID to generate a direct MiniApp referral link for
 * @returns Direct MiniApp referral link that immediately opens the app with referral popup
 */
export const generateDirectMiniAppReferralLink = (userId: string) => {
  // For better compatibility with all Telegram clients, use the startapp parameter
  // with our r_ prefix that our app recognizes as a referral

  // This format works on both desktop and mobile with the new parameter format
  return `${getBotUrl()}?startapp=r_${userId}`;
};

/**
 * Generate a direct /start command link that will work with deep linking
 * @param userId User ID to generate a start command referral link for
 * @returns Direct start command referral link
 */
export const generateStartCommandReferralLink = (userId: string) => {
  // This uses the /start command with ref_ parameter format that works with deep linking
  return `${getBotUrl()}?start=ref_${userId}`;
};

/**
 * Load referral statistics for a user
 * @param userId User ID to load referral stats for
 * @returns Promise resolving to referral statistics
 */
export const loadReferralStats = async (
  userId: string
): Promise<ReferralData> => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Get the user's current game state to check referral data
    const { data: userData, error: userError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      return {
        inviteLink: generateReferralLink(userId),
        directMiniAppLink: generateDirectMiniAppReferralLink(userId),
        startCommandLink: generateStartCommandReferralLink(userId),
        referredFriends: 0,
        totalRewards: 0,
      };
    }

    // Get referral data from game state, or create default values
    const referralData = userData.game_state?.referral || {
      inviteLink: generateReferralLink(userId),
      referredFriends: 0,
      totalRewards: 0,
    };

    // Add the direct MiniApp link and start command link
    return {
      ...referralData,
      directMiniAppLink: generateDirectMiniAppReferralLink(userId),
      startCommandLink: generateStartCommandReferralLink(userId),
    };
  } catch (error) {
    console.error("Error loading referral stats:", error);
    return {
      inviteLink: generateReferralLink(userId),
      directMiniAppLink: generateDirectMiniAppReferralLink(userId),
      startCommandLink: generateStartCommandReferralLink(userId),
      referredFriends: 0,
      totalRewards: 0,
    };
  }
};

/**
 * Gets the referral statistics for a user
 * @param userId The Telegram user ID
 * @returns The referral statistics or null if there was an error
 */
export const getReferralStats = async (
  userId: number | string
): Promise<ReferralStats | null> => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // First try to get from the stats view
    const { data: statsData, error: statsError } = await supabase
      .from("user_referral_stats")
      .select("total_referrals, total_rewards")
      .eq("referrer_id", userId.toString())
      .single();

    const stats: ReferralStats = {
      totalReferrals: 0,
      totalRewards: 0,
      referees: [],
    };

    if (!statsError && statsData) {
      stats.totalReferrals = statsData.total_referrals || 0;
      stats.totalRewards = statsData.total_rewards || 0;
    } else {
      // If no stats found or error, fall back to count query
      const { count, error: countError } = await supabase
        .from("user_referrals")
        .select("referee_id", { count: "exact" })
        .eq("referrer_id", userId.toString());

      if (!countError) {
        stats.totalReferrals = count || 0;
        stats.totalRewards = (count || 0) * 50000; // 50,000 per referral
      }
    }

    // Get the list of referred users
    const { data: refereesData, error: refereesError } = await supabase
      .from("user_referrals")
      .select(
        `
        referee_id,
        created_at,
        telegram_users:telegram_users!referee_id(
          first_name,
          game_state
        )
      `
      )
      .eq("referrer_id", userId.toString())
      .order("created_at", { ascending: false });

    if (!refereesError && refereesData) {
      const typedData = refereesData as RefereeData[];

      stats.referees = typedData.map((referee) => {
        let firstName = "Unknown User";
        let level = 1; // Default level

        if (referee.telegram_users) {
          if (
            Array.isArray(referee.telegram_users) &&
            referee.telegram_users.length > 0
          ) {
            firstName = referee.telegram_users[0].first_name || "Unknown User";
            level = referee.telegram_users[0].game_state?.level || 1;
          } else if (!Array.isArray(referee.telegram_users)) {
            firstName = referee.telegram_users.first_name || "Unknown User";
            level = referee.telegram_users.game_state?.level || 1;
          }
        }

        return {
          userId: referee.referee_id,
          firstName,
          joinedAt: referee.created_at,
          level,
        };
      });
    }

    return stats;
  } catch (error) {
    console.error("Error getting referral stats:", error);
    return null;
  }
};

/**
 * Updates the game state with the latest referral statistics
 * @param gameState The current game state
 * @param userId The Telegram user ID
 * @returns The updated game state
 */
export const syncReferralStats = async (
  gameState: GameState,
  userId: number | string
): Promise<Partial<GameState>> => {
  try {
    const stats = await getReferralStats(userId);

    if (!stats) return gameState;

    // Update with enhanced referral data structure
    return {
      ...gameState,
      referral: {
        inviteLink: generateReferralLink(userId.toString()),
        referredFriends: stats.totalReferrals,
        totalRewards: stats.totalRewards,
        directMiniAppLink: generateDirectMiniAppReferralLink(userId.toString()),
        startCommandLink: generateStartCommandReferralLink(userId.toString()),
      },
    };
  } catch (error) {
    console.error("Error syncing referral stats:", error);
    return gameState;
  }
};
