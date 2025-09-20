// app/lib/taskCompletionUtils.ts
import { supabase } from "@/lib/supabase";
import { PlatformType } from "@/app/types/Customer";

export async function getTaskCompletionStatus(
  userId: string,
  taskId: string,
  platform: PlatformType
): Promise<boolean> {
  try {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Check new table first
    const { data: completion } = await supabase
      .from("user_task_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .single();

    if (completion) {
      return true;
    }

    // Fallback to old structure
    const { data: userData } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    return (
      userData?.game_state?.socialTasks?.[platform]?.completedTasks?.includes(
        taskId
      ) || false
    );
  } catch (error) {
    console.error("Error checking task completion:", error);
    return false;
  }
}

export async function markTaskAsCompleted(
  userId: string,
  taskId: string,
  platform: PlatformType,
  customerId: string,
  coins: number,
  spins: number
): Promise<boolean> {
  try {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    console.log("markTaskAsCompleted called with", {
      userId,
      taskId,
      platform,
      customerId,
      coins,
      spins,
    });

    // Check if there's a pending task attempt and it's been at least 30 seconds
    const { data: taskAttempt } = await supabase
      .from("user_task_completions")
      .select("created_at, verification_status")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("verification_status", "pending")
      .single();

    if (!taskAttempt) {
      console.error("No pending task attempt found");
      return false;
    }

    // Check if 30 seconds have passed since task attempt
    const attemptTime = new Date(taskAttempt.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - attemptTime;

    if (timeDiff < 30000) {
      // 30 seconds in milliseconds
      console.error("Task verification period not complete:", { timeDiff });
      return false;
    }

    // Start a Supabase transaction
    const { data: userData, error: userError } = await supabase
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", userId)
      .single();

    if (userError) throw userError;

    // Update task completion status
    const { error: completionError } = await supabase
      .from("user_task_completions")
      .update({
        verification_status: "verified",
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("verification_status", "pending");

    if (completionError) throw completionError;

    // Calculate the new values
    const currentCoins = userData.game_state?.coins || 0;
    const currentSpins = userData.game_state?.spins || 0;
    const updatedCoins = currentCoins + coins;
    const updatedSpins = currentSpins + spins;

    // Update old structure for backward compatibility
    const updatedGameState = {
      ...userData.game_state,
      coins: updatedCoins,
      spins: updatedSpins,
      socialTasks: {
        ...userData.game_state.socialTasks,
        [platform]: {
          completedTasks: [
            ...(userData.game_state.socialTasks?.[platform]?.completedTasks ||
              []),
            taskId,
          ],
          lastUpdated: Date.now(),
        },
      },
    };

    // Log the state before update
    console.log("Updating user state:", {
      oldCoins: currentCoins,
      newCoins: updatedCoins,
      oldSpins: currentSpins,
      newSpins: updatedSpins,
      rewardCoins: coins,
      rewardSpins: spins,
    });

    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error("Error marking task as completed:", error);
    return false;
  }
}
