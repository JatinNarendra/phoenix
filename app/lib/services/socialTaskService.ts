import { supabase } from "@/lib/supabase";
import { Customer, PlatformType, ServiceType } from "@/app/types/Customer";
import { getAggregatedSocialTasks } from "../supabase/queries";
import { getPlatformName } from "../platformUtils";

export async function createSocialTask(
  customer_id: Customer["id"],
  customer_name: Customer["customer_name"],
  platform: PlatformType,
  linkUrl: string,
  type: ServiceType,
  enabled: boolean
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { error } = await supabase
    .from("customer_social_links")
    .insert({
      customer_id,
      customer_name,
      platform,
      platform_name: getPlatformName(platform),
      link_url: linkUrl,
      type,
      enabled,
      clicks: [],
      engagements: {
        views: 0,
      },
      rewards: {
        coins: 0,
        spins: 0,
      },
      completion_status: {
        completed_at: null,
        completed_by: [],
      },
      task_requirements: {
        verification_type: "AUTOMATIC",
        required_duration_seconds: 0,
        required_engagement_count: 0,
      },
    })
    .select();

  if (error) throw error;

  // Return updated aggregated tasks
  return getAggregatedSocialTasks(customer_id);
}

export async function updateSocialTask(
  customer_id: Customer["id"],
  customer_name: Customer["customer_name"],
  taskId: string,
  updates: {
    linkUrl?: string;
    enabled?: boolean;
    type?: ServiceType;
    engagements?: {
      views?: number;
    };
  }
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { error } = await supabase
    .from("customer_social_links")
    .update({
      link_url: updates.linkUrl,
      customer_name: customer_name,
      enabled: updates.enabled,
      type: updates.type,
      engagements: {
        views: updates.engagements?.views || 0,
      },
    })
    .eq("id", taskId)
    .eq("customer_id", customer_id);

  if (error) throw error;

  return getAggregatedSocialTasks(customer_id);
}

export async function deleteSocialTask(customerId: string, taskId: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { error } = await supabase
    .from("customer_social_links")
    .delete()
    .eq("id", taskId)
    .eq("customer_id", customerId);

  if (error) throw error;

  return getAggregatedSocialTasks(customerId);
}
