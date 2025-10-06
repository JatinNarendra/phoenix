"use client";

import type { TelegramGameState } from "./telegram-server";

export interface TelegramUserData {
  id: number;
  is_bot: boolean;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  photo_url?: string | null;
}

export const updateTelegramUserProgress = async (
  userId: string,
  gameState: TelegramGameState,
  initData?: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/telegram/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateProgress',
        userId,
        gameState,
        initData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error updating user progress:", error);
    throw error;
  }
};

export const saveGameProgress = async (
  userId: string,
  gameState: TelegramGameState,
  initData?: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/telegram/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveProgress',
        userId,
        gameState,
        initData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error saving game progress:", error);
    throw error;
  }
};

export const getUserData = async (
  userId: string,
  initData?: string
): Promise<any> => {
  try {
    const params = new URLSearchParams({ userId });
    if (initData) {
      params.append('initData', initData);
    }

    const response = await fetch(`/api/telegram/user?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};