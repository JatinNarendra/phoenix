import { NextRequest, NextResponse } from "next/server";

// Configure function timeout for Vercel
export const maxDuration = 30; // 30 seconds
export const dynamic = "force-dynamic";

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Create invoice for Telegram Stars payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData, spinPackage } = body;

    // Basic validation
    if (!initData || !spinPackage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse user data from initData
    let user;
    try {
      const searchParams = new URLSearchParams(initData);
      const userParam = searchParams.get("user");

      if (userParam) {
        user = JSON.parse(decodeURIComponent(userParam));
      }
    } catch {
      // Ignore parsing error
      // Simplified error handling
      user = { id: "default_user" };
    }

    // Create invoice link using Telegram Bot API for Stars payments.
    const invoiceLinkData = {
      title: `${spinPackage.spins} Spins Package`,
      description: `Purchase ${spinPackage.spins} spins for Phoenix Game${
        spinPackage.bonus ? ` + ${spinPackage.bonus}% bonus spins` : ""
      }`,
      payload: JSON.stringify({
        type: "spin_purchase",
        userId: user.id,
        spins: spinPackage.spins,
        bonus: spinPackage.bonus || 0,
        packageId: spinPackage.id,
      }),
      provider_token: "", // Empty string for Telegram Stars payments
      currency: "XTR", // Telegram Stars
      prices: [
        {
          label: `${spinPackage.spins} Spins`,
          amount: spinPackage.price, // Price in Telegram Stars
        },
      ],
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false,
    };

    // Log the request payload for debugging
    console.log("Creating invoice with data:", {
      title: invoiceLinkData.title,
      description: invoiceLinkData.description,
      payload: invoiceLinkData.payload,
      provider_token: invoiceLinkData.provider_token,
      currency: invoiceLinkData.currency,
      prices: invoiceLinkData.prices,
    });

    // Create invoice link using Telegram Bot API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BOT_API_URL}/createInvoiceLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      body: JSON.stringify(invoiceLinkData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log the raw response for debugging
    console.log(
      "Telegram API response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to create invoice link:", errorData);
      return NextResponse.json(
        { error: `Failed to create payment invoice: ${errorData}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log("Telegram API createInvoiceLink response:", result);

    if (!result.ok) {
      console.error("Telegram API error:", result);

      // Check for specific Telegram API errors
      const errorDescription = result.description || "";

      // Log detailed error information
      console.error("Telegram API error details:", {
        errorCode: result.error_code,
        errorDescription: errorDescription,
        requestData: {
          title: invoiceLinkData.title,
          description: invoiceLinkData.description,
          currency: invoiceLinkData.currency,
          prices: invoiceLinkData.prices,
          provider_token_length: invoiceLinkData.provider_token.length,
        },
      });

      if (
        errorDescription.includes("expired") ||
        errorDescription.includes("invalid")
      ) {
        return NextResponse.json(
          { error: "Payment request expired. Please try again." },
          { status: 410 }
        );
      }

      if (errorDescription.includes("BOT_PAYMENT_PROVIDER_INVALID")) {
        return NextResponse.json(
          { error: "Payment provider not configured. Please contact support." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Failed to create payment invoice: ${errorDescription}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: result.result,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Telegram API timeout after 10 seconds");
      return NextResponse.json(
        {
          error:
            "Payment service is taking longer than expected. Please try again.",
        },
        { status: 408 }
      );
    }

    console.error("Error creating invoice link:", err);
    return NextResponse.json(
      { error: "Failed to create payment invoice" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Stars payment endpoint - POST method required" },
    { status: 405 }
  );
}
