"use client";
import React from "react";
import { Customer } from "@/app/types/Customer";
import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const router = useRouter();

  // Helper function to validate URL
  const isValidUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Check if any social service is enabled and has links
  const isActive = Object.values(customer.socialTasks).some(
    (task) => task.enabled && task.links?.length && task.links.length > 0
  );

  // Update the service count logic
  const serviceCounts = Object.entries(customer.socialTasks).reduce(
    (acc, [, task]) => {
      if (task.enabled) {
        const activeLinks =
          task.links?.filter((link) => link.enabled).length || 0;
        acc.active += activeLinks;
        acc.inactive += (task.links?.length || 0) - activeLinks;
      } else {
        acc.inactive += task.links?.length || 0;
      }
      return acc;
    },
    { active: 0, inactive: 0 }
  );

  const handleClick = () => {
    if (onClick) {
      onClick(customer);
    } else {
      router.push(`/nexus/${customer.slug}`);
    }
  };

  return (
    <Link href={`/nexus/${customer.slug}`} onClick={handleClick}>
      <div
        className={`
        h-48 rounded-xl p-4 hover:shadow-md transition-all duration-300 relative
        ${
          isActive
            ? "bg-gradient-to-br from-white to-green-50 border-2 border-green-200"
            : "bg-white border border-gray-200"
        }
        group
      `}
      >
        {/* Logo - Updated to be round */}
        <div className="absolute left-4 top-4 w-12 h-12 rounded-full overflow-hidden border border-gray-200">
          {customer.logo_url && isValidUrl(customer.logo_url) ? (
            <Image
              src={customer.logo_url}
              alt={`${customer.customer_name} logo`}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              {customer.customer_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="absolute right-1 top-1 w-16 h-16 flex items-center justify-center">
          <div
            className={`
            absolute inset-0 rounded-full 
            ${
              isActive
                ? "bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-200"
                : "bg-gradient-to-br from-gray-300 to-gray-400"
            }
            opacity-20 blur-lg
          `}
          />
          <div
            className={`
            relative flex flex-col items-center justify-center
            ${isActive ? "text-green-600" : "text-gray-400"}
          `}
          >
            {isActive ? (
              <FaCheckCircle
                className="text-2xl mb-0.5 text-green-600"
                style={{ color: "#16a34a" }}
              />
            ) : null}
          </div>
        </div>

        <div className="h-full flex flex-col justify-between pt-16">
          <div>
            <h3 className="text-xl font-semibold text-gray-700 group-hover:text-green-600 transition-colors pr-12">
              {customer.customer_name}
            </h3>
          </div>

          {/* Status Counts */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Active</span>
              <span className="text-2xl font-semibold text-green-600">
                {serviceCounts.active}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500">Inactive</span>
              <span className="text-2xl font-semibold text-gray-400">
                {serviceCounts.inactive}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
