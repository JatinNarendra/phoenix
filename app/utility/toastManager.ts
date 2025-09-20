import { gameToast } from "./customToast";

interface ToastState {
  count: number;
  lastShown: {
    maxCapacity: number;
    noRecharge: number;
  };
}

const toastState: ToastState = {
  count: 0,
  lastShown: {
    maxCapacity: 0,
    noRecharge: 0,
  }
};

const TOAST_LIMIT = 4;
const TOAST_COOLDOWN = 2000; // 2 seconds

export type WebAppType = {
  HapticFeedback?: {
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
} | null | undefined;

export const showLimitedToast = (type: 'maxCapacity' | 'noRecharge', message: string, WebApp?: WebAppType) => {
  const now = Date.now();

  // Check if we've already reached the limit before showing new toast
  if (toastState.count >= TOAST_LIMIT) {
    // Add shake effect to existing toasts
    const toastElements = document.querySelectorAll('.Toastify__toast');
    toastElements.forEach(toast => {
      toast.classList.add('shake-animation');
      setTimeout(() => toast.classList.remove('shake-animation'), 500);
    });

    // Trigger haptic feedback if WebApp is available
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.notificationOccurred('error');
    }

    return;
  }

  // Show new toast only if we haven't reached the limit
  gameToast.info(message);
  toastState.count++;
  toastState.lastShown[type] = now;

  // Reset count after cooldown
  setTimeout(() => {
    toastState.count = Math.max(0, toastState.count - 1);
  }, TOAST_COOLDOWN);
}; 