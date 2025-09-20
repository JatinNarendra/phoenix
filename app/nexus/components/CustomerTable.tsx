"use client";
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
  memo,
} from "react";
import { Customer, ServiceType } from "@/app/types/Customer";
import { FaTrash, FaSpinner } from "react-icons/fa";
import { FaTelegram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { supabase } from "@/lib/supabase";
import CustomerDetailsModal from "./CustomerDetailsModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import {
  mapDatabaseCustomerToCustomer,
  DatabaseCustomer,
} from "@/app/lib/typeGuards";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type SocialServiceKey = keyof Customer["socialTasks"];

interface SocialService {
  icon: React.ComponentType;
  color: string;
  key: SocialServiceKey;
  name: string;
  type: ServiceType;
}

const socialServices: SocialService[] = [
  {
    icon: FaTelegram,
    color: "text-blue-500",
    key: "TELEGRAM_CHANNEL",
    name: "Telegram",
    type: "TELEGRAM_CHANNEL",
  },
  {
    icon: FaXTwitter,
    color: "text-gray-700",
    key: "X",
    name: "x",
    type: "X",
  },
  {
    icon: FaYoutube,
    color: "text-red-600",
    key: "YOUTUBE_VIEWS",
    name: "YouTube",
    type: "YOUTUBE_VIEWS",
  },
];

export type CustomerTableRef = {
  fetchCustomers: () => Promise<void>;
};

const CustomerTable = forwardRef<CustomerTableRef>((props, ref) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  const fetchCustomers = useCallback(async () => {
    try {
      if (!supabase) {
        console.error("Supabase client not available");
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        throw error;
      }

      const mappedCustomers = await Promise.all(
        (data || []).map((customer) => mapDatabaseCustomerToCustomer(customer))
      );

      setCustomers(mappedCustomers);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching customers:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error("Unknown error fetching customers:", error);
      }
    }
  }, []);

  const handleRealtimeUpdate = useCallback(
    async (payload: { new: DatabaseCustomer; old: DatabaseCustomer }) => {
      if (payload.new) {
        const newCustomer = await mapDatabaseCustomerToCustomer(payload.new);
        setCustomers((prev) => {
          const index = prev.findIndex((c) => c.id === newCustomer.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = newCustomer;
            return updated;
          }
          return [newCustomer, ...prev];
        });
      } else if (payload.old) {
        setCustomers((prev) =>
          prev.filter((customer) => customer.id !== payload.old.id)
        );
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!mounted) return;
      await fetchCustomers();
    };

    loadInitialData();

    // Set up real-time subscription with error handling and reconnection
    if (!supabase) {
      console.error("Supabase client not available for realtime subscription");
      return;
    }

    const channel = supabase.channel("customers_changes");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        (payload) => {
          if (mounted) {
            handleRealtimeUpdate(
              payload as RealtimePostgresChangesPayload<DatabaseCustomer>
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription and mounted flag
    return () => {
      mounted = false;
      void supabase?.removeChannel(channel);
    };
  }, [fetchCustomers, handleRealtimeUpdate]);

  // Memoize active services count calculation
  const getActiveServicesCount = useCallback((customer: Customer) => {
    return Object.values(customer.socialTasks).filter(
      (task) => task?.enabled && task.links?.length > 0
    ).length;
  }, []);

  // Memoize sorted customers
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aActiveCount = getActiveServicesCount(a);
      const bActiveCount = getActiveServicesCount(b);

      if (aActiveCount !== bActiveCount) {
        return bActiveCount - aActiveCount;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [customers, getActiveServicesCount]);

  // Memoize customer row rendering
  const CustomerRow = useCallback(
    ({ customer }: { customer: Customer }) => (
      <tr key={customer.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-gray-900 cursor-text select-text w-1/3">
          {customer.customer_name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap w-1/3">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {socialServices
                .filter((service) => customer.socialTasks[service.key]?.enabled)
                .map((service) => (
                  <div
                    key={service.key}
                    className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border-2 border-white ${service.color}`}
                  >
                    <service.icon />
                  </div>
                ))}
            </div>
            <span className="text-sm text-gray-500 cursor-text select-text">
              {getActiveServicesCount(customer)} active
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-1/3">
          <button
            onClick={() => setCustomerToDelete(customer)}
            className="text-red-600 hover:text-red-700"
          >
            <FaTrash className="text-lg" />
          </button>
        </td>
      </tr>
    ),
    [getActiveServicesCount]
  );

  const handleDelete = async (password: string) => {
    if (!customerToDelete) {
      throw new Error("No customer selected for deletion");
    }

    try {
      // First, delete all social links
      const { error: socialLinksError } = await supabase!
        .from("customer_social_links")
        .delete()
        .eq("customer_id", customerToDelete.id);

      if (socialLinksError) {
        console.error("Error deleting social links:", socialLinksError);
      }

      // Then delete the customer
      const response = await fetch(
        `/api/nexus/customers/${customerToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      console.log("Delete response status:", response.status);
      console.log("Delete response headers:", response.headers);

      let data;
      try {
        const responseText = await response.text();
        console.log("Delete response text:", responseText);
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete customer");
      }

      setCustomerToDelete(null);
      setRefreshing(true);
      await fetchCustomers();
      setRefreshing(false);
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to delete customer");
    }
  };

  useImperativeHandle(ref, () => ({
    fetchCustomers,
  }));

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow relative">
        {refreshing && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <FaSpinner className="text-blue-600 text-2xl animate-spin" />
          </div>
        )}
        <div className="min-w-full divide-y divide-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Services
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCustomers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          onUpdate={fetchCustomers}
        />
      )}

      <DeleteConfirmationModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDelete}
        customerName={customerToDelete?.customer_name || ""}
      />
    </>
  );
});

CustomerTable.displayName = "CustomerTable";

export default memo(CustomerTable);
