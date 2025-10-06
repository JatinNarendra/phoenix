import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { getBotUrl } from "@/app/lib/telegram";

// This endpoint will directly execute SQL to update referrer coins
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection not configured" },
        { status: 500 }
      );
    }

    const {
      query,
      userId,
      amount,
      operation,
      updateGameState = true,
      incrementReferrals = false,
      updateOnlyGameState = false,
    } = await request.json();

    console.log(`[API DEBUG] Request params:`, {
      operation,
      userId,
      amount,
      updateGameState,
      incrementReferrals,
      updateOnlyGameState,
    });

    if (operation === "add_coins" && userId && amount) {
      console.log(
        `API: Adding ${amount} coins to user ${userId} with updateGameState=${updateGameState}, updateOnlyGameState=${updateOnlyGameState}`
      );

      // First get the current game state
      const { data, error } = await supabase
        .from("telegram_users")
        .select("game_state, coins, total_coins")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("API: Error fetching user data:", error);
        return NextResponse.json(
          { error: "Failed to fetch user data" },
          { status: 500 }
        );
      }

      console.log(`[API DEBUG] Retrieved current state for ${userId}:`, {
        currentDBCoins: data?.coins,
        currentDBTotalCoins: data?.total_coins,
        currentGameStateCoins: data?.game_state?.coins,
        currentGameStateTotalCoins: data?.game_state?.totalCoins,
        currentReferralData: data?.game_state?.referral,
        amountToAdd: amount,
        amountToAddType: typeof amount,
      });

      // Parse current values
      const currentCoins = parseInt(data?.coins?.toString() || "0", 10);
      const currentTotalCoins = parseInt(
        data?.total_coins?.toString() || "0",
        10
      );
      const gameState = data.game_state || {};

      // Make sure we parse as numbers for game state values
      const gameStateCoins = parseInt(gameState.coins?.toString() || "0", 10);
      const gameStateTotalCoins = parseInt(
        gameState.totalCoins?.toString() || "0",
        10
      );

      // Make sure amount is properly parsed as a number
      const parsedAmount =
        typeof amount === "string" ? parseInt(amount, 10) : amount;

      console.log(`[API DEBUG] Parsed values:`, {
        currentCoins,
        currentTotalCoins,
        gameStateCoins,
        gameStateTotalCoins,
        parsedAmount,
        originalAmount: amount,
      });

      // Update the record columns only if not explicitly told to only update game_state
      if (!updateOnlyGameState) {
        const { error: updateError } = await supabase
          .from("telegram_users")
          .update({
            coins: currentCoins + parsedAmount,
            total_coins: currentTotalCoins + parsedAmount,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("API: Error updating coins columns:", updateError);
          return NextResponse.json(
            { error: "Failed to update coins columns" },
            { status: 500 }
          );
        }

        console.log(`[API DEBUG] Updated column values:`, {
          newCoinsColumn: currentCoins + parsedAmount,
          newTotalCoinsColumn: currentTotalCoins + parsedAmount,
        });
      }

      // Update the game state
      if (updateGameState) {
        // Update coins in game state
        const updatedGameStateCoins = gameStateCoins + parsedAmount;
        const updatedGameStateTotalCoins = gameStateTotalCoins + parsedAmount;

        gameState.coins = updatedGameStateCoins;
        gameState.totalCoins = updatedGameStateTotalCoins;

        console.log(`[API DEBUG] Updating game state coins:`, {
          oldGameStateCoins: gameStateCoins,
          newGameStateCoins: updatedGameStateCoins,
          oldGameStateTotalCoins: gameStateTotalCoins,
          newGameStateTotalCoins: updatedGameStateTotalCoins,
        });

        // Also update referral data if it exists
        if (gameState.referral) {
          const currentReferredFriends = parseInt(
            gameState.referral.referredFriends?.toString() || "0",
            10
          );
          const currentTotalRewards = parseInt(
            gameState.referral.totalRewards?.toString() || "0",
            10
          );

          console.log(`[API DEBUG] Current referral data:`, {
            currentReferredFriends,
            currentTotalRewards,
            incrementReferrals,
          });

          // Only increment referredFriends if explicitly requested
          if (incrementReferrals) {
            gameState.referral.referredFriends = currentReferredFriends + 1;
          }
          gameState.referral.totalRewards = currentTotalRewards + parsedAmount;

          console.log(`[API DEBUG] Updated referral data:`, {
            newReferredFriends: gameState.referral.referredFriends,
            newTotalRewards: gameState.referral.totalRewards,
          });
        } else if (incrementReferrals) {
          // Only create referral data if we're incrementing referrals
          gameState.referral = {
            inviteLink: `${getBotUrl()}?startapp=r_${userId}`,
            referredFriends: 1,
            totalRewards: parsedAmount,
          };

          console.log(
            `[API DEBUG] Created new referral data:`,
            gameState.referral
          );
        }

        // Save updated game state
        const { error: updateError } = await supabase
          .from("telegram_users")
          .update({
            game_state: gameState,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("API: Error updating game state:", updateError);
          return NextResponse.json(
            { error: "Failed to update game state" },
            { status: 500 }
          );
        }

        // Double-check the update was successful
        const { data: verifyData, error: verifyError } = await supabase
          .from("telegram_users")
          .select("game_state, coins, total_coins")
          .eq("user_id", userId)
          .single();

        if (!verifyError) {
          console.log(`[API DEBUG] Verification of update:`, {
            verifiedGameStateCoins: verifyData?.game_state?.coins,
            verifiedGameStateTotalCoins: verifyData?.game_state?.totalCoins,
            verifiedCoinsColumn: verifyData?.coins,
            verifiedTotalCoinsColumn: verifyData?.total_coins,
            verifiedReferralData: verifyData?.game_state?.referral,
          });
        }
      }

      console.log(
        `API: Successfully updated user ${userId} with ${parsedAmount} coins (onlyGameState=${updateOnlyGameState})`
      );

      return NextResponse.json({
        success: true,
        message: `Updated user ${userId} with ${parsedAmount} coins`,
        oldCoins: gameStateCoins,
        newCoins: gameStateCoins + parsedAmount,
        gameStateUpdated: updateGameState,
        columnsUpdated: !updateOnlyGameState,
      });
    }

    // For direct SQL execution
    if (query) {
      console.log(`[API DEBUG] Executing SQL query:`, query);
      const { data, error } = await supabase.rpc("execute_sql", {
        sql_query: query,
      });

      if (error) {
        console.error("API: Error executing SQL:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { error: "No valid operation specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("API: Error executing update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
