import { PlatformType } from "../types/Customer";
import { supabase } from "@/lib/supabase";

export async function handleSocialTaskCompletion(
  userId: number,
  taskId: string,
  platform: PlatformType,
  coins: number = 0, 
  spins: number = 0
) {
  try {
    // Check Supabase connection
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Get the task details
    const { data: task, error: taskError } = await supabase
      .from("customer_social_links")
      .select("customer_id, engagements")
      .eq("id", taskId)
      .single();

    if (taskError) throw taskError;
    if (!task) throw new Error("Task not found");

    // Insert into user_task_completions table
    const { error: completionError } = await supabase
      .from("user_task_completions")
      .insert({
        user_id: userId.toString(),
        task_id: taskId,
        customer_id: task.customer_id,
        platform: platform,
        verification_status: "pending",
        created_at: new Date().toISOString()
      });

    if (completionError) throw completionError;

    // Update engagement metrics
    const updatedEngagements = {
      ...task.engagements,
      views: (task.engagements?.views || 0) + 1,
    };

    const { error: updateTaskError } = await supabase
      .from("customer_social_links")
      .update({
        engagements: updatedEngagements,
      })
      .eq("id", taskId);

    if (updateTaskError) throw updateTaskError;

    // If coins or spins are specified, update the user's game state
    if (coins > 0 || spins > 0) {
      // Get current user data
      const { data: userData, error: userError } = await supabase
        .from('telegram_users')
        .select('game_state')
        .eq('user_id', userId.toString())
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      // Calculate new values
      const currentCoins = userData.game_state?.coins || 0;
      const currentSpins = userData.game_state?.spins || 0;
      const updatedCoins = currentCoins + coins;
      const updatedSpins = currentSpins + spins;
      
      // Update the user's game state
      const updatedGameState = {
        ...userData.game_state,
        coins: updatedCoins,
        spins: updatedSpins,
        socialTasks: {
          ...userData.game_state.socialTasks,
          [platform]: {
            completedTasks: [
              ...(userData.game_state.socialTasks?.[platform]?.completedTasks || []),
              taskId
            ],
            lastUpdated: Date.now()
          }
        }
      };

      // Update in database
      const { error: updateUserError } = await supabase
        .from('telegram_users')
        .update({
          game_state: updatedGameState,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId.toString());

      if (updateUserError) throw updateUserError;
    }

    return true;
  } catch (error) {
    console.error("Error handling social task completion:", error);
    return false;
  }
}

export const handleTaskComplete = async (
  userId: number,
  taskId: string,
  platform: PlatformType,
  coins: number = 0,
  spins: number = 0
) => {
  const success = await handleSocialTaskCompletion(userId, taskId, platform, coins, spins);
  if (success) {
    // Show success message or update UI
  } else {
    // Handle error
  }
};
