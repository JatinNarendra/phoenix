import { supabase } from "@/lib/supabase";
import {
  Customer,
  CustomerSocialLink,
  PlatformType,
  ServiceType,
} from "@/app/types/Customer";
import { getPlatformName } from "../platformUtils";

export async function getCustomerWithSocialLinks(customerId: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      customer_social_links (*)
    `
    )
    .eq("id", customerId)
    .single();

  if (error) throw error;

  const socialTasks = await getAggregatedSocialTasks(customerId);

  return {
    ...data,
    socialTasks,
  } as Customer;
}

export async function updateCustomerSocialTask(
  customerId: string,
  platform: PlatformType,
  updates: {
    enabled?: boolean;
    engagements?: {
      views?: number;
    };
    type?: ServiceType;
  }
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { error } = await supabase
    .from("customer_social_links")
    .update({
      enabled: updates.enabled,
      engagements: {
        views: updates.engagements?.views || 0,
      },
      type: updates.type,
    })
    .eq("customer_id", customerId)
    .eq("platform", platform);

  if (error) throw error;
  return getAggregatedSocialTasks(customerId);
}

export async function getAggregatedSocialTasks(customerId: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  const { data: links, error } = await supabase
    .from("customer_social_links")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const socialTasks = links.reduce((acc, link) => {
    if (!acc[link.platform]) {
      acc[link.platform] = {
        enabled: link.enabled,
        links: [],
        clicks: 0,
        type: link.type,
        engagements: {
          views: link.engagements?.views || 0,
        },
        linkStatuses: {},
      };
    }

    acc[link.platform].links.push({
      id: link.id,
      enabled: link.enabled,
      link_url: link.link_url,
      platform: link.platform,
      type: link.type,
      engagements: {
        views: link.engagements?.views || 0,
      },
    });

    acc[link.platform].clicks += link.clicks || 0;
    acc[link.platform].engagements.views += link.engagements?.views || 0;

    return acc;
  }, {});

  return socialTasks;
}

export async function updateCustomerWebsiteTasks(
  customerId: string,
  updates: {
    enabled?: boolean;
    links?: string[];
    clicks?: number;
  }
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("website_tasks")
    .eq("id", customerId)
    .single();

  if (fetchError) throw fetchError;

  const updatedWebsiteTasks = {
    ...customer.website_tasks,
    ...updates,
  };

  const { error: updateError } = await supabase
    .from("customers")
    .update({
      website_tasks: updatedWebsiteTasks,
    })
    .eq("id", customerId);

  if (updateError) throw updateError;

  return updatedWebsiteTasks;
}

export async function incrementTaskClicks(
  customerId: string,
  platform: PlatformType,
  isWebsite: boolean = false
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  try {
    if (isWebsite) {
      const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("website_tasks")
        .eq("id", customerId)
        .single();

      if (fetchError) throw fetchError;

      const updatedTasks = {
        ...customer.website_tasks,
        clicks: (customer.website_tasks?.clicks || 0) + 1,
      };

      const { error } = await supabase
        .from("customers")
        .update({ website_tasks: updatedTasks })
        .eq("id", customerId);

      if (error) throw error;
      return updatedTasks;
    } else {
      const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("social_tasks")
        .eq("id", customerId)
        .single();

      if (fetchError) throw fetchError;

      const updatedTasks = {
        ...customer.social_tasks,
        [platform]: {
          ...customer.social_tasks[platform],
          clicks: (customer.social_tasks[platform]?.clicks || 0) + 1,
        },
      };

      const { error } = await supabase
        .from("customers")
        .update({ social_tasks: updatedTasks })
        .eq("id", customerId);

      if (error) throw error;
      return updatedTasks;
    }
  } catch (error) {
    console.error("Error incrementing clicks:", error);
    throw error;
  }
}

export async function addCustomerSocialLink(
  customerId: string,
  platform: PlatformType,
  linkUrl: string,
  type: ServiceType,
  isPrimary: boolean = false
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const platformName = getPlatformName(platform);

  const { data, error } = await supabase
    .from("customer_social_links")
    .insert({
      customer_id: customerId,
      platform,
      platform_name: platformName,
      link_url: linkUrl,
      type,
      is_primary: isPrimary,
      enabled: true,
      clicks: 0,
      engagements: {
        views: 0,
      },
      rewards: {
        coins: 0,
        spins: 0,
      },
      task_requirements: {
        verification_type: "AUTOMATIC",
        required_duration_seconds: 0,
        required_engagement_count: 0,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomerSocialLinks(
  customerId: string
): Promise<CustomerSocialLink[]> {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { data, error } = await supabase
    .from("customer_social_links")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map(mapDatabaseSocialLinkToCustomerSocialLink);
}

export async function updateCustomerSocialLink(
  linkId: string,
  updates: Partial<CustomerSocialLink>
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const { error } = await supabase
    .from("customer_social_links")
    .update({
      platform: updates.platform,
      platform_name: updates.platform_name,
      link_url: updates.link_url,
      is_primary: updates.is_primary,
      enabled: updates.enabled,
      clicks: updates.clicks,
      type: updates.type,
      rewards: updates.rewards,
      task_requirements: updates.task_requirements,
    })
    .eq("id", linkId);

  if (error) throw error;
}

interface DatabaseSocialLink {
  id: string;
  customer_id: string;
  platform: PlatformType;
  platform_name: string;
  link_url: string;
  is_primary: boolean;
  enabled: boolean;
  clicks: number;
  type: ServiceType;
  rewards: {
    coins: number;
    spins: number;
  };
  task_requirements: {
    verification_type: "AUTOMATIC" | "MANUAL";
    required_duration_seconds: number;
    required_engagement_count: number;
  };
  created_at: string;
  updated_at: string;
}

function mapDatabaseSocialLinkToCustomerSocialLink(
  dbLink: DatabaseSocialLink
): CustomerSocialLink {
  return {
    id: dbLink.id,
    customer_id: dbLink.customer_id,
    platform: dbLink.platform,
    platform_name: dbLink.platform_name,
    link_url: dbLink.link_url,
    is_primary: dbLink.is_primary,
    enabled: dbLink.enabled,
    clicks: dbLink.clicks,
    type: dbLink.type || "LINK_VISITOR",
    rewards: dbLink.rewards,
    task_requirements: dbLink.task_requirements,
    createdAt: new Date(dbLink.created_at),
    updatedAt: new Date(dbLink.updated_at),
  };
}

interface SocialTaskAccumulator {
  [platform: string]: {
    enabled: boolean;
    links: string[];
    clicks: number;
    type: ServiceType;
    engagements: {
      views: number;
    };
    linkStatuses: {
      [key: number]: {
        enabled: boolean;
        clicks: number;
      };
    };
  };
}

export async function getCustomerSocialTasks(customerName: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  const { data, error } = await supabase
    .from("customer_social_links")
    .select("*")
    .eq("customer_name", customerName)
    .order("display_order", { ascending: true });

  if (error) throw error;

  // Group by platform with proper typing
  const tasksByPlatform = data.reduce<SocialTaskAccumulator>((acc, link) => {
    if (!acc[link.platform]) {
      acc[link.platform] = {
        enabled: link.enabled,
        links: [],
        clicks: 0,
        type: link.type,
        engagements: {
          views: link.engagements?.views || 0,
        },
        linkStatuses: {},
      };
    }

    acc[link.platform].links.push(link.link_url);
    acc[link.platform].clicks += link.clicks || 0;
    acc[link.platform].linkStatuses[acc[link.platform].links.length - 1] = {
      enabled: link.enabled,
      clicks: link.clicks || 0,
    };

    // Aggregate engagements
    acc[link.platform].engagements.views += link.engagements?.views || 0;

    return acc;
  }, {});

  return tasksByPlatform;
}

export async function getAllTasks(customerId: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  const { data: tasks, error } = await supabase
    .from("customer_social_links")
    .select(
      `
      *,
      customers (
        customer_name
      )
    `
    )
    .eq("customer_id", customerId);

  if (error) throw error;
  return tasks;
}

export async function getCustomerByName(customerName: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_name")
    .eq("customer_name", customerName)
    .single();

  if (error) throw error;
  return data;
}

export async function getPlatformMemberGrowth(platform: PlatformType) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    const { data: links, error } = await supabase
      .from("customer_social_links")
      .select("completion_status")
      .eq("platform", platform);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!links || links.length === 0) {
      return 0;
    }

    const uniqueUsers = new Set<string>();
    links.forEach((link) => {
      if (link.completion_status?.completed_by) {
        link.completion_status.completed_by.forEach((userId: string) => {
          uniqueUsers.add(userId);
        });
      }
    });

    return uniqueUsers.size;
  } catch (error) {
    console.error(`Error in getPlatformMemberGrowth for ${platform}:`, error);
    return 0;
  }
}

export async function incrementLinkClicks(linkId: string, userId: string) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    // Get current clicks data
    const { data: task, error: fetchError } = await supabase
      .from("customer_social_links")
      .select("clicks")
      .eq("id", linkId)
      .single();

    if (fetchError) throw fetchError;

    // Prepare the clicks data - either use existing JSONB array or create new one
    let clicksData = task.clicks || [];

    // Check if clicks is a valid JSONB array, if not, initialize it
    if (!Array.isArray(clicksData)) {
      clicksData = [];
    }

    // Add user ID to clicks array if not already present
    if (!clicksData.includes(userId)) {
      clicksData.push(userId);

      // Update the task in the database
      const { error: updateError } = await supabase
        .from("customer_social_links")
        .update({ clicks: clicksData })
        .eq("id", linkId);

      if (updateError) throw updateError;
    }

    return clicksData.length; // Return the updated count
  } catch (error) {
    console.error("Error incrementing link clicks:", error);
    throw error;
  }
}

export async function handleLinkClickAndCompletion(
  linkId: string,
  userId: string
) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  try {
    // Get the current completion status
    const { data: task, error: taskError } = await supabase
      .from("customer_social_links")
      .select("completion_status, clicks")
      .eq("id", linkId)
      .single();

    if (taskError) throw taskError;

    // Initialize completion_status if it doesn't exist
    const currentCompletionStatus = task.completion_status || {
      completed_at: null,
      completed_by: [],
    };

    // Update completion_status with the new user ID and timestamp
    const updatedCompletionStatus = {
      completed_at: new Date().toISOString(),
      completed_by: [
        ...new Set([...(currentCompletionStatus.completed_by || []), userId]),
      ],
    };

    // Prepare the clicks data - either use existing JSONB array or create new one
    let clicksData = task.clicks || [];

    // Check if clicks is a valid JSONB array, if not, initialize it
    if (!Array.isArray(clicksData)) {
      clicksData = [];
    }

    // Add user ID to clicks array if not already present
    if (!clicksData.includes(userId)) {
      clicksData.push(userId);
    }

    // Update the task in the database
    const { error: updateTaskError } = await supabase
      .from("customer_social_links")
      .update({
        completion_status: updatedCompletionStatus,
        clicks: clicksData,
      })
      .eq("id", linkId);

    if (updateTaskError) throw updateTaskError;

    return true;
  } catch (error) {
    console.error("Error in handleLinkClickAndCompletion:", error);
    throw error;
  }
}

export async function getPlatformChannelFollowers(platform: PlatformType) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    const { data: completions, error } = await supabase
      .from("user_task_completions")
      .select("task_id, user_id")
      .eq("platform", platform)
      .eq("verification_status", "COMPLETED");

    if (error) throw error;

    if (!completions || completions.length === 0) return 0;

    // Count unique users who completed tasks for this platform
    const uniqueUsers = new Set(completions.map((c) => c.user_id)).size;
    return uniqueUsers;
  } catch (error) {
    console.error(
      `Error in getPlatformChannelFollowers for ${platform}:`,
      error
    );
    return 0;
  }
}

export async function getPlatformViews(platform: PlatformType) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    const { data: completions, error } = await supabase
      .from("user_task_completions")
      .select("task_id, user_id")
      .eq("platform", platform)
      .eq("verification_status", "COMPLETED");

    if (error) throw error;

    // Return total number of task completions for this platform
    return completions?.length || 0;
  } catch (error) {
    console.error(`Error in getPlatformViews for ${platform}:`, error);
    return 0;
  }
}

export async function getPlatformFollowers(platform: PlatformType) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    const { data: completions, error } = await supabase
      .from("user_task_completions")
      .select("task_id, user_id")
      .eq("platform", platform)
      .eq("verification_status", "COMPLETED");

    if (error) throw error;

    if (!completions || completions.length === 0) return 0;

    // Count unique users who completed tasks for this platform
    const uniqueUsers = new Set(completions.map((c) => c.user_id)).size;
    return uniqueUsers;
  } catch (error) {
    console.error(`Error in getPlatformFollowers for ${platform}:`, error);
    return 0;
  }
}

export async function getPlatformSubscribers(platform: PlatformType) {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }
  try {
    const { data: completions, error } = await supabase
      .from("user_task_completions")
      .select("task_id, user_id")
      .eq("platform", platform)
      .eq("verification_status", "COMPLETED");

    if (error) throw error;

    if (!completions || completions.length === 0) return 0;

    // Count unique users who completed tasks for this platform
    const uniqueUsers = new Set(completions.map((c) => c.user_id)).size;
    return uniqueUsers;
  } catch (error) {
    console.error(`Error in getPlatformSubscribers for ${platform}:`, error);
    return 0;
  }
}
