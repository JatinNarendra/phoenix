"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Add environment check helper
const isDevelopment = process.env.NODE_ENV === "development";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCustomerModal({
  isOpen,
  onClose,
}: AddCustomerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [campaignBudget, setCampaignBudget] = useState(0);
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const router = useRouter();

  const validateForm = () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return false;
    }

    if (campaignStartDate && campaignEndDate) {
      const startDate = new Date(campaignStartDate);
      const endDate = new Date(campaignEndDate);
      if (startDate > endDate) {
        toast.error("Campaign end date must be after start date");
        return false;
      }
    }

    if (campaignBudget < 0) {
      toast.error("Campaign budget cannot be negative");
      return false;
    }

    if (logoUrl && !isValidUrl(logoUrl)) {
      toast.error("Please enter a valid logo URL");
      return false;
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      toast.error("Please enter a valid website URL");
      return false;
    }

    return true;
  };

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }

    setIsLoading(true);

    try {
      const { error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName.trim(),
          description: description.trim(),
          logo_url: logoUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          is_active: true,
          campaign_budget: campaignBudget,
          campaign_start_date: campaignStartDate || null,
          campaign_end_date: campaignEndDate || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (customerError) {
        if (customerError.code === "23505") {
          // Unique violation
          toast.error("A customer with this name already exists");
        } else {
          if (isDevelopment) {
            console.error("Error adding customer:", customerError);
            toast.error(`Failed to add customer: ${customerError.message}`);
          } else {
            toast.error("Something went wrong. Please try again later.");
          }
        }
        return;
      }

      toast.success("Customer added successfully");
      onClose();
      router.refresh();
    } catch (error) {
      if (isDevelopment) {
        console.error("Error adding customer:", error);
        toast.error(
          `Failed to add customer: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              maxLength={100}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              maxLength={500}
              placeholder="Enter customer description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Campaign Budget
            </label>
            <input
              type="number"
              value={campaignBudget}
              onChange={(e) => setCampaignBudget(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min="0"
              step="0.01"
              placeholder="Enter campaign budget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Campaign Start Date
            </label>
            <input
              type="date"
              value={campaignStartDate}
              onChange={(e) => setCampaignStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Campaign End Date
            </label>
            <input
              type="date"
              value={campaignEndDate}
              onChange={(e) => setCampaignEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min={campaignStartDate || new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Adding...
                </>
              ) : (
                "Add Customer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
