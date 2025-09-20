import type React from "react";
import {
  FaTelegram,
  FaXTwitter,
  FaYoutube,
  FaSpinner,
  FaDiscord,
} from "react-icons/fa6";
import { PlatformType, ServiceType } from "@/app/types/Customer";
import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import {
  isYoutubePlatform,
  standardizePlatform,
  getPlatformDefaultAction,
} from "@/app/lib/platformUtils";

// Extend PlatformType to include YouTube types if not already included
type ExtendedPlatformType =
  | PlatformType
  | "YOUTUBE_SUBSCRIBERS"
  | "YOUTUBE_VIEWS";

// Update the TelegramData interface to handle both channel and group data
interface BaseTelegramData {
  id: string;
  action: string;
}

interface TelegramChannelData extends BaseTelegramData {
  channelName: string;
  followers: number;
}

interface TelegramGroupData extends BaseTelegramData {
  groupName: string;
  users: number;
}

interface TwitterData {
  id: string;
  user: string;
  followers: number;
  action: string;
}

interface YoutubeData {
  id: string;
  channelName?: string;
  subscribers?: number;
  videoTitle?: string;
  urlViews?: number;
  action: string;
}

interface DiscordData {
  id: string;
  server: string;
  members: number;
  action: string;
}

interface SocialTaskLink {
  id: string;
  enabled: boolean;
  link_url: string;
  platform: ExtendedPlatformType;
  platform_name?: string;
  type: ServiceType;
  action: string;
  completedCount?: number;
  completed_users_count?: number;
  created_at: number;
  total_completions?: number;
  customer_name?: string;
  is_primary?: boolean;
  engagements?: { views: number; follows: number; shares: number };
  clicks?: string[] | null;
}

interface ServicePerformanceCardProps {
  platformKey: string;
  platform: ExtendedPlatformType;
  data: {
    channelData?: TelegramChannelData[];
    groupData?: TelegramGroupData[];
    twitterData?: TwitterData[];
    subscriberData?: YoutubeData[];
    videoData?: YoutubeData[];
    discordData?: DiscordData[];
  };
  enabled: boolean;
  onToggle: (taskId: string) => Promise<void>;
  loading: string | null | boolean;
  headerLoading?: boolean;
  toggleEnabled?: boolean;
  customer?: {
    id: string;
    customer_name?: string;
    socialTasks?: {
      [key in ExtendedPlatformType]?: {
        links: SocialTaskLink[];
        enabled: boolean;
      };
    };
  };
}

const platformConfig = {
  TELEGRAM_CHANNEL: {
    icon: FaTelegram,
    color: "text-blue-500",
    bgGradient: "from-blue-50 to-blue-100",
  },
  TELEGRAM_GROUP: {
    icon: FaTelegram,
    color: "text-blue-500",
    bgGradient: "from-blue-50 to-blue-100",
  },
  X: {
    icon: FaXTwitter,
    color: "text-gray-900",
    bgGradient: "from-gray-50 to-gray-100",
  },
  X_RETWEET: {
    icon: FaXTwitter,
    color: "text-gray-900",
    bgGradient: "from-gray-50 to-gray-100",
  },
  YOUTUBE_SUBSCRIBERS: {
    icon: FaYoutube,
    color: "text-red-600",
    bgGradient: "from-red-50 to-red-100",
  },
  YOUTUBE_VIEWS: {
    icon: FaYoutube,
    color: "text-red-600",
    bgGradient: "from-red-50 to-red-100",
  },
  DISCORD: {
    icon: FaDiscord,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-purple-100",
  },
} as const;

// Generic type for table row data
interface TableRowData {
  id: string;
  channelName?: string;
  followers?: number;
  groupName?: string;
  users?: number;
  user?: string;
  videoTitle?: string;
  urlViews?: number;
  subscribers?: number;
  action: string;
}

