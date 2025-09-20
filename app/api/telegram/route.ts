import { NextResponse } from "next/server";
import { GameState } from "@/app/types/gameTypes";
import {
  validateTelegramWebAppData,
  getTelegramUser
} from "@/app/lib/telegram";
import { initializeUserOnce } from "@/app/lib/userInitializer";
import { TelegramWebApp } from "@/app/types/telegram";
import { initialGameState } from "@/app/constants/gameConstants";

export async function POST(request: Request) {
  try {
    const { user, initData } = await request.json();

    // Validate the incoming data
    const isValid = await validateTelegramWebAppData(initData);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 401 }
      );
    }

    // Optionally fetch fresh user data from Telegram API
    const telegramUser = await getTelegramUser(user.id);
    if (!telegramUser) {
      return NextResponse.json(
        { error: "Failed to fetch user data from Telegram" },
        { status: 400 }
      );
    }

    // Use the verified user data
    const userData = telegramUser || user;
    
    // Create a dummy WebApp object with user data for the initializer
    const dummyWebApp: TelegramWebApp = {
      platform: "api",
      isTelegramApp: true,
      BackButton: {
        show: () => {},
        hide: () => {},
        onClick: () => {},
        offClick: () => {},
        isVisible: false
      },
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {}
      },
      enableClosingConfirmation: () => {},
      disableClosingConfirmation: () => {},
      onEvent: () => {},
      offEvent: () => {},
      initData: "api_init_data",
      initDataUnsafe: {
        user: {
          id: userData.id,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          language_code: userData.language_code,
          photo_url: userData.photo_url || undefined
        }
      },
      close: () => {},
      openLink: () => {},
      ready: () => {}
    };
    
    // Initialize the user first using the singleton
    const { success, error: initError } = await initializeUserOnce(dummyWebApp);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to initialize user", details: initError },
        { status: 500 }
      );
    }

    // Create initial game state
    const initialState: GameState = {
      ...initialGameState,
      user_id: userData.id.toString(),
      gameVersion: "1.0.0", // Use a specific version
      lastUpdate: Date.now(),
      // Any other properties that need to override the defaults
      characterProgress: {
        currentCharacter: "3",
        currentTokens: 0,
        requiredTokens: 10
      }
    };

    // Make response
    return NextResponse.json({ user: userData, gameState: initialState });
  } catch (error) {
    console.error("Error in /api/telegram:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}