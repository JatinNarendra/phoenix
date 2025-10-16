"use client";

import { supabase } from "../lib/supabase";
import { AUTO_TAP_DURATION } from "../constants/gameConstants";
import { levelConfig } from "../utility/stageConfig";

const botUrl = process.env.NEXT_PUBLIC_BOT_URL;
if (!botUrl) {
  console.error("NEXT_PUBLIC_BOT_URL environment variable is not set!");
  throw new Error("NEXT_PUBLIC_BOT_URL environment variable is required");
}

// Helper function to detect users that should be re-initialized when DB entry is missing
const shouldReinitializeOnMissing = (userId: string): boolean => {
  const reinitUserIds = [
    "6042897820", // Real Telegram user
    "123456789", // Dummy user (for localhost testing)
    "6456097705", // Jatin's actual user ID
  ];

  return reinitUserIds.includes(userId);
};

// Helper function to detect dummy user
const isDummyUser = (userId: string): boolean => {
  return userId === "123456789";
};

// Get bot URL from env with fallback
export const getBotUrl = () => {
  return botUrl;
};

// Get bot username from URL
export const getBotUsername = () => {
  const botUrl = getBotUrl();
  return botUrl.replace("https://t.me/", "");
};

// Get bot token from env
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Create HMAC key from bot token
const createHMACKey = async (botToken: string) => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(botToken);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
};

