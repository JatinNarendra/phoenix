import { supabase } from "@/lib/supabase";

export type ServiceType =
  | "TELEGRAM_CHANNEL"
  | "TELEGRAM_GROUP"
  | "YOUTUBE_SUBSCRIBERS"
  | "YOUTUBE_VIEWS"
  | "X"
  | "DISCORD"
  | "X_RETWEET";

export interface SocialTaskConfig {
  enabled: boolean;
  clicks: number;
  links: string[];
  metrics?: {
    followers?: number;
    subscribers?: number;
    views?: number;
    watchTime?: number;
    messages?: number;
    retweets?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    members?: number;
    activeUsers?: number;
  };
  type: ServiceType;
  linkStatuses?: {
    [key: number]: {
      enabled: boolean;
      clicks: number;
    };
  };
}

export interface WebsiteTaskConfig {
  enabled: boolean;
  links: string[];
  clicks: number;
}

export type PlatformType =
  | "TELEGRAM_CHANNEL"
  | "TELEGRAM_GROUP"
  | "X"
  | "YOUTUBE_VIEWS"
  | "YOUTUBE_SUBSCRIBERS"
  | "DISCORD"
  | "X_RETWEET";

export interface TaskRewards {
  coins: number;
  spins: number;
}

export interface CompletionStatus {
  is_completed: boolean;
  completed_at: string | null;
  verification_status: "PENDING" | "VERIFIED" | "FAILED";
  completed_by?: string[];
}

export interface TaskRequirements {
  verification_type: "AUTOMATIC" | "MANUAL";
  required_duration_seconds: number;
  required_engagement_count: number;
}

export interface CustomerSocialLink {
  id: string;
  customer_id: string;
  platform: PlatformType;
  platform_name: string;
  link_url: string;
  is_primary: boolean;
  enabled: boolean;
  clicks: number;
  type: ServiceType;

  rewards: TaskRewards;
  task_requirements: TaskRequirements;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  customer_name: string;
  logo_url: string | null;
  slug: string;
  email: string | null;
  campaign_name?: string;
  campaign_details?: string;
  campaign_sparks?: number;
  campaign_spins?: number;
  socialTasks: {
    [platform: string]: {
      enabled: boolean;
      links: SocialTaskLink[];
      clicks: number;
      linkStatuses?: { [index: number]: { enabled: boolean; clicks: number } };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerSocialTaskKey = keyof Customer["socialTasks"];

export interface CustomerSocialTaskUpdate {
  enabled?: boolean;
  links?: string[];
  clicks?: number;
  type?: ServiceType;
}

export interface DatabaseSocialLink {
  id: string;
  customer_id: string;
  customer_name: string;
  platform: PlatformType;
  platform_name: string;
  link_url: string;
  is_primary: boolean;
  enabled: boolean;
  clicks: number;
  type: ServiceType;

  created_at: string;
  updated_at: string;
  rewards: TaskRewards;
  task_requirements: TaskRequirements;
}

export interface SpecialTask {
  id: string;
  customerId: string;
  customerName: string;
  platform: PlatformType;
  platform_name: string;
  linkUrl: string;
  link_url?: string;
  coins: number;
  spins: number;
  completed: boolean;
  type: ServiceType;
  isPrimary: boolean;
  isEnabled: boolean;
  clicks: number;
  engagements?: {
    views: number;
    follows: number;
    shares: number;
  };
}

export interface CampaignTask {
  id: string;
  customerId: string;
  platform: PlatformType;
  platform_name: string;
  linkUrl: string;
  link_url?: string;
  coins: number;
  spins: number;
  completed: boolean;
  type: ServiceType;
  taskType: "campaign";
}

export interface SocialTaskData {
  telegram: {
    channelData: TelegramChannelData[];
    groupData: TelegramGroupData[];
  };
  youtube: {
    subscriberData: YoutubeSubscriberData[];
    videoData: YoutubeVideoData[];
  };
  x: {
    twitterData: TwitterData[];
  };
}

interface TelegramChannelData {
  id: string;
  channelName: string;
  followers: number;
  action: string;
}

interface TelegramGroupData {
  id: string;
  groupName: string;
  users: number;
  action: string;
}

interface TwitterData {
  id: string;
  handle: string;
  followers: number;
  action: string;
}

interface YoutubeSubscriberData {
  id: string;
  channelName: string;
  subscribers: number;
  action: string;
}

interface YoutubeVideoData {
  id: string;
  videoTitle: string;
  urlViews: number;
  action: string;
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

  // First get the current social_tasks
  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("social_tasks")
    .eq("id", customerId)
    .single();

  if (fetchError) throw fetchError;

  // Create the updated social_tasks object
  const updatedSocialTasks = {
    ...customer.social_tasks,
    [platform]: {
      ...customer.social_tasks?.[platform],
      ...updates,
    },
  };

  // Update with proper JSON object
  const { error } = await supabase
    .from("customers")
    .update({
      social_tasks: updatedSocialTasks,
    })
    .eq("id", customerId);

  if (error) throw error;

  return updatedSocialTasks;
}

export function validateSocialTasksStructure(
  socialTasks: Customer["socialTasks"]
): boolean {
  try {
    // Validate overall structure
    if (typeof socialTasks !== "object" || socialTasks === null) {
      return false;
    }

    // Validate each platform entry
    for (const [config] of Object.entries(socialTasks)) {
      if (!config || typeof config !== "object") {
        return false;
      }

      // Check required properties
      const required = ["enabled", "links", "clicks", "engagements"];
      if (!required.every((prop) => prop in config)) {
        return false;
      }

      // Validate engagements structure
      const { engagements } = config;
      if (
        !engagements ||
        typeof engagements !== "object" ||
        !["views"].every((prop) => typeof engagements[prop] === "number")
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Add type guard
export const isPlatformType = (value: string): value is PlatformType => {
  return [
    "TELEGRAM_CHANNEL",
    "TELEGRAM_GROUP",
    "X",
    "YOUTUBE_VIEWS",
    "YOUTUBE_SUBSCRIBERS",
    "DISCORD",
    "X_RETWEET",
  ].includes(value);
};

export interface SocialTaskLink {
  id: string;
  enabled: boolean;
  link_url: string;
}

export interface GameState {
  userId: number;
  coins: number;
  spins: number;
  socialTasks: {
    [platform: string]: {
      completedTasks: string[];
      lastUpdated: number;
    };
  };
}

export interface TaskResponse {
  id: string;
  platform: PlatformType;
  linkUrl: string;
  isEnabled: boolean;
  type: ServiceType;
  isCompleted?: boolean;
  completedAt?: string | null;
  verificationStatus?: "PENDING" | "COMPLETED" | "FAILED";
  rewards?: TaskRewards;
}

export interface ApplicationState {
  has_visited_earn_page: boolean;
  isAutotapPurchased: boolean;
  // Add more application states here as needed
}
