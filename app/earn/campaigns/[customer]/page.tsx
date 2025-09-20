import React from "react";
import { CustomerCampaignClient } from "./CustomerCampaignClient";
import { CustomerSocialLink } from "@/app/types/Customer";
import { supabase } from "@/lib/supabase";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ customer: string }>;
}): Promise<Metadata> {
  const { customer } = await params;
  return {
    title: `Campaign - ${customer}`,
  };
}

interface CustomerData {
  id: string;
  customer_name: string;
  campaign_name?: string;
  campaign_details?: string;
  logo_url: string | null;
  customer_social_links: Array<{
    id: string;
    platform: string;
    link_url: string;
    enabled: boolean;
    rewards?: {
      coins?: number;
      spins?: number;
    };
    type: string;
  }>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ customer: string }>;
}) {
  const { customer } = await params;
  const customerName = decodeURIComponent(customer);

  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  // Since this is a server component, we can fetch the initial data here
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select(
      `
      id,
      customer_name,
      campaign_name,
      campaign_details,
      logo_url,
      customer_social_links (
        id,
        platform,
        link_url,
        enabled,
        rewards,
        type
      )
    `
    )
    .eq("customer_name", customerName)
    .single();

  if (customerError || !customerData) {
    throw new Error("Failed to load customer data");
  }

  const typedCustomerData = customerData as CustomerData;
  const tasks = typedCustomerData.customer_social_links || [];
  const totalCoins = tasks.reduce(
    (sum: number, task) => sum + (task.rewards?.coins || 0),
    0
  );
  const totalSpins = tasks.reduce(
    (sum: number, task) => sum + (task.rewards?.spins || 0),
    0
  );

  const formattedData = {
    id: typedCustomerData.id,
    customer_name: typedCustomerData.customer_name,
    campaign_name: typedCustomerData.campaign_name,
    campaign_details: typedCustomerData.campaign_details,
    logo_url: typedCustomerData.logo_url,
    tasks: tasks as CustomerSocialLink[],
    totalCoins,
    totalSpins,
    totalTasks: tasks.length,
  };

  return <CustomerCampaignClient customerData={formattedData} />;
}