export const validateTelegramWebAppData = async (
  initData: string
): Promise<boolean> => {
  try {
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

    // Remove hash from data before checking
    searchParams.delete("hash");

    // Sort params alphabetically and create data string
    const dataToCheck = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Create HMAC key from bot token
    const secretKey = await createHMACKey(TELEGRAM_BOT_TOKEN);

    // Generate signature
    const signature = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      new TextEncoder().encode(dataToCheck)
    );

    // Convert to hex
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === hash;
  } catch (error) {
    console.error("Error validating Telegram data:", error);
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
    console.log(`Fetching Telegram user data for ID: ${userId}`);

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return null;
    }

    const response = await fetch(`${BOT_API_URL}/getChatMember`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userId,
        user_id: userId,
      }),
    });

    console.log(`Telegram API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to fetch user data from Telegram:", errorData);
      return null;
    }

    const data = await response.json();
    console.log("Raw Telegram API response:", JSON.stringify(data, null, 2));

    if (!data.ok || !data.result) {
      console.error("Invalid response from Telegram API:", data);
      return null;
    }

    // Validate and transform the response data
    const result = data.result.user;
    const userData: TelegramUserData = {
      id: Number(result.id),
      is_bot: Boolean(result.is_bot || false),
      username: result.username || "",
      first_name: result.first_name || "",
      last_name: result.last_name || "",
      language_code: result.language_code || "en",
      photo_url: result.photo?.big_file_id || null,
    };

    // Validate required fields
    if (!userData.id || !userData.first_name) {
      console.error("Missing required fields in Telegram response:", userData);
      return null;
    }

    console.log("Processed user data:", JSON.stringify(userData, null, 2));
    return userData;
  } catch (error) {
    console.error("Error fetching Telegram user:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return null;
  }
};

// Define our internal game state structure
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
  // Add any other properties that might be in GameState
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
    if (!userId) {
      console.error("No user ID provided for progress update");
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    // First get current state to preserve booster counts and autotap state
    const { data: currentUser, error: fetchError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      // Check if this is a "not found" error and if this user should be re-initialized
      if (
        (fetchError.code === "PGRST116" ||
          fetchError.message.includes("not found")) &&
        shouldReinitializeOnMissing(userId)
      ) {
        console.log(
          "User database entry not found, will be re-initialized by GameContext:",
          { userId, isDummyUser: isDummyUser(userId) }
        );
        return; // Let GameContext handle the re-initialization
      }
      console.error("Error fetching current state:", fetchError);
      return;
    }

    // Preserve booster counts and states
    const preservedBoosts = {
      ...appGameState.boosts,
      rewardedTurbo:
        (currentUser as any)?.game_state?.boosts?.rewardedTurbo ??
        appGameState.boosts.rewardedTurbo,
      rewardedRecharge:
        (currentUser as any)?.game_state?.boosts?.rewardedRecharge ??
        appGameState.boosts.rewardedRecharge,
      inGameTurbo:
        (currentUser as any)?.game_state?.boosts?.inGameTurbo ??
        appGameState.boosts.inGameTurbo,
      inGameRecharge:
        (currentUser as any)?.game_state?.boosts?.inGameRecharge ??
        appGameState.boosts.inGameRecharge,
      turboEndTime:
        (currentUser as any)?.game_state?.boosts?.turboEndTime ??
        appGameState.boosts.turboEndTime,
      rechargeEndTime:
        (currentUser as any)?.game_state?.boosts?.rechargeEndTime ??
        appGameState.boosts.rechargeEndTime,
    };

    // Preserve autotap state if it exists in current state
    const preservedAutoTapState = {
      autoTapActive:
        appGameState.autoTapActive ??
        (currentUser as any)?.game_state?.autoTapActive,
      autoTapEndTime:
        appGameState.autoTapEndTime ??
        (currentUser as any)?.game_state?.autoTapEndTime,
      autoTapStartTime:
        appGameState.autoTapStartTime ??
        (currentUser as any)?.game_state?.autoTapStartTime,
      autoTapProgress:
        appGameState.autoTapProgress ??
        (currentUser as any)?.game_state?.autoTapProgress,
      autoTapTimeLeft:
        appGameState.autoTapTimeLeft ??
        (currentUser as any)?.game_state?.autoTapTimeLeft,
      autoTapSpark:
        appGameState.autoTapSpark ??
        (currentUser as any)?.game_state?.autoTapSpark,
      autoTapCoins:
        appGameState.autoTapCoins ??
        (currentUser as any)?.game_state?.autoTapCoins,
      autoTapClaimed:
        appGameState.autoTapClaimed ??
        (currentUser as any)?.game_state?.autoTapClaimed,
      autoTapTotalCoins:
        appGameState.autoTapTotalCoins ??
        (currentUser as any)?.game_state?.autoTapTotalCoins,
      autoTapDaily:
        appGameState.autoTapDaily ??
        (currentUser as any)?.game_state?.autoTapDaily,
    };

    // Preserve application state within game_state
    const preservedApplicationState = {
      ...((currentUser as any)?.game_state?.application_state || {}),
      ...(appGameState.application_state || {}),
      isAutotapPurchased:
        appGameState.application_state?.isAutotapPurchased ??
        (currentUser as any)?.game_state?.application_state
          ?.isAutotapPurchased ??
        false,
      isAutotapActive: preservedAutoTapState.autoTapActive ?? false,
    };

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        game_state: {
          ...appGameState,
          ...preservedAutoTapState,
          boosts: preservedBoosts,
          application_state: preservedApplicationState,
        },
        last_active: now,
        updated_at: now,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating user progress:", updateError);
    }
  } catch (error) {
    console.error("Error in updateTelegramUserProgress:", error);
  }
};

export const initializeOrUpdateUser = async (
  userData: TelegramUserData,
  isStartCommand: boolean = false
) => {
  try {
    console.log("Starting user initialization with data:", userData);

    if (!userData?.id) {
      console.error("Invalid user data:", userData);
      return {
        success: false,
        isNewUser: false,
        error: "Invalid user data received: missing ID",
      };
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return {
        success: false,
        isNewUser: false,
        error: "Supabase client not available",
      };
    }

    const now = new Date().toISOString();
    console.log("Checking if user exists...");

    // Check if user exists and get their current state
    const { data: existingUser, error: fetchError } = await supabase
      .from("telegram_users")
      .select("*, game_state")
      .eq("user_id", userData.id.toString())
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing user:", fetchError);
      throw fetchError;
    }

    const isNewUser = !existingUser;

    // If user exists and has autotap state, recalculate it
    if ((existingUser as any)?.game_state) {
      const currentTime = Date.now();
      const gameState = (existingUser as any).game_state;

      // Handle autotap state
      if (gameState.autoTapActive && gameState.autoTapEndTime) {
        if (currentTime >= gameState.autoTapEndTime) {
          // Autotap has completed while app was closed
          // Use stored initial power level if available, otherwise fall back to current level
          const initialTapPower =
            gameState.autoTapInitialPower || gameState.upgrades.tapLevel;
          const finalReward = initialTapPower * AUTO_TAP_DURATION;

          gameState.autoTapActive = false;
          gameState.autoTapProgress = 100;
          gameState.autoTapTimeLeft = 0;
          if (!gameState.autoTapClaimed) {
            gameState.autoTapCoins = finalReward;
            gameState.autoTapSpark = finalReward;
          }
        } else {
          // Autotap is still running
          const elapsed = Math.min(
            AUTO_TAP_DURATION * 1000,
            currentTime - (gameState.autoTapStartTime || 0)
          );
          const progressPercent = Math.min(
            100,
            (elapsed / (AUTO_TAP_DURATION * 1000)) * 100
          );
          const remaining = Math.max(0, gameState.autoTapEndTime - currentTime);
          const elapsedSeconds = Math.floor(elapsed / 1000);
          // Use stored initial power level if available, otherwise fall back to current level
          const initialTapPower =
            gameState.autoTapInitialPower || gameState.upgrades.tapLevel;
          const currentSparkEarned = Math.min(
            elapsedSeconds * initialTapPower,
            AUTO_TAP_DURATION * initialTapPower
          );

          gameState.autoTapProgress = progressPercent;
          gameState.autoTapTimeLeft = Math.floor(remaining / 1000);
          gameState.autoTapSpark = currentSparkEarned;
        }

        // Update the game state in the database
        await updateTelegramUserProgress(userData.id.toString(), gameState);
      }

      // Return early for existing users
      return { success: true, isNewUser: false };
    }

    // Rest of the function for new users...
    const userDataToSave: UserDataToSave = {
      user_id: userData.id.toString(),
      username: userData.username || null,
      first_name: userData.first_name,
      last_name: userData.last_name || null,
      language_code: userData.language_code || null,
      photo_url: userData.photo_url || null,
      is_bot: Boolean(userData.is_bot),
      game_state: {
        user_id: userData.id.toString(),
        coins: 0,
        spins: 50,
        totalSpins: 0,
        totalCoins: 0,
        tapPower: 1,
        stage: 1,
        FlameCapacityTap: levelConfig[1].sparkRequired,
        minPhoenixEnergy: 0,
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
          daily: { streak: 0, lastDay: 0 },
          social: { telegram: [], x: [], youtube: [] },
        },
        timers: {
          turboTimeLeft: 0,
          rechargeTimeLeft: 0,
          turboRefillTime: 0,
          rechargeRefillTime: 0,
        },
        energyCapacity: 2500,
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
          currentCharacter: "3",
          currentTokens: 0,
          requiredTokens: 10,
        },
        dailyRewards: {
          lastCollected: new Date(0).toISOString(),
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
        spinGoals: [],
        spinTimer: 0,
        spinLimit: 5,
        autoTapDaily: {
          lastReset: new Date().toISOString(),
          usesRemaining: 3,
        },
        application_state: {
          has_visited_earn_page: false,
          isAutotapPurchased: false,
        },
      },
      last_login: isStartCommand
        ? now
        : (existingUser as any)?.last_login ?? now,
      last_active: now,
      updated_at: now,
    };

    if (isNewUser) {
      userDataToSave.created_at = now;
    }

    console.log("Attempting to save user data:", userDataToSave);

    // Use insert for new users only (not upsert to avoid overwriting existing data)
    const { data, error } = await supabase
      .from("telegram_users")
      .insert(userDataToSave)
      .select();

    if (error) {
      console.error("Error saving user data:", error);
      throw error;
    }

    console.log("User data saved successfully:", data);
    return { success: true, isNewUser };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in initializeOrUpdateUser:", errorMessage);
    return { success: false, isNewUser: false, error: errorMessage };
  }
};

// Add function to send messages
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

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

// Add function to set up bot commands
export const setupBotCommands = async () => {
  try {
    const commands = [
      {
        command: "start",
        description: "Start the game",
      },
      {
        command: "help",
        description: "Show help information",
      },
      {
        command: "stats",
        description: "Show your game statistics",
      },
    ];

    const response = await fetch(`${BOT_API_URL}/setMyCommands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commands }),
    });

    if (!response.ok) {
      throw new Error("Failed to set bot commands");
    }

    return true;
  } catch (error) {
    console.error("Error setting bot commands:", error);
    return false;
  }
};

