import { toast, ToastOptions, Toast } from "react-hot-toast";
import React from 'react';
import { GameToastContent } from "../components/GameToast";

interface GameToastOptions extends ToastOptions {
  variant?: 'success' | 'error' | 'info' | 'reward';
  icon?: React.ReactNode;
  onClose?: () => void;
}

interface ActiveGameToast {
  id: string;
  timestamp: number;
}

const MAX_GAME_TOASTS = 3;
let activeGameToasts: ActiveGameToast[] = [];

const defaultGameToastStyles = {
  padding: '16px',
  maxWidth: '100%',
  width: '100%',
  backdropFilter: 'blur(14px)',
  backgroundColor: 'rgba(41, 24, 24, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
} as const;

const createToastContent = (t: Toast, message: React.ReactNode, variant?: string) => {
  return React.createElement(GameToastContent, {
    t,
    message,
    variant,
  });
};

export const showGameToast = (
  message: string | React.ReactNode,
  toastOptions?: Partial<GameToastOptions>
): string => {
  // If we've reached the maximum, remove the oldest toast
  if (activeGameToasts.length >= MAX_GAME_TOASTS) {
    const oldestToast = activeGameToasts.shift();
    if (oldestToast) {
      toast.dismiss(oldestToast.id);
    }
  }

  // Create unique ID for the toast
  const newToastId = Date.now().toString();

  // Add variant-specific class if provided
  const variantClass = toastOptions?.variant ? `game-toast-${toastOptions.variant}` : '';

  // Create the new toast
  const newToastPromise = toast(
    (t: Toast) => createToastContent(t, message, toastOptions?.variant),
    {
      ...toastOptions,
      id: newToastId,
      style: {
        ...defaultGameToastStyles,
        ...toastOptions?.style,
      },
      className: `game-toast ${variantClass} ${toastOptions?.className || ''}`,
      duration: toastOptions?.duration || 3000,
      position: 'top-center',
    }
  );

  // Add to active toasts
  activeGameToasts.push({
    id: newToastId,
    timestamp: Date.now(),
  });

  // Handle cleanup when toast is dismissed
  void Promise.resolve(newToastPromise).then(() => {
    activeGameToasts = activeGameToasts.filter((t) => t.id !== newToastId);
    toastOptions?.onClose?.();
  });

  return newToastId;
};

// Convenience methods for different toast types
export const gameToast = {
  success: (message: string | React.ReactNode, options?: Partial<GameToastOptions>) =>
    showGameToast(message, { ...options, variant: 'success' }),
  error: (message: string | React.ReactNode, options?: Partial<GameToastOptions>) =>
    showGameToast(message, { ...options, variant: 'error' }),
  info: (message: string | React.ReactNode, options?: Partial<GameToastOptions>) =>
    showGameToast(message, { ...options, variant: 'info' }),
  reward: (message: string | React.ReactNode, options?: Partial<GameToastOptions>) =>
    showGameToast(message, { ...options, variant: 'reward' }),
}; 