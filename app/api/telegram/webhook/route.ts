import { NextResponse } from "next/server";
import { handleStartCommand } from "@/app/lib/telegram";
import { initializeUserOnce } from "@/app/lib/userInitializer";
import { TelegramWebApp } from "@/app/types/telegram";

// Webhook secret token for added security
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function GET(_request: Request) {
  // Simple response for health check
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: Request) {
  try {
    const headerSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

    // Verify the secret token
    if (WEBHOOK_SECRET && headerSecret !== WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await request.json();

    // Log the received update for debugging
    console.log("Received webhook update:", JSON.stringify(update));

    // Validate that this is a message update
    if (!update || !update.message) {
      console.log("Not a message update, ignoring");
      return NextResponse.json({ ok: true });
    }

    // Get the message and sender info
    const { message } = update;

    if (!message.from) {
      console.error("Message has no sender information");
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Handle /start command
    if (update.message?.text?.startsWith("/start")) {
      const userId = update.message.from.id;

      // Extract the start parameter if present
      let startParam = null;
      if (update.message.text.length > 6) {
        // "/start".length = 6
        startParam = update.message.text.substring(7).trim();
      }

      console.log(
        "Processing /start command for user:",
        userId,
        "with param:",
        startParam
      );

      try {
        // First try the actual handler
        const result = await handleStartCommand(userId, startParam);
        console.log("/start command processing result:", result);

        if (!result) {
          console.error("Failed to process /start command");

          // Create a dummy WebApp object with user data for the initializer
          const dummyWebApp: TelegramWebApp = {
            platform: "webhook",
            isTelegramApp: true,
            BackButton: {
              show: () => {},
              hide: () => {},
              onClick: () => {},
              offClick: () => {},
              isVisible: false,
            },
            HapticFeedback: {
              impactOccurred: () => {},
              notificationOccurred: () => {},
              selectionChanged: () => {},
            },
            enableClosingConfirmation: () => {},
            disableClosingConfirmation: () => {},
            onEvent: () => {},
            offEvent: () => {},
            initData: "webhook_init",
            initDataUnsafe: {
              user: {
                id: userId,
                username: update.message.from.username,
                first_name: update.message.from.first_name,
                last_name: update.message.from.last_name,
                language_code: update.message.from.language_code,
              },
            },
            close: () => {},
            openLink: () => {},
            ready: () => {},
          };

          // Use the standardized singleton function
          const initResult = await initializeUserOnce(dummyWebApp);

          if (!initResult.success) {
            console.error(
              "Failed to initialize user:",
              initResult.error || "Unknown error"
            );
            return NextResponse.json(
              {
                error: "Failed to process start command",
                details: initResult.error || "Unknown error",
              },
              { status: 500 }
            );
          }

          console.log("Fallback initialization successful");
          return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: true, result });
      } catch (error) {
        console.error("Error processing /start command:", error);
        return NextResponse.json(
          { error: "Internal server error processing start command" },
          { status: 500 }
        );
      }
    }

    // Handle other commands here
    console.log("Unhandled command or message:", update.message?.text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