// Add function to send custom keyboard
export const sendCustomKeyboard = async (chatId: number) => {
  try {
    const keyboard = {
      keyboard: [
        [
          {
            text: "🎮 Play Game",
            web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL },
          },
        ],
        [{ text: "📊 Statistics" }, { text: "❓ Help" }],
      ],
      resize_keyboard: true,
      persistent: true,
    };

    const response = await fetch(`${BOT_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Choose an option:",
        reply_markup: keyboard,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send keyboard");
    }

    return true;
  } catch (error) {
    console.error("Error sending keyboard:", error);
    return false;
  }
};

export const handleStartCommand = async (
  userId: number,
  startParam?: string
) => {
  try {
    // Check for valid user ID
    if (!userId || isNaN(userId)) {
      const error = `Invalid userId: ${userId}`;
      console.error("❌ " + error);
      return false;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return false;
    }

    // Process referral if present
    // Support both ref_USERID and r_USERID formats for referral codes
    if (
      startParam &&
      (startParam.startsWith("ref_") || startParam.startsWith("r_"))
    ) {
      // Extract referrerId by removing either prefix
      const referrerId = startParam.startsWith("ref_")
        ? startParam.replace("ref_", "")
        : startParam.replace("r_", "");

      console.log(
        `🔗 Processing referral from user ${referrerId} for new user ${userId}`
      );
      console.log(
        `[DEBUG REFERRAL] StartParam: ${startParam}, RefererID: ${referrerId}, New User: ${userId}`
      );

      // Don't let users refer themselves
      if (referrerId === userId.toString()) {
        console.log("⚠️ User attempted to refer themselves");
        await sendTelegramMessage(userId, "❌ You cannot refer yourself!");
      } else {
        // Check if this user has already been referred (to prevent duplicate rewards)
        const { data: userData, error: userError } = await supabase
          .from("telegram_users")
          .select("referred_by")
          .eq("user_id", userId.toString())
          .single();

        console.log(
          "📊 User referred_by check:",
          JSON.stringify(userData),
          "Error:",
          userError ? userError.message : "none"
        );

        if (!userError) {
          if ((userData as any).referred_by) {
            console.log(
              `⚠️ User ${userId} was already referred by ${
                (userData as any).referred_by
              }`
            );
          } else {
            console.log("✅ New referral - updating user record");
            // First update the referred_by field in telegram_users
            const { error: updateError } = await supabase
              .from("telegram_users")
              .update({
                referred_by: referrerId,
                pending_referral_claim: true, // Flag to show the referral popup when they open the mini app
              })
              .eq("user_id", userId.toString());

            if (updateError) {
              console.error("❌ Error updating referred_by:", updateError);
              return false;
            }

            console.log("📝 Creating user_referrals record");
            console.log(
              `[DEBUG REFERRAL] Creating user_referrals record with referee_id=${userId}, referrer_id=${referrerId}`
            );

            // Check if we have an existing record first to absolutely prevent duplicates
            const { data: existingRecord } = await supabase
              .from("user_referrals")
              .select("*")
              .eq("referee_id", userId.toString())
              .eq("referrer_id", referrerId)
              .maybeSingle();

            if (existingRecord) {
              console.log(
                `[DEBUG REFERRAL] Found existing referral record, skipping creation: ${JSON.stringify(
                  existingRecord
                )}`
              );
            } else {
              // Then create a record in the user_referrals table
              const { error: referralError } = await supabase
                .from("user_referrals")
                .insert({
                  referrer_id: referrerId,
                  referee_id: userId.toString(),
                  reward_amount: 50000,
                  reward_claimed: false, // Changed to false - reward will be claimed when referred user claims their reward
                  reward_claimed_at: null, // Set to null since it's not claimed yet
                  referee_reward_amount: 50000,
                  referee_reward_claimed: false,
                });

              if (referralError) {
                console.error("⚠️ Error recording referral:", referralError);
                // If this fails, we should still continue as the referred_by field was set
              }
            }

            // ----------------------------------------------------
            // IMPORTANT: Let's check if there's any code here trying to update the referrer's
            // game state with 10000 coins which might be causing our issue
            // ----------------------------------------------------
            console.log(
              "[DEBUG REFERRAL] Checking for any code trying to update referrer's game state here (should be NONE)"
            );

            // Check if there's any game state update happening here
            console.log(
              `[DEBUG REFERRAL] WE SHOULD NOT BE GIVING ANY REWARD YET TO REFERRER ${referrerId}`
            );

            // IMPORTANT: Verify that there's nothing here updating the referrer's game state
            // with a reward amount that might be misconfigured

            console.log(
              "✅ Referral link recorded successfully. Reward will be given when referred user claims their reward."
            );
            // Note: We removed the code that would update the referrer's game state here
            // The referrer will get their reward when the referred user claims their reward

            // Inform the user about successful referral
            console.log("✅ Referral processing completed successfully");
          }
        }
      }
    }

    // Send a welcome message with the keyboard
    // Update message to mention both formats of referral parameters
    const isReferral =
      startParam &&
      (startParam.startsWith("ref_") || startParam.startsWith("r_"));
    const welcomeMessage = isReferral
      ? `👋 Welcome to Phoenix Game! You've been referred by a friend. Click the <b>Play Game</b> button below to start playing and claim your referral bonus!`
      : `👋 Welcome to Phoenix Game! Click the <b>Play Game</b> button below to start.`;

    console.log("📩 Sending welcome message");
    await sendTelegramMessage(userId, welcomeMessage);
    console.log("⌨️ Sending custom keyboard");
    await sendCustomKeyboard(userId);

    console.log("🏁 handleStartCommand completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Error handling start command:", error);
    await sendTelegramMessage(
      userId,
      "Sorry, there was an error processing your request. Please try again later."
    );
    return false;
  }
};

