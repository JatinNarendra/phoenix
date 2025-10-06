export interface HapticFeedback {
  impactOccurred: (
    style: "light" | "medium" | "heavy" | "rigid" | "soft"
  ) => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
}

export interface TelegramWebApp {
  platform: string;
  isTelegramApp: boolean;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    isVisible: boolean;
  };
  HapticFeedback: HapticFeedback;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  enableVerticalSwipes?: () => void;
  disableVerticalSwipes?: () => void;
  onEvent: (event: string, callback: () => void) => void;
  offEvent: (event: string, callback: () => void) => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name: string;
      last_name?: string;
      language_code?: string;
      photo_url?: string;
      allows_write_to_pm?: boolean;
    };
    start_param?: string;
  };
  close: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  ready: () => void;
  openInvoice?: (
    invoiceUrl: string,
    callback: (status: string) => void
  ) => void;
}

export interface WebAppInstance {
  instance: TelegramWebApp | null;
  isLoading: boolean;
  error: Error | null;
  isTelegramApp: boolean;
  isReady: boolean;
  showBackButton: () => void;
  hideBackButton: () => void;
  enableCloseConfirmation: () => void;
  disableCloseConfirmation: () => void;
  triggerHapticFeedback: (
    intensity?: "light" | "medium" | "heavy" | "rigid" | "soft"
  ) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
