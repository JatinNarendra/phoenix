"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaPlus, FaChevronDown, FaSpinner } from "react-icons/fa";
import { Customer, PlatformType } from "@/app/types/Customer";
import { supabase } from "@/lib/supabase";
import CustomerCard from "./components/CustomerCard";
import { mapDatabaseCustomerToCustomer } from "@/app/lib/typeGuards";
import PlatformStatsCard from "@/app/nexus/components/PlatformStatsCard";
import ServiceTypeCard from "@/app/nexus/components/ServiceTypeCard";

const calculatePlatformTotals = async () => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not available");
    }

    // Get social links data with clicks
    const { data: socialLinks, error: socialLinksError } = await supabase
      .from("customer_social_links")
      .select("platform, enabled, clicks, type");

    if (socialLinksError) {
      console.error("Error fetching social links:", socialLinksError);
      return {
        telegramChannel: 0,
        telegramGroup: 0,
        x: 0,
        youtubeViews: 0,
        youtubeSubscribers: 0,
        discord: 0,
        xRetweet: 0,
        telegramChannelInactive: 0,
        telegramGroupInactive: 0,
        xInactive: 0,
        youtubeViewsInactive: 0,
        youtubeSubscribersInactive: 0,
        discordInactive: 0,
        xRetweetInactive: 0,
        telegramChannelClicks: 0,
        telegramGroupClicks: 0,
        xClicks: 0,
        youtubeViewsClicks: 0,
        youtubeSubscribersClicks: 0,
        discordClicks: 0,
        xRetweetClicks: 0,
      };
    }

    // Initialize totals
    const totals = {
      telegramChannel: 0,
      telegramGroup: 0,
      x: 0,
      youtubeViews: 0,
      youtubeSubscribers: 0,
      discord: 0,
      xRetweet: 0,
      telegramChannelInactive: 0,
      telegramGroupInactive: 0,
      xInactive: 0,
      youtubeViewsInactive: 0,
      youtubeSubscribersInactive: 0,
      discordInactive: 0,
      xRetweetInactive: 0,
      telegramChannelClicks: 0,
      telegramGroupClicks: 0,
      xClicks: 0,
      youtubeViewsClicks: 0,
      youtubeSubscribersClicks: 0,
      discordClicks: 0,
      xRetweetClicks: 0,
    };

    // Track unique users per platform
    const uniqueUsers: Record<PlatformType, Set<string>> = {
      TELEGRAM_CHANNEL: new Set<string>(),
      TELEGRAM_GROUP: new Set<string>(),
      X: new Set<string>(),
      YOUTUBE_VIEWS: new Set<string>(),
      YOUTUBE_SUBSCRIBERS: new Set<string>(),
      DISCORD: new Set<string>(),
      X_RETWEET: new Set<string>(),
    };

    // Track all clicks per platform (without unique filtering)
    const allClicks: Record<PlatformType, number> = {
      TELEGRAM_CHANNEL: 0,
      TELEGRAM_GROUP: 0,
      X: 0,
      YOUTUBE_VIEWS: 0,
      YOUTUBE_SUBSCRIBERS: 0,
      DISCORD: 0,
      X_RETWEET: 0,
    };

    // Count social links and track clicks
    socialLinks.forEach((link) => {
      // Handle status (active/inactive) counts - ensure we only count service types, not clicks
      if (link.platform) {
        switch (link.platform) {
          case "TELEGRAM_CHANNEL":
            if (link.enabled) totals.telegramChannel++;
            else totals.telegramChannelInactive++;
            break;
          case "TELEGRAM_GROUP":
            if (link.enabled) totals.telegramGroup++;
            else totals.telegramGroupInactive++;
            break;
          case "X":
            if (link.enabled) totals.x++;
            else totals.xInactive++;
            break;
          case "YOUTUBE_VIEWS":
            if (link.enabled) totals.youtubeViews++;
            else totals.youtubeViewsInactive++;
            break;
          case "YOUTUBE_SUBSCRIBERS":
            if (link.enabled) totals.youtubeSubscribers++;
            else totals.youtubeSubscribersInactive++;
            break;
          case "DISCORD":
            if (link.enabled) totals.discord++;
            else totals.discordInactive++;
            break;
          case "X_RETWEET":
            if (link.enabled) totals.xRetweet++;
            else totals.xRetweetInactive++;
            break;
        }
      }

      // Count clicks separately - this data is for the Platforms section, not Services
      if (link.platform && link.clicks && Array.isArray(link.clicks)) {
        // Add to total click count for the platform
        const platformType = link.platform as PlatformType;
        allClicks[platformType] += link.clicks.length;

        // Also track unique users for reference
        link.clicks.forEach((userId) => {
          if (userId) {
            uniqueUsers[platformType].add(userId.toString());
          }
        });
      }
    });

    // Update totals with TOTAL clicks (not just unique clicks)
    totals.telegramChannelClicks = allClicks.TELEGRAM_CHANNEL;
    totals.telegramGroupClicks = allClicks.TELEGRAM_GROUP;
    totals.xClicks = allClicks.X;
    totals.youtubeViewsClicks = allClicks.YOUTUBE_VIEWS;
    totals.youtubeSubscribersClicks = allClicks.YOUTUBE_SUBSCRIBERS;
    totals.discordClicks = allClicks.DISCORD;
    totals.xRetweetClicks = allClicks.X_RETWEET;

    return totals;
  } catch (error) {
    console.error("Error calculating platform totals:", error);
    return {
      telegramChannel: 0,
      telegramGroup: 0,
      x: 0,
      youtubeViews: 0,
      youtubeSubscribers: 0,
      discord: 0,
      xRetweet: 0,
      telegramChannelInactive: 0,
      telegramGroupInactive: 0,
      xInactive: 0,
      youtubeViewsInactive: 0,
      youtubeSubscribersInactive: 0,
      discordInactive: 0,
      xRetweetInactive: 0,
      telegramChannelClicks: 0,
      telegramGroupClicks: 0,
      xClicks: 0,
      youtubeViewsClicks: 0,
      youtubeSubscribersClicks: 0,
      discordClicks: 0,
      xRetweetClicks: 0,
    };
  }
};

