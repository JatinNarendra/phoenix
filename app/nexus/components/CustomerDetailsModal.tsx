"use client";
import React, { useState, useEffect } from "react";
import { FaTelegram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { FaTimes, FaToggleOn, FaToggleOff, FaSpinner } from "react-icons/fa";
import { Customer, PlatformType } from "@/app/types/Customer";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { SocialServiceName, SocialTaskKey } from "@/app/types/social";
import { getPlatformName } from "@/app/lib/platformUtils";
import { SocialLinkRow } from "@/app/nexus/components/SocialLinkRow";
import { SocialTaskConfig } from "@/app/types/Customer";
import { getCustomerSocialTasks } from "@/app/lib/supabase/queries";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onUpdate?: () => Promise<void>;
}

type SocialService = {
  key: SocialTaskKey;
  name: SocialServiceName;
  icon: React.ComponentType<{ className: string }>;
  color: string;
  type: string;
};

const socialServices: SocialService[] = [
  {
    key: "telegram",
    name: "telegram",
    icon: FaTelegram,
    color: "text-blue-500",
    type: "LINK_VISITOR",
  },
  {
    key: "x",
    name: "x",
    icon: FaXTwitter,
    color: "text-gray-900",
    type: "LINK_VISITOR",
  },
  {
    key: "youtube",
    name: "youtube",
    icon: FaYoutube,
    color: "text-red-600",
    type: "LINK_VISITOR",
  },
];

