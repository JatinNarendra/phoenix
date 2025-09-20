"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaPencil } from "react-icons/fa6";
import {
  Customer as BaseCustomer,
  PlatformType,
  ServiceType,
  TaskResponse,
} from "@/app/types/Customer";
import { supabase } from "@/lib/supabase";
import { mapDatabaseCustomerToCustomer } from "@/app/lib/typeGuards";
import toast from "react-hot-toast";
import AddTaskModal from "../components/AddTaskModal";
import Tasks from "../components/Tasks";
import ServicePerformanceCard from "../components/ServicePerformanceCard";
import { Button } from "@/app/ui/button";
import { Card } from "@/app/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/app/ui/avatar";
import Loader from "@/app/components/Loader";
import ServiceTypeCard from "../components/ServiceTypeCard";

interface CustomerDashboardProps {
  params: Promise<{ customerSlug: string }>;
}

export interface TaskDefaults {
  platform: PlatformType;
  defaultType: ServiceType;
  defaultTaskType: ServiceType;
}

const platformDefaults: Record<PlatformType, TaskDefaults> = {
  TELEGRAM_CHANNEL: {
    platform: "TELEGRAM_CHANNEL",
    defaultType: "TELEGRAM_CHANNEL",
    defaultTaskType: "TELEGRAM_CHANNEL",
  },
  TELEGRAM_GROUP: {
    platform: "TELEGRAM_GROUP",
    defaultType: "TELEGRAM_GROUP",
    defaultTaskType: "TELEGRAM_GROUP",
  },
  X: {
    platform: "X",
    defaultType: "X",
    defaultTaskType: "X",
  },
  YOUTUBE_VIEWS: {
    platform: "YOUTUBE_VIEWS",
    defaultType: "YOUTUBE_VIEWS",
    defaultTaskType: "YOUTUBE_VIEWS",
  },
  YOUTUBE_SUBSCRIBERS: {
    platform: "YOUTUBE_SUBSCRIBERS",
    defaultType: "YOUTUBE_SUBSCRIBERS",
    defaultTaskType: "YOUTUBE_SUBSCRIBERS",
  },
  DISCORD: {
    platform: "DISCORD",
    defaultType: "DISCORD",
    defaultTaskType: "DISCORD",
  },
  X_RETWEET: {
    platform: "X_RETWEET",
    defaultType: "X_RETWEET",
    defaultTaskType: "X_RETWEET",
  },
};

interface SocialTaskLink {
  id: string;
  enabled: boolean;
  link_url: string;
}

const mapTasksToPerformanceData = (customer: Customer) => {
  return {
    telegram: {
      channelData:
        customer.socialTasks?.["TELEGRAM_CHANNEL"]?.links?.map(
          (link: SocialTaskLink) => ({
            id: link.id,
            channelName: link.link_url.split("/").pop() || "",
            action: "Follow",
            followers: 0,
          })
        ) || [],
      groupData:
        customer.socialTasks?.["TELEGRAM_GROUP"]?.links?.map(
          (link: SocialTaskLink) => ({
            id: link.id,
            groupName: link.link_url.split("/").pop() || "",
            action: "Join",
            users: 0,
          })
        ) || [],
    },
    youtube: {
      subscriberData:
        customer.socialTasks?.["YOUTUBE_SUBSCRIBERS"]?.links?.map(
          (link: SocialTaskLink) => ({
            id: link.id,
            channelName: link.link_url.split("/").pop() || "",

            action: "Subscribe",
          })
        ) || [],
      videoData:
        customer.socialTasks?.["YOUTUBE_VIEWS"]?.links?.map(
          (link: SocialTaskLink) => ({
            id: link.id,
            videoTitle: link.link_url.split("/").pop() || "",

            action: "Watch",
          })
        ) || [],
    },
  };
};

interface Customer extends BaseCustomer {
  campaign_name?: string;
  campaign_details?: string;
  campaign_reward?: string;
}

