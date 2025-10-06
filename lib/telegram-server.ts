import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// Create a service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
  });
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Get bot token from env
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Get bot URL from env with fallback
export const getBotUrl = () => {
  return process.env.BOT_URL || "https://t.me/devphoenixbot";
};

// Get bot username from URL
export const getBotUsername = () => {
  const botUrl = getBotUrl();
  return botUrl.replace("https://t.me/", "");
};

// Create HMAC signature using Node.js crypto
const createHMACSignature = (data: string, botToken: string): string => {
  return crypto.createHmac("sha256", botToken).update(data).digest("hex");
};

export const validateTelegramWebAppData = async (
  initData: string
): Promise<boolean> => {
  try {
    // Basic validation
    if (!initData || typeof initData !== "string") {
      console.error("Invalid initData: empty or not a string");
      return false;
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("Telegram bot token not found in environment variables");
      return false;
    }

    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get("hash");

    if (!hash) {
      console.error("No hash found in initData");
      return false;
    }

    // Remove hash from params for validation
    searchParams.delete("hash");

    // Check if we have any parameters left
    if (searchParams.size === 0) {
      console.error("No parameters found in initData after removing hash");
      return false;
    }

    // Sort params and create data string
    const sortedParams = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    console.log("Validation debug:", {
      paramsCount: searchParams.size,
      sortedParamsLength: sortedParams.length,
      hashLength: hash.length,
    });

    // Create HMAC signature using Node.js crypto
    const hashHex = createHMACSignature(sortedParams, TELEGRAM_BOT_TOKEN);

    const isValid = hashHex === hash;
    if (!isValid) {
      console.error("Hash validation failed:", {
        expected: hash,
        calculated: hashHex,
        sortedParams: sortedParams.substring(0, 200) + "...",
      });
    }

    return isValid;
  } catch (error) {
    console.error("Error validating Telegram WebApp data:", error);
    return false;
  }
};

interface TelegramUserData {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  photo_url?: string | null;
}