export const saveGameProgress = async (
  userId: string,
  gameState: TelegramGameState
): Promise<boolean> => {
  try {
    if (!supabase) {
      console.error("Supabase client not available");
      return false;
    }

    const { error } = await supabase
      .from("telegram_users")
      .update({
        game_state: gameState,
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

export const startPeriodicProgressUpdates = (
  userId: string,
  getGameState: () => TelegramGameState,
  interval: number = 30000 // Reduced to 30 seconds for more frequent updates
): (() => void) => {
  // Initial save when starting periodic updates
  const initialSave = async () => {
    try {
      const currentState = getGameState();
      if (
        currentState.autoTapActive ||
        currentState.application_state?.isAutotapPurchased
      ) {
        await updateTelegramUserProgress(userId, currentState);
      }
    } catch (error) {
      console.error("Error in initial progress save:", error);
    }
  };
  initialSave();

  // Set up visibility change handler
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      // Save state immediately when app is being closed/hidden
      const currentState = getGameState();
      updateTelegramUserProgress(userId, currentState).catch((error) => {
        console.error("Error saving state on app hide:", error);
      });
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Regular interval updates
  const intervalId = setInterval(async () => {
    try {
      const currentState = getGameState();
      // Always update if autotap is active or purchased
      if (
        currentState.autoTapActive ||
        currentState.application_state?.isAutotapPurchased
      ) {
        await updateTelegramUserProgress(userId, currentState);
      }
    } catch (error) {
      console.error("Error in periodic progress update:", error);
    }
  }, interval);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    // Final save when cleaning up
    const finalState = getGameState();
    updateTelegramUserProgress(userId, finalState).catch((error) => {
      console.error("Error in final state save:", error);
    });
  };
};
