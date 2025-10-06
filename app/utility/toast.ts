import { toast, ToastOptions } from "react-hot-toast";

interface CustomToastOptions extends ToastOptions {
  onClose?: () => void;
}

interface ActiveToast {
  id: string;
  timestamp: number;
}

const MAX_TOASTS = 3;
let activeToasts: ActiveToast[] = [];

export const showToast = (
  message: string | React.ReactNode,
  options?: Partial<CustomToastOptions>
) => {
  // If we've reached the maximum, remove the oldest toast
  if (activeToasts.length >= MAX_TOASTS) {
    const oldestToast = activeToasts.shift();
    if (oldestToast) {
      toast.dismiss(oldestToast.id);
    }
  }

  // Create unique ID for the toast
  const toastId = Date.now().toString();

  // Create the new toast
  const toastPromise = toast(message as string, {
    ...options,
    id: toastId,
  });

  // Add to active toasts
  activeToasts.push({
    id: toastId,
    timestamp: Date.now(),
  });

  // Handle cleanup when toast is dismissed
  Promise.resolve(toastPromise).then(() => {
    activeToasts = activeToasts.filter((t) => t.id !== toastId);
    options?.onClose?.();
  });

  return toastPromise;
};