export const getTelegramUser = async (
  userId: number
): Promise<TelegramUserData | null> => {
  try {
    const response = await fetch(`${BOT_API_URL}/getChat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to get user from Telegram API");
      return null;
    }

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API returned error:", data.description);
      return null;
    }

    return {
      id: data.result.id,
      is_bot: data.result.is_bot || false,
      username: data.result.username,
      first_name: data.result.first_name,
      last_name: data.result.last_name,
      language_code: data.result.language_code,
      photo_url: null, // Will be set separately if needed
    };
  } catch (error) {
    console.error("Error fetching user from Telegram:", error);
    return null;
  }
};

export interface TelegramGameState {
  user_id: string;
  coins: number;
  spins: number;
  totalSpins: number;
  totalCoins: number;
  tapPower: number;
  stage: number;
  FlameCapacityTap: number;
  minPhoenixEnergy: number;
  RechargeLevel: number;
  currentRecharge: number;
  phoenixEnergyProgress: number;
  spinLevel: number;
  boosts: {
    inGameTurbo: number;
    rewardedTurbo: number;
    inGameRecharge: number;
    rewardedRecharge: number;
    turboActive: boolean;
    rechargeActive: boolean;
    turboEndTime?: number;
    rechargeEndTime?: number;
    autoTapUses: number;
    turboTimeLeft: number;
    rechargeTimeLeft: number;
    turboRefillTime: number;
    rechargeRefillTime: number;
  };
  upgrades: {
    tapLevel: number;
    energyLevel: number;
    rechargeLevel: number;
    spinLevel: number;
  };
  progress: {
    daily: {
      streak: number;
      lastDay: number;
    };
    social: {
      x: string[];
      youtube: string[];
      telegram: string[];
    };
  };
  timers: {
    turboTimeLeft: number;
    rechargeTimeLeft: number;
    turboRefillTime: number;
    rechargeRefillTime: number;
  };
  energyCapacity: number;
  autoTapCoins: number;
  autoTapTotalCoins: number;
  autoTapClaimed: boolean;
  autoTapEndTime: number;
  autoTapStartTime: number;
  autoTapActive: boolean;
  autoTapTimeLeft: number;
  autoTapProgress: number;
  autoTapSpark: number;
  isSpinning: boolean;
  characterProgress: {
    currentCharacter: string;
    currentTokens: number;
    requiredTokens: number;
  };
  dailyRewards: {
    lastCollected: string;
    currentStreak: number;
    maxStreak: number;
    user_id: string;
    lastDay: number;
    collectedDays: Record<number, { collectedAt: string; coins: number }>;
  };
  socialTasks: {
    TELEGRAM_CHANNEL: { completedTasks: string[] };
    X: { completedTasks: string[] };
    YOUTUBE_VIEWS: { completedTasks: string[] };
  };
  spinGoals: Array<{
    id: number;
    icon: string;
    required: number;
    collected: number;
    reward: number;
    completed: boolean;
  }>;
  spinTimer: number;
  spinLimit: number;
  autoTapDaily: {
    lastReset: string;
    usesRemaining: number;
  };
  application_state?: {
    has_visited_earn_page: boolean;
    isAutotapPurchased: boolean;
    [key: string]: boolean | number | string | null | undefined;
  };
  autoTapInitialPower?: number;
  gameVersion?: string;
  lastUpdate?: number;
}

interface UserDataToSave {
  user_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  language_code: string | null;
  photo_url: string | null;
  is_bot: boolean;
  game_state: TelegramGameState;
  last_login: string;
  last_active: string;
  created_at?: string;
  updated_at: string;
}

export const updateTelegramUserProgress = async (
  userId: string,
  appGameState: TelegramGameState
) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not available");
    }

    console.log("Updating user progress for:", userId);

    const { data, error } = await supabaseAdmin
      .from("telegram_users")
      .update({
        game_state: appGameState,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("Error updating user progress:", error);
      return false;
    }

    console.log("User progress updated successfully:", data);
    return true;
  } catch (error) {
    console.error("Error in updateTelegramUserProgress:", error);
    return false;
  }
};

export const initializeOrUpdateUser = async (
  userData: TelegramUserData,
  isStartCommand: boolean = false
) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not available");
    }

    console.log("Initializing/updating user:", userData.id);

    const now = new Date().toISOString();

    // Check if user exists and get their current state
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("telegram_users")
      .select("*, game_state")
      .eq("user_id", userData.id.toString())
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing user:", fetchError);
      throw fetchError;
    }

    const isNewUser = !existingUser;

    // If user exists, just update metadata and return early
    if (existingUser) {
      console.log("User exists, updating metadata only");

      // Update only metadata, preserve game_state
      const { error: updateError } = await supabaseAdmin
        .from("telegram_users")
        .update({
          username: userData.username || null,
          first_name: userData.first_name,
          last_name: userData.last_name || null,
          language_code: userData.language_code || null,
          photo_url: userData.photo_url || null,
          last_active: now,
          updated_at: now,
        })
        .eq("user_id", userData.id.toString());

      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        throw updateError;
      }

      console.log("User metadata updated successfully");
      return { success: true, isNewUser: false };
    }

    // Rest of the function for new users...
    console.log("Creating new user with default game state");

    // Create default game state
    const defaultGameState: TelegramGameState = {
      user_id: userData.id.toString(),
      coins: 0,
      spins: 50,
      totalSpins: 0,
      totalCoins: 0,
      tapPower: 1,
      stage: 1,
      FlameCapacityTap: 500,
      minPhoenixEnergy: 500,
      RechargeLevel: 1,
      currentRecharge: 1500,
      phoenixEnergyProgress: 0,
      spinLevel: 1,
      boosts: {
        inGameTurbo: 3,
        rewardedTurbo: 0,
        inGameRecharge: 3,
        rewardedRecharge: 0,
        turboActive: false,
        rechargeActive: false,
        autoTapUses: 3,
        turboTimeLeft: 0,
        rechargeTimeLeft: 0,
        turboRefillTime: 0,
        rechargeRefillTime: 0,
      },
      upgrades: {
        tapLevel: 1,
        energyLevel: 1,
        rechargeLevel: 1,
        spinLevel: 1,
      },
      progress: {
        daily: {
          streak: 0,
          lastDay: 0,
        },
        social: {
          x: [],
          youtube: [],
          telegram: [],
        },
      },
      timers: {
        turboTimeLeft: 0,
        rechargeTimeLeft: 0,
        turboRefillTime: 0,
        rechargeRefillTime: 0,
      },
      energyCapacity: 1500,
      autoTapCoins: 0,
      autoTapTotalCoins: 0,
      autoTapClaimed: false,
      autoTapEndTime: 0,
      autoTapStartTime: 0,
      autoTapActive: false,
      autoTapTimeLeft: 0,
      autoTapProgress: 0,
      autoTapSpark: 0,
      isSpinning: false,
      characterProgress: {
        currentCharacter: "phoenix",
        currentTokens: 0,
        requiredTokens: 1000,
      },
      dailyRewards: {
        lastCollected: "",
        currentStreak: 0,
        maxStreak: 0,
        user_id: userData.id.toString(),
        lastDay: 0,
        collectedDays: {},
      },
      socialTasks: {
        TELEGRAM_CHANNEL: { completedTasks: [] },
        X: { completedTasks: [] },
        YOUTUBE_VIEWS: { completedTasks: [] },
      },
      spinGoals: [
        {
          id: 1,
          icon: "🎯",
          required: 10,
          collected: 0,
          reward: 1000,
          completed: false,
        },
        {
          id: 2,
          icon: "🔥",
          required: 25,
          collected: 0,
          reward: 2500,
          completed: false,
        },
        {
          id: 3,
          icon: "💎",
          required: 50,
          collected: 0,
          reward: 5000,
          completed: false,
        },
      ],
      spinTimer: 0,
      spinLimit: 3,
      autoTapDaily: {
        lastReset: new Date().toISOString().split("T")[0],
        usesRemaining: 3,
      },
      application_state: {
        has_visited_earn_page: false,
        isAutotapPurchased: false,
      },
      gameVersion: "1.0.0",
      lastUpdate: Date.now(),
    };

    const userDataToSave: UserDataToSave = {
      user_id: userData.id.toString(),
      username: userData.username || null,
      first_name: userData.first_name,
      last_name: userData.last_name || null,
      language_code: userData.language_code || null,
      photo_url: userData.photo_url || null,
      is_bot: userData.is_bot,
      game_state: defaultGameState,
      last_login: isStartCommand
        ? now
        : (existingUser as any)?.last_login ?? now,
      last_active: now,
      updated_at: now,
    };

    if (isNewUser) {
      userDataToSave.created_at = now;
    }

    // Use insert for new users only (not upsert to avoid overwriting existing data)
    const { data, error } = await supabaseAdmin
      .from("telegram_users")
      .insert(userDataToSave)
      .select();

    if (error) {
      console.error("Error saving user data:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("New user created successfully:", data);
    return { success: true, isNewUser: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in initializeOrUpdateUser:", errorMessage);
    return { success: false, isNewUser: false, error: errorMessage };
  }
};

export const sendTelegramMessage = async (chatId: number, text: string) => {
  try {
    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
};

export const saveGameProgress = async (
  userId: string,
  gameState: TelegramGameState
): Promise<boolean> => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not available");
    }

    const { error } = await supabaseAdmin
      .from("telegram_users")
      .update({
        game_state: gameState,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error saving game progress:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveGameProgress:", error);
    return false;
  }
};