const socialValidationPatterns: Record<SocialTaskKey, RegExp> = {
  telegram: /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]+$/,
  x: /^https:\/\/x\.com\/[a-zA-Z0-9_]+$/,
  youtube:
    /^https:\/\/((?:www\.)?youtube\.com\/(?:watch\?v=|playlist\?list=|channel\/|c\/|user\/)|youtu\.be\/)[a-zA-Z0-9_-]+(?:\?.*)?$/,
};

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  onUpdate,
}: CustomerDetailsModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [socialTasks, setSocialTasks] = useState<{
    [key: string]: SocialTaskConfig;
  }>({});
  const [isAnyServiceEnabled, setIsAnyServiceEnabled] = useState(false);
  const [editingLink, setEditingLink] = useState<{
    serviceKey: SocialTaskKey;
    index: number;
    link: string;
  } | null>(null);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [linkStatuses, setLinkStatuses] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [loadingLinks, setLoadingLinks] = useState<{ [key: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const fetchSocialTasks = async () => {
      try {
        const tasks = await getCustomerSocialTasks(customer.id);
        setSocialTasks(tasks);
      } catch (error) {
        console.error("Error fetching social tasks:", error);
      }
    };

    if (isOpen) {
      fetchSocialTasks();
    }
  }, [isOpen, customer.id]);

  useEffect(() => {
    const hasEnabledService = Object.values(socialTasks).some(
      (task) => task?.enabled
    );
    setIsAnyServiceEnabled(hasEnabledService);
  }, [socialTasks]);

  useEffect(() => {
    const initialLinkStatuses: { [key: string]: boolean } = {};
    Object.entries(socialTasks).forEach(([serviceKey, task]) => {
      if (task?.links) {
        task.links.forEach((_, index) => {
          const status = task.linkStatuses?.[index]?.enabled;
          initialLinkStatuses[`${serviceKey}-${index}`] = status ?? true;
        });
      }
    });
    setLinkStatuses(initialLinkStatuses);
  }, [socialTasks]);

  const handleMainToggle = async () => {
    if (isAnyServiceEnabled) {
      const confirmed = window.confirm(
        "Are you sure you want to disable all social media services?"
      );
      if (!confirmed) return;
    }

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    setLoading("main");
    try {
      const updatedTasks = { ...socialTasks };

      // Only toggle services that have links
      (Object.keys(updatedTasks) as PlatformType[]).forEach((key) => {
        const task = updatedTasks[key];
        if (task?.links && task.links.length > 0) {
          updatedTasks[key] = {
            ...task,
            enabled: !isAnyServiceEnabled,
          };
        }
      });

      const { error } = await supabase
        .from("customers")
        .update({
          social_tasks: updatedTasks,
        })
        .eq("id", customer.id);

      if (error) throw error;

      setSocialTasks(updatedTasks);
      setIsAnyServiceEnabled(!isAnyServiceEnabled);
      toast.success(
        `All services ${
          !isAnyServiceEnabled ? "enabled" : "disabled"
        } successfully`
      );

      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error("Error updating services:", error);
      toast.error("Failed to update services");
    } finally {
      setLoading(null);
    }
  };

  const validateSocialLink = (
    serviceKey: SocialTaskKey,
    link: string
  ): boolean => {
    const pattern = socialValidationPatterns[serviceKey];
    return pattern.test(link);
  };

  const handleAddLink = async (service: SocialService) => {
    if (!editingLink) {
      toast.error(`Please enter a ${service.name} link`);
      return;
    }

    if (!validateSocialLink(service.key, editingLink.link)) {
      toast.error(`Invalid ${service.name} link format`);
      return;
    }

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    setLoading(service.key);
    try {
      const platform = service.key as PlatformType;
      const platformName = getPlatformName(platform);

      // Get current max display order
      const { data: currentLinks } = await supabase
        .from("customer_social_links")
        .select("display_order")
        .eq("customer_id", customer.id)
        .eq("platform", platform)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (currentLinks?.[0]?.display_order || 0) + 1;

      // Insert new link
      const { error: linkError } = await supabase!
        .from("customer_social_links")
        .insert({
          customer_id: customer.id,
          platform: platform,
          platform_name: platformName,
          link_url: editingLink.link,
          is_primary: false,
          enabled: true,
          clicks: 0,
          type: service.type,
          display_order: nextOrder,
        });

      if (linkError) throw linkError;

      // Refresh social tasks
      const updatedTasks = await getCustomerSocialTasks(customer.id);
      setSocialTasks(updatedTasks);
      setEditingLink(null);
      setEditingService(null);

      toast.success("Link added successfully");
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Failed to save link");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleLink = async (
    serviceKey: SocialTaskKey,
    linkIndex: number
  ) => {
    setLoadingLinks((prev) => ({
      ...prev,
      [`${serviceKey}-${linkIndex}`]: true,
    }));

    const currentTask = socialTasks[
      serviceKey as PlatformType
    ] as SocialTaskConfig;
    const currentStatus = linkStatuses[`${serviceKey}-${linkIndex}`] ?? true;

    try {
      const updatedTask: SocialTaskConfig = {
        ...currentTask,
        enabled: currentTask?.enabled ?? true,
        clicks: currentTask?.clicks ?? 0,
        links: currentTask?.links ?? [],
        type: currentTask?.type ?? "LINK_VISITOR",

        linkStatuses: {
          ...(currentTask?.linkStatuses ?? {}),
          [linkIndex]: { enabled: !currentStatus, clicks: 0 },
        },
      };

      // Update database
      const { error } = await supabase!
        .from("customers")
        .update({
          social_tasks: {
            ...socialTasks,
            [serviceKey]: updatedTask,
          },
        })
        .eq("id", customer.id);

      if (error) throw error;

      // Update local states
      setLinkStatuses((prev) => ({
        ...prev,
        [`${serviceKey}-${linkIndex}`]: !currentStatus,
      }));

      setSocialTasks((prev) => ({
        ...prev,
        [serviceKey]: updatedTask,
      }));

      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error toggling link:", error);
      toast.error("Failed to toggle link");
      // Revert the status on error
      setLinkStatuses((prev) => ({
        ...prev,
        [`${serviceKey}-${linkIndex}`]: currentStatus,
      }));
    } finally {
      setLoadingLinks((prev) => ({
        ...prev,
        [`${serviceKey}-${linkIndex}`]: false,
      }));
    }
  };

  const handleDeleteLink = async (
    serviceKey: SocialTaskKey,
    linkIndex: number
  ) => {
    try {
      setLoading(serviceKey);

      const response = await fetch(
        `/api/nexus/customers/${customer.id}/social-tasks`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: serviceKey,
            linkIndex,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete link");
      }

      // Update local state
      setSocialTasks((prev) => {
        const updatedTasks = { ...prev };
        const currentLinks = [
          ...(updatedTasks[serviceKey as PlatformType]?.links || []),
        ];
        currentLinks.splice(linkIndex, 1);

        if (currentLinks.length === 0) {
          delete updatedTasks[serviceKey as PlatformType];
        } else {
          updatedTasks[serviceKey as PlatformType] = {
            ...updatedTasks[serviceKey as PlatformType],
            links: currentLinks,
            enabled: updatedTasks[serviceKey as PlatformType]?.enabled ?? false,
            clicks: updatedTasks[serviceKey as PlatformType]?.clicks ?? 0,
          };
        }

        return updatedTasks;
      });

      toast.success("Link deleted successfully");
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    } finally {
      setLoading(null);
    }
  };

  const handleEditStart = (serviceKey: SocialTaskKey, index: number) => {
    const link = socialTasks[serviceKey as PlatformType]?.links?.[index];
    if (link) {
      setEditingLink({ serviceKey, index, link });
    }
  };

  const handleEditCancel = () => {
    setEditingLink(null);
  };

  const handleEditLink = async (
    serviceKey: SocialTaskKey,
    linkIndex: number,
    newLink: string
  ) => {
    try {
      setLoading(serviceKey);

      const service = socialServices.find((s) => s.key === serviceKey);
      if (!service) {
        toast.error("Invalid service");
        return;
      }

      const { error } = await supabase!
        .from("customer_social_links")
        .update({ link: newLink })
        .eq("customer_id", customer.id)
        .eq("service_key", serviceKey)
        .eq(
          "link",
          socialTasks[serviceKey as PlatformType]?.links?.[linkIndex] || ""
        );

      if (error) throw error;

      // Update local state
      setSocialTasks((prev) => ({
        ...prev,
        [serviceKey]: {
          ...prev[serviceKey as PlatformType],
          links:
            prev[serviceKey as PlatformType]?.links?.map((link, idx) =>
              idx === linkIndex ? newLink : link
            ) || [],
        },
      }));

      setEditingLink(null);
      toast.success("Link updated successfully");
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error("Failed to update link");
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001]"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-[1002] p-0 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-6 sm:p-6 border-b border-gray-200">
            <h2 className="text-xl sm:text-lg font-semibold text-gray-900">
              Customer Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <FaTimes className="text-xl sm:text-base" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-5">
              <div className="mb-6">
                <h3 className="text-xl sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                  {customer.customer_name}
                </h3>
              </div>

              <div className="mb-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm sm:text-xs font-medium text-gray-700">
                      Social Media Services
                    </h4>
                    <button
                      onClick={handleMainToggle}
                      className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-2"
                    >
                      {loading === "main" ? (
                        <FaSpinner className="text-3xl sm:text-2xl text-gray-600 animate-spin" />
                      ) : isAnyServiceEnabled ? (
                        <FaToggleOn className="text-3xl sm:text-2xl text-gray-600" />
                      ) : (
                        <FaToggleOff className="text-3xl sm:text-2xl text-gray-400" />
                      )}
                    </button>
                  </div>

                  {socialServices.map((service) => (
                    <div key={service.name}>
                      <div className="w-full flex flex-col gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <service.icon
                              className={`text-2xl text-gray-700 sm:text-xl ${service.color} shrink-0`}
                            />
                            <span className="text-base sm:text-sm text-gray-700 shrink-0">
                              {capitalizeFirstLetter(service.name)}
                            </span>
                          </div>
                        </div>

                        {socialTasks[service.key as PlatformType]?.links?.map(
                          (link, index) => {
                            if (typeof link === "string") {
                              return (
                                <SocialLinkRow
                                  key={`${service.key}-${index}`}
                                  link={link}
                                  isEnabled={
                                    linkStatuses[`${service.key}-${index}`] ??
                                    true
                                  }
                                  isLoading={
                                    loadingLinks[`${service.key}-${index}`]
                                  }
                                  isEditing={
                                    editingLink?.serviceKey === service.key &&
                                    editingLink?.index === index
                                  }
                                  linkIndex={index}
                                  onEdit={() =>
                                    handleEditStart(service.key, index)
                                  }
                                  onDelete={async () =>
                                    handleDeleteLink(service.key, index)
                                  }
                                  onToggle={() =>
                                    handleToggleLink(service.key, index)
                                  }
                                  onEditSubmit={(newLink) =>
                                    handleEditLink(service.key, index, newLink)
                                  }
                                  onEditCancel={handleEditCancel}
                                />
                              );
                            }
                            return null;
                          }
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={
                              editingService === service.key && editingLink
                                ? editingLink.link
                                : ""
                            }
                            onChange={(e) => {
                              setEditingService(service.key);
                              setEditingLink({
                                serviceKey: service.key,
                                index: -1,
                                link: e.target.value,
                              });
                            }}
                            onFocus={() => setEditingService(service.key)}
                            placeholder={`Enter new ${service.name} link`}
                            className="w-full px-4 py-3 sm:py-2 text-base text-black sm:text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => {
                              if (editingLink) {
                                handleAddLink(service);
                                setEditingService(null);
                              }
                            }}
                            disabled={
                              editingService !== service.key ||
                              !editingLink ||
                              !validateSocialLink(service.key, editingLink.link)
                            }
                            className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0 p-2"
                          >
                            {loading === service.key ? (
                              <FaSpinner className="text-3xl sm:text-2xl text-blue-600 animate-spin" />
                            ) : (
                              <FaToggleOff className="text-3xl sm:text-2xl text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