export default function NexusPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const VISIBLE_ITEMS = 6;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platformTotals, setPlatformTotals] = useState({
    telegramChannel: 0,
    telegramGroup: 0,
    x: 0,
    youtubeViews: 0,
    youtubeSubscribers: 0,
    discord: 0,
    xRetweet: 0,
    telegramChannelInactive: 0,
    telegramGroupInactive: 0,
    xInactive: 0,
    youtubeViewsInactive: 0,
    youtubeSubscribersInactive: 0,
    discordInactive: 0,
    xRetweetInactive: 0,
    telegramChannelClicks: 0,
    telegramGroupClicks: 0,
    xClicks: 0,
    youtubeViewsClicks: 0,
    youtubeSubscribersClicks: 0,
    discordClicks: 0,
    xRetweetClicks: 0,
  });

  const fetchCustomers = async (pageNumber = 1) => {
    try {
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      setIsLoading(true);
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const {
        data: customersData,
        error,
        count,
      } = await supabase
        .from("customers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const mappedCustomers = await Promise.all(
        customersData.map((customer) => mapDatabaseCustomerToCustomer(customer))
      );

      setCustomers((prev) =>
        pageNumber === 1 ? mappedCustomers : [...prev, ...mappedCustomers]
      );
      setHasMore(count ? from + PAGE_SIZE < count : false);
      setError(null);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setError("Failed to load customers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchTotals = async () => {
      const totals = await calculatePlatformTotals();
      setPlatformTotals(totals);
    };
    fetchTotals();

    // Add event listener for platform total refreshes
    const handleRefreshTotals = () => {
      console.log("Refreshing platform totals after task completion");
      fetchTotals();
    };

    window.addEventListener("refreshPlatformTotals", handleRefreshTotals);

    return () => {
      window.removeEventListener("refreshPlatformTotals", handleRefreshTotals);
    };
  }, []);

  const handleLoadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchCustomers(nextPage);
  };

  // Update the sorting logic to prioritize active customers
  const sortedCustomers = [...customers].sort((a, b) => {
    // Helper function to count active services
    const getActiveServicesCount = (customer: Customer) => {
      return Object.values(customer.socialTasks).filter(
        (task) => task.enabled && task.links?.length > 0
      ).length;
    };

    const aActiveCount = getActiveServicesCount(a);
    const bActiveCount = getActiveServicesCount(b);

    // Sort by active services count first
    if (aActiveCount !== bActiveCount) {
      return bActiveCount - aActiveCount;
    }

    // Secondary sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const visibleCustomers = sortedCustomers.slice(0, page * VISIBLE_ITEMS);

  const renderLoadMoreButton = () => {
    if (page > 1) {
      return (
        <div className="mt-6 text-center">
          <FaSpinner className="mx-auto text-2xl text-grey-600 animate-spin" />
        </div>
      );
    }

    if (hasMore) {
      return (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="flex items-center gap-2 mx-auto text-gray-600 hover:text-gray-700"
          >
            <span>Load More</span>
            <FaChevronDown />
          </button>
        </div>
      );
    }

    if (customers.length > 0) {
      return (
        <div className="mt-6 text-center">
          <hr className="mb-4 border-t border-gray-200" />
          <p className="text-gray-500 text-sm">You&apos;ve reached the end!</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#333333" }}
    >
      {/* Main Content - Updated with better mobile widths */}
      <div className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-2 py-3 sm:px-6 sm:py-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <FaSpinner className="animate-spin text-2xl text-gray-600" />
            </div>
          ) : error ? (
            <div className="text-red-600 p-4 text-center">{error}</div>
          ) : (
            <>
              {/* Create New Customer Button */}
              <div className="flex justify-end mb-6">
                <Link
                  href="/nexus/new"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  <FaPlus className="text-[12px]" />
                  <span>Create New Customer</span>
                </Link>
              </div>

              {/* Grid Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 overflow-hidden">
                {visibleCustomers.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} />
                ))}
              </div>

              {/* Load More Button */}
              {renderLoadMoreButton()}

              {/* Services Section */}
              <div className="mt-6 md:mt-12">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-6">
                  Service Types
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 text-gray-700">
                  {[
                    {
                      platform: "TELEGRAM_CHANNEL",
                      stats: {
                        active: platformTotals.telegramChannel,
                        inactive: platformTotals.telegramChannelInactive,
                      },
                    },
                    {
                      platform: "TELEGRAM_GROUP",
                      stats: {
                        active: platformTotals.telegramGroup,
                        inactive: platformTotals.telegramGroupInactive,
                      },
                    },
                    {
                      platform: "X",
                      stats: {
                        active: platformTotals.x,
                        inactive: platformTotals.xInactive,
                      },
                    },
                    {
                      platform: "YOUTUBE_VIEWS",
                      stats: {
                        active: platformTotals.youtubeViews,
                        inactive: platformTotals.youtubeViewsInactive,
                      },
                    },
                    {
                      platform: "YOUTUBE_SUBSCRIBERS",
                      stats: {
                        active: platformTotals.youtubeSubscribers,
                        inactive: platformTotals.youtubeSubscribersInactive,
                      },
                    },
                    {
                      platform: "DISCORD",
                      stats: {
                        active: platformTotals.discord,
                        inactive: platformTotals.discordInactive,
                      },
                    },
                    {
                      platform: "X_RETWEET",
                      stats: {
                        active: platformTotals.xRetweet,
                        inactive: platformTotals.xRetweetInactive,
                      },
                    },
                  ].map((service) => (
                    <div key={service.platform} className="w-full">
                      <ServiceTypeCard
                        platform={service.platform as PlatformType}
                        stats={service.stats}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Stats Section */}
              <div className="mt-6 md:mt-12">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-6">
                  Platforms
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 text-gray-700">
                  {[
                    {
                      platform: "TELEGRAM_CHANNEL",
                      title: "Telegram Channel Clicks",
                      value: platformTotals.telegramChannelClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "TELEGRAM_GROUP",
                      title: "Telegram Group Clicks",
                      value: platformTotals.telegramGroupClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "X",
                      title: "X (Twitter) Clicks",
                      value: platformTotals.xClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "YOUTUBE_VIEWS",
                      title: "YouTube Views Clicks",
                      value: platformTotals.youtubeViewsClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "YOUTUBE_SUBSCRIBERS",
                      title: "YouTube Subs Clicks",
                      value: platformTotals.youtubeSubscribersClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "DISCORD",
                      title: "Discord Clicks",
                      value: platformTotals.discordClicks,
                      label: "Total Clicks",
                    },
                    {
                      platform: "X_RETWEET",
                      title: "X Retweet Clicks",
                      value: platformTotals.xRetweetClicks,
                      label: "Total Clicks",
                    },
                  ].map((stat) => (
                    <div key={stat.platform} className="w-full">
                      <PlatformStatsCard
                        platform={stat.platform as PlatformType}
                        title={stat.title}
                        value={stat.value}
                        label={stat.label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