export default function CustomerDashboard({ params }: CustomerDashboardProps) {
  console.log("=== CustomerDashboard: Component STARTED ===");
  const resolvedParams = React.use(params);
  console.log(
    "CustomerDashboard: Component loading with params:",
    resolvedParams
  );
  console.log(
    "CustomerDashboard: Current pathname:",
    window?.location?.pathname
  );
  console.log("CustomerDashboard: Params type:", typeof resolvedParams);
  console.log(
    "CustomerDashboard: Params value:",
    JSON.stringify(resolvedParams)
  );
  console.log(
    "CustomerDashboard: FORCE DEPLOYMENT TEST - Route should work now!"
  );

  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [customerSlug, setCustomerSlug] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [toggleEnabled, setToggleEnabled] = useState(true);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [isEditingCampaignDetails, setIsEditingCampaignDetails] =
    useState(false);
  const [campaignDetails, setCampaignDetails] = useState("");
  const [isEditingReward, setIsEditingReward] = useState(false);
  const [campaignSparks, setCampaignSparks] = useState(0);
  const [campaignSpins, setCampaignSpins] = useState(0);
  const [isEditingCustomerName, setIsEditingCustomerName] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set customer slug from resolved params
  useEffect(() => {
    try {
      console.log("CustomerDashboard: Resolved params:", resolvedParams);

      if (!resolvedParams.customerSlug) {
        console.error("CustomerDashboard: No customerSlug found in params");
        router.push("/nexus");
        return;
      }

      setCustomerSlug(resolvedParams.customerSlug);
    } catch (error) {
      console.error("CustomerDashboard: Error with params:", error);
      router.push("/nexus");
    }
  }, [resolvedParams, router]);

  const fetchCustomer = useCallback(async () => {
    // Don't fetch if customerSlug is not available yet
    if (!customerSlug) {
      console.log(
        "CustomerDashboard: customerSlug not available yet, skipping fetch"
      );
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available");
      return;
    }

    try {
      console.log(
        "CustomerDashboard: Fetching customer with slug:",
        customerSlug
      );
      const { data: customerData, error } = await supabase
        .from("customers")
        .select("*")
        .eq("slug", customerSlug)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
        // If it's an authentication error, redirect to nexus
        if (
          error.message?.includes("auth") ||
          error.message?.includes("permission")
        ) {
          router.push("/nexus");
          return;
        }
        // Otherwise redirect to nexus
        router.push("/nexus");
        return;
      }

      const mappedCustomer = await mapDatabaseCustomerToCustomer(customerData);
      setCustomer(mappedCustomer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      // If it's an authentication error, redirect to nexus
      if (
        error instanceof Error &&
        (error.message.includes("auth") || error.message.includes("permission"))
      ) {
        router.push("/nexus");
        return;
      }
      router.push("/nexus");
    }
  }, [customerSlug, router]);

  useEffect(() => {
    // Only fetch when customerSlug is available
    if (!customerSlug) {
      console.log(
        "CustomerDashboard: customerSlug not available, skipping fetch"
      );
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setToggleEnabled(false);
      try {
        await fetchCustomer();
      } finally {
        setIsLoading(false);
        setToggleEnabled(true);
      }
    };
    fetchData();
  }, [customerSlug, fetchCustomer]);

  // Separate useEffect for campaign name and rewards initialization
  useEffect(() => {
    if (customer) {
      setCampaignName(customer.campaign_name || "");
      setCampaignDetails(customer.campaign_details || "");
      setCampaignSparks(customer.campaign_sparks || 0);
      setCampaignSpins(customer.campaign_spins || 0);
      setCustomerName(customer.customer_name || "");
    }
  }, [customer]);

  const handleToggleService = async (
    taskId: string,
    platform: PlatformType
  ) => {
    if (!customer) return;

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      toast.error("Invalid task ID format");
      return;
    }

    setToggleEnabled(false);
    setToggleLoading(taskId);

    try {
      const { data: taskData, error: fetchError } = await supabase
        .from("customer_social_links")
        .select("*")
        .eq("id", taskId)
        .single();

      if (fetchError) throw fetchError;

      if (!taskData) {
        throw new Error("Task not found");
      }

      const currentStatus = taskData.enabled;

      const { error: updateError } = await supabase
        .from("customer_social_links")
        .update({ enabled: !currentStatus })
        .eq("id", taskId);

      if (updateError) {
        toast.error(`Failed to toggle task: ${updateError.message}`);
        throw updateError;
      }

      setCustomer((prev) => {
        if (!prev) return null;

        const updatedSocialTasks = { ...prev.socialTasks };
        if (updatedSocialTasks[platform]?.links) {
          const links = updatedSocialTasks[platform].links as SocialTaskLink[];
          const linkIndex = links.findIndex((link) => link.id === taskId);

          if (linkIndex !== -1) {
            links[linkIndex] = {
              ...links[linkIndex],
              enabled: !currentStatus,
            } as SocialTaskLink;
          }

          updatedSocialTasks[platform] = {
            ...updatedSocialTasks[platform],
            links,
          };
        }

        return {
          ...prev,
          socialTasks: updatedSocialTasks,
        };
      });

      toast.success(
        `Task ${!currentStatus ? "enabled" : "disabled"} successfully`
      );
    } catch {
      toast.error("Failed to toggle task");
    } finally {
      setToggleLoading(null);
      setToggleEnabled(true);
    }
  };

  const handleAddTaskClick = () => {
    setIsAddTaskModalOpen(true);
  };

  const handlePlatformSelection = (platform: PlatformType) => {
    // Set default task type based on platform
    const defaults = platformDefaults[platform];

    setCustomer((prev) => ({
      ...prev!,
      socialTasks: {
        ...prev!.socialTasks,
        [platform]: {
          ...prev!.socialTasks[platform],
          type: defaults.defaultType,
          enabled: true,
        },
      },
    }));
  };

  const handleSaveCampaign = async () => {
    if (!customer) return;

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({ campaign_name: campaignName })
        .eq("slug", customer.slug);

      if (error) {
        toast.error("Failed to update campaign name");
        return;
      }

      setCustomer((prev) => ({
        ...prev!,
        campaign_name: campaignName,
      }));

      setIsEditingCampaign(false);
      toast.success("Campaign name updated successfully");
    } catch (error) {
      console.error("Error updating campaign name:", error);
      toast.error("Failed to update campaign name");
    }
  };

  const handleSaveCampaignDetails = async () => {
    if (!customer) return;

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({ campaign_details: campaignDetails })
        .eq("slug", customer.slug);

      if (error) {
        toast.error("Failed to update campaign details");
        return;
      }

      setCustomer((prev) => ({
        ...prev!,
        campaign_details: campaignDetails,
      }));

      setIsEditingCampaignDetails(false);
      toast.success("Campaign details updated successfully");
    } catch (error) {
      console.error("Error updating campaign details:", error);
      toast.error("Failed to update campaign details");
    }
  };

  const handleSaveReward = async () => {
    if (!customer) return;

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          campaign_sparks: campaignSparks,
          campaign_spins: campaignSpins,
        })
        .eq("slug", customer.slug);

      if (error) {
        toast.error("Failed to update campaign rewards");
        return;
      }

      setCustomer((prev) => ({
        ...prev!,
        campaign_sparks: campaignSparks,
        campaign_spins: campaignSpins,
      }));

      setIsEditingReward(false);
      toast.success("Campaign rewards updated successfully");
    } catch (error) {
      console.error("Error updating campaign rewards:", error);
      toast.error("Failed to update campaign rewards");
    }
  };

  const handleSaveCustomerName = async () => {
    if (!customer) return;

    try {
      // Update customer name in the customers table
      const { error: customerError } = await supabase!
        .from("customers")
        .update({ customer_name: customerName })
        .eq("slug", customer.slug);

      if (customerError) {
        toast.error("Failed to update customer name");
        return;
      }

      // Update customer name in all related customer_social_links using customer's ID
      const { error: linksError } = await supabase!
        .from("customer_social_links")
        .update({ customer_name: customerName })
        .eq("customer_id", customer.id);

      if (linksError) {
        console.error("Error updating social links:", linksError);
        // Continue with the rest of the function even if this fails
      }

      setCustomer((prev) => ({
        ...prev!,
        customer_name: customerName,
      }));

      setIsEditingCustomerName(false);
      toast.success("Customer name updated successfully");
    } catch (error) {
      console.error("Error updating customer name:", error);
      toast.error("Failed to update customer name");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customer || !e.target.files || e.target.files.length === 0) return;

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${customer.id}-logo.${fileExt}`;
    const filePath = `customer-logos/${fileName}`;

    try {
      setIsLoading(true);

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("sparky")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("sparky")
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update customer logo in the database
      const { error: updateError } = await supabase
        .from("customers")
        .update({ logo_url: logoUrl })
        .eq("slug", customer.slug);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setCustomer((prev) => ({
        ...prev!,
        logo_url: logoUrl,
      }));

      toast.success("Logo updated successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to update logo");
    } finally {
      setIsLoading(false);
    }
  };

  if (!customer) {
    return (
      <main className="pt-16 md:pl-16">
        <div className="min-h-screen bg-gray-50 overflow-y-auto pb-20">
          <Loader isLoading={isLoading} />
          <div className="max-w-7xl mx-auto md:p-3 mt-16">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading Customer Data...
                </h2>
                <p className="text-gray-600">
                  Please wait while we fetch the customer information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const performanceData = mapTasksToPerformanceData(customer);

  return (
    <main className="pt-16 md:pl-16">
      <div className="min-h-screen bg-gray-50 overflow-y-auto pb-20">
        <Loader isLoading={isLoading} />
        {/* Content - Improved padding and spacing for mobile */}
        <div className="max-w-7xl mx-auto md:p-3 mt-16">
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <Card className=" sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 mb-10">
                <div className="flex items-center gap-4">
                  <div
                    className="relative"
                    onMouseEnter={() => setIsHoveringLogo(true)}
                    onMouseLeave={() => setIsHoveringLogo(false)}
                  >
                    <Avatar className="h-12 w-12 cursor-pointer">
                      {customer.logo_url ? (
                        <AvatarImage
                          src={customer.logo_url}
                          alt={`${customer.customer_name} logo`}
                        />
                      ) : (
                        <AvatarFallback>
                          {customer.customer_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {isHoveringLogo && (
                      <div
                        className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FaPencil className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  <div className="flex flex-col">
                    {isEditingCustomerName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-600 text-2xl sm:text-4xl font-bold"
                          placeholder="Enter customer name"
                        />
                        <Button
                          onClick={handleSaveCustomerName}
                          variant="outline"
                          size="sm"
                          className="px-3 text-amber-600 hover:text-amber-700"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditingCustomerName(false);
                            setCustomerName(customer.customer_name || "");
                          }}
                          variant="outline"
                          size="sm"
                          className="px-3 text-gray-600 hover:text-gray-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-4xl font-extrabold truncate">
                          {customer.customer_name}
                        </h1>
                        <Button
                          onClick={() => setIsEditingCustomerName(true)}
                          variant="ghost"
                          size="sm"
                          className="p-1 text-gray-600 hover:text-amber-600"
                        >
                          <FaPencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddTaskClick}
                    className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-bold text-xs text-gray-700">
                    Campaign Name:
                  </span>
                  {isEditingCampaign ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-600"
                        placeholder={
                          customer.campaign_name || "Enter campaign name"
                        }
                      />
                      <Button
                        onClick={handleSaveCampaign}
                        variant="outline"
                        size="sm"
                        className="px-3 text-amber-600 hover:text-amber-700"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingCampaign(false);
                          setCampaignName(customer.campaign_name || "");
                        }}
                        variant="outline"
                        size="sm"
                        className="px-3 text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-amber-600 font-semibold text-md">
                        {customer.campaign_name || "No campaign name set"}
                      </span>
                      <Button
                        onClick={() => setIsEditingCampaign(true)}
                        variant="ghost"
                        size="sm"
                        className="p-1 text-gray-600 hover:text-amber-600"
                      >
                        <FaPencil className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-bold text-xs text-gray-700">
                    Campaign Details:
                  </span>
                  {isEditingCampaignDetails ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={campaignDetails}
                        onChange={(e) => setCampaignDetails(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-600"
                        placeholder={
                          customer.campaign_details || "Enter campaign details"
                        }
                      />
                      <Button
                        onClick={handleSaveCampaignDetails}
                        variant="outline"
                        size="sm"
                        className="px-3 text-amber-600 hover:text-amber-700"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingCampaignDetails(false);
                          setCampaignDetails(customer.campaign_details || "");
                        }}
                        variant="outline"
                        size="sm"
                        className="px-3 text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-amber-600 font-semibold text-md">
                        {customer.campaign_details || "No campaign details set"}
                      </span>
                      <Button
                        onClick={() => setIsEditingCampaignDetails(true)}
                        variant="ghost"
                        size="sm"
                        className="p-1 text-gray-600 hover:text-amber-600"
                      >
                        <FaPencil className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-bold text-xs text-gray-700">
                    Campaign Rewards:
                  </span>
                  {isEditingReward ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Sparks:</span>
                        <input
                          type="number"
                          min="0"
                          value={campaignSparks}
                          onChange={(e) =>
                            setCampaignSparks(Number(e.target.value))
                          }
                          className="w-24 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-600"
                          placeholder="Sparks"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Spins:</span>
                        <input
                          type="number"
                          min="0"
                          value={campaignSpins}
                          onChange={(e) =>
                            setCampaignSpins(Number(e.target.value))
                          }
                          className="w-24 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-600"
                          placeholder="Spins"
                        />
                      </div>
                      <Button
                        onClick={handleSaveReward}
                        variant="outline"
                        size="sm"
                        className="px-3 text-amber-600 hover:text-amber-700"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingReward(false);
                          setCampaignSparks(customer.campaign_sparks || 0);
                          setCampaignSpins(customer.campaign_spins || 0);
                        }}
                        variant="outline"
                        size="sm"
                        className="px-3 text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-semibold text-md">
                          {customer.campaign_sparks || 0} Sparks
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-amber-600 font-semibold text-md">
                          {customer.campaign_spins || 0} Spins
                        </span>
                      </div>
                      <Button
                        onClick={() => setIsEditingReward(true)}
                        variant="ghost"
                        size="sm"
                        className="p-1 text-gray-600 hover:text-amber-600"
                      >
                        <FaPencil className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-medium text-black mb-4 sm:mb-6 border-b border-gray-200">
                Tasks
              </h2>
              <Tasks
                customer={customer}
                setCustomer={setCustomer}
                tasks={tasks}
                setTasks={setTasks}
              />
              {/* Service Status Section - Adjusted grid and spacing */}
              <div className="mt-6 md:mt-12">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-6">
                  Service Status
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8 text-gray-700">
                  <ServiceTypeCard
                    platform="TELEGRAM_CHANNEL"
                    stats={{
                      active:
                        customer.socialTasks["TELEGRAM_CHANNEL"]?.links?.filter(
                          (link) => link.enabled
                        ).length || 0,
                      inactive:
                        customer.socialTasks["TELEGRAM_CHANNEL"]?.links?.filter(
                          (link) => !link.enabled
                        ).length || 0,
                    }}
                  />
                  <ServiceTypeCard
                    platform="TELEGRAM_GROUP"
                    stats={{
                      active:
                        customer.socialTasks["TELEGRAM_GROUP"]?.links?.filter(
                          (link) => link.enabled
                        ).length || 0,
                      inactive:
                        customer.socialTasks["TELEGRAM_GROUP"]?.links?.filter(
                          (link) => !link.enabled
                        ).length || 0,
                    }}
                  />
                  <ServiceTypeCard
                    platform="X"
                    stats={{
                      active:
                        customer.socialTasks["X"]?.links?.filter(
                          (link) => link.enabled
                        ).length || 0,
                      inactive:
                        customer.socialTasks["X"]?.links?.filter(
                          (link) => !link.enabled
                        ).length || 0,
                    }}
                  />
                  <ServiceTypeCard
                    platform="YOUTUBE_VIEWS"
                    stats={{
                      active:
                        customer.socialTasks["YOUTUBE_VIEWS"]?.links?.filter(
                          (link) => link.enabled
                        ).length || 0,
                      inactive:
                        customer.socialTasks["YOUTUBE_VIEWS"]?.links?.filter(
                          (link) => !link.enabled
                        ).length || 0,
                    }}
                  />
                  <ServiceTypeCard
                    platform="YOUTUBE_SUBSCRIBERS"
                    stats={{
                      active:
                        customer.socialTasks[
                          "YOUTUBE_SUBSCRIBERS"
                        ]?.links?.filter((link) => link.enabled).length || 0,
                      inactive:
                        customer.socialTasks[
                          "YOUTUBE_SUBSCRIBERS"
                        ]?.links?.filter((link) => !link.enabled).length || 0,
                    }}
                  />
                </div>
              </div>

              {/* Service Performance Section */}
              <div className="mt-6 md:mt-12">
                <h2 className="text-lg font-medium text-black mb-4 sm:mb-6 mt-8 border-b border-gray-200">
                  Service Performance
                </h2>

                <div className="space-y-4">
                  <ServicePerformanceCard
                    platformKey="TELEGRAM_CHANNEL"
                    platform="TELEGRAM_CHANNEL"
                    data={performanceData.telegram}
                    enabled={
                      customer.socialTasks["TELEGRAM_CHANNEL"]?.enabled || false
                    }
                    onToggle={(taskId) =>
                      handleToggleService(taskId, "TELEGRAM_CHANNEL")
                    }
                    loading={toggleLoading === "TELEGRAM_CHANNEL"}
                    headerLoading={false}
                    toggleEnabled={toggleEnabled}
                    customer={customer}
                  />

                  <ServicePerformanceCard
                    platformKey="X"
                    platform="X"
                    data={{
                      twitterData: [
                        // X (Twitter) Follow tasks
                        ...(customer.socialTasks["X"]?.links?.map(
                          (link, index) => ({
                            id: `x-${index}`,
                            user: link.link_url.split("/").pop() || "",
                            followers: 0,
                            action: "Follow",
                          })
                        ) || []),
                        // X Retweet tasks
                        ...(customer.socialTasks["X_RETWEET"]?.links?.map(
                          (link, index) => ({
                            id: `x-retweet-${index}`,
                            user: link.link_url.split("/").pop() || "",
                            followers: 0,
                            action: "Retweet",
                          })
                        ) || []),
                      ],
                    }}
                    enabled={
                      customer.socialTasks["X"]?.enabled ||
                      false ||
                      customer.socialTasks["X_RETWEET"]?.enabled ||
                      false
                    }
                    onToggle={async (taskId) => {
                      if (taskId.startsWith("x-retweet-")) {
                        await handleToggleService(taskId, "X_RETWEET");
                      } else {
                        await handleToggleService(taskId, "X");
                      }
                    }}
                    loading={
                      toggleLoading === "X" || toggleLoading === "X_RETWEET"
                    }
                    headerLoading={false}
                    toggleEnabled={toggleEnabled}
                    customer={customer}
                  />

                  <ServicePerformanceCard
                    platformKey="YOUTUBE_VIEWS"
                    platform="YOUTUBE_VIEWS"
                    data={performanceData.youtube}
                    enabled={
                      customer.socialTasks["YOUTUBE_VIEWS"]?.enabled || false
                    }
                    onToggle={(taskId) =>
                      handleToggleService(taskId, "YOUTUBE_VIEWS")
                    }
                    loading={toggleLoading === "YOUTUBE_VIEWS"}
                    headerLoading={false}
                    toggleEnabled={toggleEnabled}
                    customer={customer}
                  />

                  <ServicePerformanceCard
                    platformKey="DISCORD"
                    platform="DISCORD"
                    data={{
                      discordData:
                        customer.socialTasks["DISCORD"]?.links?.map(
                          (link, index) => ({
                            id: `discord-${index}`,
                            server: link.link_url.split("/").pop() || "",
                            members: 0,
                            action: "Join",
                          })
                        ) || [],
                    }}
                    enabled={customer.socialTasks["DISCORD"]?.enabled || false}
                    onToggle={async (taskId) =>
                      await handleToggleService(taskId, "DISCORD")
                    }
                    loading={toggleLoading === "DISCORD"}
                    headerLoading={false}
                    toggleEnabled={toggleEnabled}
                    customer={customer}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          customerName={customer.customer_name}
          customerId={customer.slug}
          onTaskAdded={fetchCustomer}
          onPlatformSelect={handlePlatformSelection}
          defaultTaskTypes={platformDefaults}
          setTasks={setTasks}
        />
      </div>
    </main>
  );
}
