"use client";

import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { PlatformType } from "@/app/types/Customer";
import toast from "react-hot-toast";
import { getPlatformName } from "@/app/lib/platformUtils";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  platform: PlatformType;
  currentHandle: string;
  customerId: string;
  currentSparkValue: number;
  currentSpinValue: number;
  onTaskUpdated: (updatedHandle: string, updatedSparkValue: number, updatedSpinValue: number) => Promise<void>;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  taskId,
  platform,
  currentHandle,
  customerId,
  currentSparkValue = 0,
  currentSpinValue = 0,
  onTaskUpdated,
}: EditTaskModalProps) {
  const [handle, setHandle] = useState(currentHandle);
  const [sparkValue, setSparkValue] = useState(currentSparkValue);
  const [spinValue, setSpinValue] = useState(currentSpinValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHandle(currentHandle);
    setSparkValue(currentSparkValue);
    setSpinValue(currentSpinValue);
  }, [currentHandle, currentSparkValue, currentSpinValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) {
      toast.error("Please enter a valid handle");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/nexus/customers/${customerId}/social-tasks`,
        {
          method: "PATCH",
          body: JSON.stringify({
            taskId,
            updates: {
              linkUrl: handle,
              rewards: {
                coins: sparkValue,
                spins: spinValue
              }
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      await onTaskUpdated(handle, sparkValue, spinValue);
      toast.success("Task updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit {getPlatformName(platform)} Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handle/URL
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full rounded-lg border text-black border-grey-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SPARK Value
            </label>
            <input
              type="number"
              value={sparkValue}
              onChange={(e) => setSparkValue(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              className="w-full rounded-lg border text-black border-grey-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SPIN Value
            </label>
            <input
              type="number"
              value={spinValue}
              onChange={(e) => setSpinValue(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              className="w-full rounded-lg border text-black border-grey-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