// Helper component for table rendering with proper typing
const PerformanceTable = <T extends TableRowData>({
  headers,
  data,
  renderRow,
}: {
  headers: string[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
}) => (
  <div className="overflow-x-auto mb-4">
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th
              key={index}
              className="px-4 py-2 text-left text-sm font-medium text-gray-500"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white/50">
        {data.length > 0 ? (
          data.map((item, index) => renderRow(item, index))
        ) : (
          <tr>
            <td
              colSpan={headers.length}
              className="px-4 py-2 text-sm text-gray-500 text-center"
            >
              No data available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const platformDisplayNames = {
  TELEGRAM_CHANNEL: "Telegram",
  TELEGRAM_GROUP: "Telegram",
  X: "X",
  X_RETWEET: "X Retweet",
  YOUTUBE_SUBSCRIBERS: "Youtube",
  YOUTUBE_VIEWS: "Youtube",
  DISCORD: "Discord",
} as const;

// Update the ToggleButton component
const ToggleButton = ({
  taskId,
  isEnabled,
  loading,
  onToggle,
  toggleEnabled,
}: {
  taskId: string;
  isEnabled: boolean;
  loading: string | null;
  onToggle: () => void;
  toggleEnabled: boolean;
}) => {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center"
      disabled={!toggleEnabled || loading === taskId}
    >
      {loading === taskId ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-green-600" />
      ) : (
        <div className="flex items-center gap-2">
          <div
            className={`relative w-10 h-5 rounded-full transition-all duration-300 ease-in-out ${
              isEnabled ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
            {isEnabled && (
              <div className="absolute inset-0 rounded-full bg-green-500 opacity-25" />
            )}
          </div>
          <span
            className={`text-sm font-medium transition-colors duration-300 ${
              isEnabled ? "text-green-600" : "text-gray-400"
            }`}
          >
            {isEnabled ? "Online" : "Offline"}
          </span>
        </div>
      )}
    </button>
  );
};

// Define interface for database records
interface CustomerSocialLink {
  id: string;
  customer_id: string;
  customer_name?: string;
  link_url: string;
  platform: string;
  platform_name?: string;
  type: string;
  action?: string;
  enabled: boolean;
  is_primary?: boolean;
  clicks?: string[] | null;
  engagements?: { views: number; follows: number; shares: number };
  completion_status?: {
    completed_at: string | null;
    completed_by: string[];
    completed_count?: number;
    completed_users_count?: number;
    total_completions?: number;
  };
  completed_count?: number;
  completed_users_count?: number;
  total_completions?: number;
  created_at: number | string;
  updated_at?: string;
}

const ServicePerformanceCard: React.FC<ServicePerformanceCardProps> = ({
  platform,
  onToggle,
  loading,
  headerLoading,
  toggleEnabled,
  customer,
}) => {
  const [socialTasks, setSocialTasks] = useState<SocialTaskLink[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Supabase client
  const supabase = createClientComponentClient<Database>();

  // Fetch social link tasks directly from the database
  const fetchSocialLinkTasks = useCallback(async () => {
    if (!customer?.id || !isMounted) return;

    setIsLoading(true);

    try {
      console.log(
        "Fetching social link tasks for customer:",
        customer.id,
        "platform:",
        platform
      );

      // Print the platform string value to verify what we're getting
      console.log("Current platform as string:", String(platform));

      try {
        console.log("Attempting to query the database...");
        // Query the database for all social tasks regardless of platform
        const { data, error } = await supabase
          .from("customer_social_links")
          .select("*")
          .eq("customer_id", customer.id);

        if (error) {
          console.error("Database query error:", error);
          setIsLoading(false);
          return;
        }

        console.log("All customer social links:", data);

        // Handle specific platform filtering based on exact match
        let filteredData: CustomerSocialLink[] = [];

        if (platform === "TELEGRAM_CHANNEL" || platform === "TELEGRAM_GROUP") {
          console.log("Filtering for all Telegram tasks");
          // For Telegram platforms, get both CHANNEL and GROUP tasks regardless of which tab is selected
          filteredData = data.filter(
            (item) =>
              item.platform === "TELEGRAM_CHANNEL" ||
              item.platform === "TELEGRAM_GROUP" ||
              item.type === "TELEGRAM_CHANNEL" ||
              item.type === "TELEGRAM_GROUP" ||
              String(item.platform).toUpperCase().includes("TELEGRAM")
          );
          console.log("Found Telegram tasks:", filteredData);
        } else if (platform === "X" && data) {
          console.log("Filtering for X tasks");
          // Filter for both X and Twitter to be inclusive
          filteredData = data.filter(
            (item) =>
              item.platform === "X" ||
              String(item.platform).toUpperCase() === "TWITTER" ||
              String(item.type).toUpperCase() === "X" ||
              String(item.type).toUpperCase() === "TWITTER"
          );
          console.log("Found X tasks:", filteredData);
        } else if ((platform as string) === "YOUTUBE_SUBSCRIBERS" && data) {
          console.log("Filtering for YOUTUBE_SUBSCRIBERS tasks");
          // Use the utility function for consistent filtering
          filteredData = data.filter(
            (item) =>
              isYoutubePlatform(item.platform) || isYoutubePlatform(item.type)
          );
          console.log("Found YOUTUBE_SUBSCRIBERS tasks:", filteredData);
        } else if ((platform as string) === "YOUTUBE_VIEWS" && data) {
          console.log("Filtering for YOUTUBE_VIEWS tasks");
          // Use the utility function for consistent filtering
          filteredData = data.filter(
            (item) =>
              isYoutubePlatform(item.platform) || isYoutubePlatform(item.type)
          );
          console.log("Found YOUTUBE_VIEWS tasks:", filteredData);
        } else if (
          (platform as string).toUpperCase().includes("YOUTUBE") &&
          data
        ) {
          console.log("Filtering for any YouTube tasks");
          // Get all YouTube-related tasks regardless of specific type
          filteredData = data.filter(
            (item) =>
              isYoutubePlatform(item.platform) || isYoutubePlatform(item.type)
          );
          console.log("Found YouTube tasks:", filteredData);
        } else if (platform === "DISCORD" && data) {
          console.log("Filtering for Discord tasks");
          filteredData = data.filter(
            (item) =>
              item.platform === "DISCORD" ||
              String(item.platform).toUpperCase() === "DISCORD" ||
              String(item.type).toUpperCase() === "DISCORD"
          );
          console.log("Found Discord tasks:", filteredData);
        }

        console.log("Filtered tasks:", filteredData);

        // Transform data to match SocialTaskLink interface
        const transformedData: SocialTaskLink[] = filteredData.map(
          (item: CustomerSocialLink) => {
            // Standardize the platform value
            const standardizedPlatform = standardizePlatform(item.platform);

            return {
              id: item.id,
              enabled: item.enabled || false,
              link_url: item.link_url,
              platform: standardizedPlatform as ExtendedPlatformType,
              platform_name: item.platform_name,
              type: item.type as ServiceType,
              action:
                item.action || getPlatformDefaultAction(standardizedPlatform),
              completedCount: item.completed_count,
              completed_users_count:
                item.completed_users_count ||
                item.completion_status?.completed_users_count ||
                0,
              created_at:
                typeof item.created_at === "string"
                  ? Date.parse(item.created_at)
                  : item.created_at || 0,
              total_completions:
                item.total_completions ||
                item.completion_status?.total_completions ||
                0,
              customer_name: item.customer_name,
              is_primary: item.is_primary,
              engagements: item.engagements,
              clicks: item.clicks,
            };
          }
        );

        // Sort tasks by creation date
        const sortedTasks = transformedData.sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0)
        );

        console.log("Final sorted tasks:", sortedTasks);
        setSocialTasks(sortedTasks);

        // Debug counts by platform for easier troubleshooting
        const platformCounts: Record<string, number> = {};
        sortedTasks.forEach((task) => {
          const platform = String(task.platform);
          platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        console.log("Task counts by platform:", platformCounts);
      } catch (error) {
        console.error("Error in database query:", error);
      }
    } catch (error) {
      console.error("Error in fetchSocialLinkTasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [customer?.id, platform, isMounted, supabase]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    fetchSocialLinkTasks();
  }, [fetchSocialLinkTasks]);

  // Memoize toggle button handler
  const renderToggleButton = useCallback(
    (taskId: string) => {
      const enabled =
        socialTasks.find((task) => task.id === taskId)?.enabled ?? false;
      return (
        <ToggleButton
          taskId={taskId}
          isEnabled={enabled}
          loading={loading as string | null}
          onToggle={() => onToggle(taskId)}
          toggleEnabled={toggleEnabled || false}
        />
      );
    },
    [socialTasks, loading, onToggle, toggleEnabled]
  );

  // Memoize completed users count calculation
  const getCompletedUsersCount = useCallback((task: SocialTaskLink) => {
    // Check if clicks array exists and return its length
    if (task.clicks && Array.isArray(task.clicks)) {
      return task.clicks.length;
    }
    // Fallback to previous values for backward compatibility
    return task.completed_users_count || task.completedCount || 0;
  }, []);

  const renderTelegramTables = () => {
    // Log all available tasks and platform values
    console.log("All available tasks:", socialTasks);

    // Get raw platform values for debugging
    const rawPlatforms = socialTasks.map((task) => task.platform);
    console.log("Raw platform values:", rawPlatforms);

    // For Telegram, we need to check if we have ANY Telegram tasks at all
    // So instead of only filtering for the current platform, we need to get all Telegram tasks

    // Fetch ALL tasks directly from customer
    if (customer?.id) {
      console.log("Getting Telegram tasks for customer:", customer.id);
      // We'll show all Telegram-related tasks, regardless of which tab is selected
    }

    // Get all Telegram Channel tasks
    const channelTasks = socialTasks.filter(
      (task) =>
        String(task.platform) === "TELEGRAM_CHANNEL" ||
        String(task.type) === "TELEGRAM_CHANNEL"
    );

    // Get all Telegram Group tasks
    const groupTasks = socialTasks.filter(
      (task) =>
        String(task.platform) === "TELEGRAM_GROUP" ||
        String(task.type) === "TELEGRAM_GROUP"
    );

    console.log("Found Telegram channel tasks:", channelTasks);
    console.log("Found Telegram group tasks:", groupTasks);

    return (
      <div className="space-y-6">
        {/* Telegram Channel Table */}
        <div>
          <h3 className="text-lg font-medium mb-2">Telegram Channels</h3>
          {channelTasks.length > 0 ? (
            <PerformanceTable
              headers={["No.", "Channel", "Followers", "Action"]}
              data={channelTasks}
              renderRow={(item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/30 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {item.link_url || "N/A"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {getCompletedUsersCount(item)}
                  </td>
                  <td className="px-4 py-2 text-sm cursor-text select-text">
                    {renderToggleButton(item.id)}
                  </td>
                </tr>
              )}
            />
          ) : (
            <p className="text-sm text-gray-500">No channel tasks available</p>
          )}
        </div>

        {/* Telegram Group Table */}
        <div>
          <h3 className="text-lg font-medium mb-2">Telegram Groups</h3>
          {groupTasks.length > 0 ? (
            <PerformanceTable
              headers={["No.", "Group", "Users", "Action"]}
              data={groupTasks}
              renderRow={(item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/30 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {item.link_url || "N/A"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {getCompletedUsersCount(item)}
                  </td>
                  <td className="px-4 py-2 text-sm cursor-text select-text">
                    {renderToggleButton(item.id)}
                  </td>
                </tr>
              )}
            />
          ) : (
            <p className="text-sm text-gray-500">No group tasks available</p>
          )}
        </div>
      </div>
    );
  };

  const renderXTable = () => {
    // Log all tasks for debugging
    console.log("All tasks for X filtering:", socialTasks);

    // Use more extensive filter for X/Twitter (including X_RETWEET)
    const xTasks = socialTasks.filter(
      (task) =>
        String(task.platform) === "X" ||
        String(task.type) === "X" ||
        String(task.platform) === "TWITTER" ||
        String(task.type) === "TWITTER" ||
        String(task.platform) === "X_RETWEET" ||
        String(task.type) === "X_RETWEET"
    );

    console.log("Found X/Twitter tasks:", xTasks);

    return (
      <div>
        <h3 className="text-lg font-medium mb-2">X (Twitter & Retweets)</h3>
        {xTasks.length > 0 ? (
          <PerformanceTable
            headers={["No.", "User", "Engagements", "Action"]}
            data={xTasks}
            renderRow={(item, index) => (
              <tr key={item.id} className="hover:bg-white/30 transition-colors">
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  {index + 1}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 truncate block max-w-[250px]"
                  >
                    {item.link_url || "N/A"}
                  </a>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  {getCompletedUsersCount(item)}
                </td>
                <td className="px-4 py-2 text-sm cursor-text select-text">
                  {renderToggleButton(item.id)}
                </td>
              </tr>
            )}
          />
        ) : (
          <p className="text-sm text-gray-500">No X tasks available</p>
        )}
      </div>
    );
  };

  const renderYoutubeTables = () => {
    console.log("All socialTasks in renderYoutubeTables:", socialTasks);

    // Get all YouTube tasks first
    const allYoutubeTasks = socialTasks.filter((task) => {
      console.log("Checking YouTube task:", task);
      return isYoutubePlatform(task.platform) || isYoutubePlatform(task.type);
    });

    // Then separate into subscribers and views
    const subscriberTasks = allYoutubeTasks.filter(
      (task) =>
        task.type?.toString().toUpperCase().includes("SUBSCRIBER") ||
        task.platform?.toString().toUpperCase().includes("SUBSCRIBER")
    );

    const viewsTasks = allYoutubeTasks.filter(
      (task) =>
        task.type?.toString().toUpperCase().includes("VIEW") ||
        task.platform?.toString().toUpperCase().includes("VIEW")
    );

    // Remaining YouTube tasks that don't fit into either category
    const otherYoutubeTasks = allYoutubeTasks.filter(
      (task) => !subscriberTasks.includes(task) && !viewsTasks.includes(task)
    );

    console.log("YouTube Subscriber Tasks:", subscriberTasks);
    console.log("YouTube Views Tasks:", viewsTasks);
    console.log("Other YouTube Tasks:", otherYoutubeTasks);

    return (
      <div className="space-y-6">
        {/* YouTube Subscribers Table */}
        <div>
          <h3 className="text-lg font-medium mb-2">YouTube Subscriber Tasks</h3>
          {subscriberTasks.length > 0 ? (
            <PerformanceTable
              headers={["No.", "Channel", "Subscribers", "Action"]}
              data={subscriberTasks}
              renderRow={(item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/30 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 truncate block max-w-[250px]"
                    >
                      {item.link_url || "N/A"}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {getCompletedUsersCount(item)}
                  </td>
                  <td className="px-4 py-2 text-sm cursor-text select-text">
                    {renderToggleButton(item.id)}
                  </td>
                </tr>
              )}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No YouTube subscriber tasks available
            </p>
          )}
        </div>

        {/* YouTube Views Table */}
        <div>
          <h3 className="text-lg font-medium mb-2">YouTube Views Tasks</h3>
          {viewsTasks.length > 0 ? (
            <PerformanceTable
              headers={["No.", "Video", "Views", "Action"]}
              data={viewsTasks}
              renderRow={(item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/30 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 truncate block max-w-[250px]"
                    >
                      {item.link_url || "N/A"}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {getCompletedUsersCount(item)}
                  </td>
                  <td className="px-4 py-2 text-sm cursor-text select-text">
                    {renderToggleButton(item.id)}
                  </td>
                </tr>
              )}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No YouTube views tasks available
            </p>
          )}
        </div>

        {/* Other YouTube Tasks Table - only show if needed */}
        {otherYoutubeTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Other YouTube Tasks</h3>
            <PerformanceTable
              headers={["No.", "Link", "Engagements", "Action"]}
              data={otherYoutubeTasks}
              renderRow={(item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/30 transition-colors"
                >
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 truncate block max-w-[250px]"
                    >
                      {item.link_url || "N/A"}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                    {getCompletedUsersCount(item)}
                  </td>
                  <td className="px-4 py-2 text-sm cursor-text select-text">
                    {renderToggleButton(item.id)}
                  </td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  const renderDiscordTable = () => {
    console.log("All socialTasks in renderDiscordTable:", socialTasks);

    // Get all Discord tasks
    const discordTasks = socialTasks.filter((task) => {
      console.log("Checking Discord task:", task);
      return (
        task.platform === "DISCORD" ||
        String(task.platform).toUpperCase() === "DISCORD" ||
        String(task.type).toUpperCase() === "DISCORD"
      );
    });

    console.log("Found Discord tasks:", discordTasks);

    return (
      <div>
        <h3 className="text-lg font-medium mb-2">Discord Servers</h3>
        {discordTasks.length > 0 ? (
          <PerformanceTable
            headers={["No.", "Server", "Members", "Action"]}
            data={discordTasks}
            renderRow={(item, index) => (
              <tr key={item.id} className="hover:bg-white/30 transition-colors">
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  {index + 1}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 truncate block max-w-[250px]"
                  >
                    {item.link_url || "N/A"}
                  </a>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 cursor-text select-text">
                  {getCompletedUsersCount(item)}
                </td>
                <td className="px-4 py-2 text-sm cursor-text select-text">
                  {renderToggleButton(item.id)}
                </td>
              </tr>
            )}
          />
        ) : (
          <p className="text-sm text-gray-500">No Discord tasks available</p>
        )}
      </div>
    );
  };

  const config = platformConfig[platform as keyof typeof platformConfig];
  const Icon = config.icon;

  const renderTables = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <FaSpinner className="animate-spin text-2xl" />
        </div>
      );
    }

    console.log(
      "Rendering tables for platform:",
      platform,
      "with socialTasks:",
      socialTasks
    );

    // Convert platform to string to handle type issues
    const platformStr = String(platform).toUpperCase();

    // For Telegram platforms, always show both channel and group data
    if (platformStr.includes("TELEGRAM")) {
      // For Telegram, we want to show both channels and groups regardless of which tab is selected
      console.log("Showing all Telegram tasks for platform:", platformStr);
      return renderTelegramTables();
    } else if (platformStr === "X" || platformStr === "X_RETWEET") {
      return renderXTable();
    } else if (platformStr.includes("YOUTUBE")) {
      return renderYoutubeTables();
    } else if (platformStr === "DISCORD") {
      return renderDiscordTable();
    } else {
      console.log("Unrecognized platform:", platform);
      return null;
    }
  };

  return (
    <div
      className={`rounded-xl p-6 bg-gradient-to-br ${config.bgGradient} mb-4`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Icon
            className={`text-2xl ${config.color}`}
            style={{
              color:
                platform === "TELEGRAM_CHANNEL" || platform === "TELEGRAM_GROUP"
                  ? "#3b82f6"
                  : platform === "YOUTUBE_SUBSCRIBERS" ||
                    platform === "YOUTUBE_VIEWS"
                  ? "#dc2626"
                  : platform === "X" || platform === "X_RETWEET"
                  ? "#111827"
                  : platform === "DISCORD"
                  ? "#7c3aed"
                  : "#6b7280",
            }}
          />
          <h3 className="text-lg font-medium capitalize text-gray-900">
            {platformDisplayNames[platform]} Performance
          </h3>
          {headerLoading && (
            <FaSpinner className="text-gray-600 animate-spin ml-2" />
          )}
        </div>
      </div>
      {renderTables()}
    </div>
  );
};

export default ServicePerformanceCard;
