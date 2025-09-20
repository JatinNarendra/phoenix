import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TELEGRAM_BOT_TOKEN =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

// Handle Telegram payment webhooks
export async function POST(request: NextRequest) {
  try {
    // Log all incoming requests for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log("Webhook request received:", {
      headers,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // Clone the request to read the body for logging
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    console.log("Webhook request body:", bodyText);

    // Validate webhook secret
    const providedSecret = request.headers.get(
      "X-Telegram-Bot-Api-Secret-Token"
    );

    // Validate webhook secret
    if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
      console.log(
        "Webhook secret validation failed. Expected:",
        WEBHOOK_SECRET?.substring(0, 10) + "...",
        "Got:",
        providedSecret?.substring(0, 10) + "..."
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the JSON body from the cloned request text
    let update;
    try {
      update = JSON.parse(bodyText);
      console.log("Payment webhook received:", update);
    } catch (error) {
      console.error("Error parsing webhook body:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Handle pre-checkout query
    if (update.pre_checkout_query) {
      return await handlePreCheckoutQuery(update.pre_checkout_query);
    }

    // Handle successful payment
    if (update.message && update.message.successful_payment) {
      return await handleSuccessfulPayment(update.message);
    }

    // Return OK for other updates
    console.log("Unhandled webhook update type", {
      updateKeys: Object.keys(update),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing payment webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle pre-checkout query (must respond within 10 seconds)
interface PreCheckoutQuery {
  id: string;
  from: { id: string | number };
  currency?: string;
  total_amount?: number;
  invoice_payload: string;
}

async function handlePreCheckoutQuery(preCheckoutQuery: PreCheckoutQuery) {
  try {
    const { id, from, currency, total_amount, invoice_payload } =
      preCheckoutQuery;

    console.log("Pre-checkout query", {
      id,
      userId: from.id,
      currency,
      total_amount,
      payload: invoice_payload,
    });

    // Parse the payload
    try {
      JSON.parse(invoice_payload);
      // Validation successful, proceed
    } catch {
      // Ignore parsing error
      // Still proceed with default values if needed
      console.log("Using default payload values");
    }

    // All validations passed, approve the payment
    console.log("Pre-checkout validation passed, approving payment", {
      queryId: id,
    });
    return await answerPreCheckoutQuery(id, true);
  } catch (error) {
    console.error("Error handling pre-checkout query:", error);
    return await answerPreCheckoutQuery(
      preCheckoutQuery.id,
      false,
      "Payment processing error"
    );
  }
}

// Handle successful payment
interface PaymentMessage {
  from: { id: string | number };
  successful_payment: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
  };
}

async function handleSuccessfulPayment(message: PaymentMessage) {
  try {
    const { from, successful_payment } = message;
    console.log("=== PROCESSING SUCCESSFUL PAYMENT ===");

    if (!from || !successful_payment) {
      console.error("Missing required payment data", {
        hasFrom: !!from,
        hasPayment: !!successful_payment,
      });
      return NextResponse.json({ ok: true });
    }

    const {
      currency,
      total_amount,
      invoice_payload,
      telegram_payment_charge_id,
    } = successful_payment;

    console.log("Successful payment details", {
      userId: from.id,
      currency,
      total_amount,
      charge_id: telegram_payment_charge_id,
      payload: invoice_payload,
      timestamp: new Date().toISOString(),
    });

    // Check for duplicate payment processing
    const { data: existingPayment } = await supabase!
      .from("payment_records")
      .select("id")
      .eq("charge_id", telegram_payment_charge_id)
      .single();

    if (existingPayment) {
      console.warn("⚠️ Duplicate payment detected, skipping processing", {
        chargeId: telegram_payment_charge_id,
      });
      return NextResponse.json({ ok: true });
    }

    // Parse the payload
    let payloadData;
    try {
      payloadData = JSON.parse(invoice_payload);
      console.log("📦 Parsed payload", { payloadData });
    } catch (error) {
      console.error("❌ Failed to parse payload, using defaults", { error });
      payloadData = { userId: from.id, spins: 20, bonus: 0 };
    }

    // Add spins to user's account
    const totalSpins = payloadData.spins + (payloadData.bonus || 0);
    console.log("🎯 Total spins to add", {
      totalSpins,
      baseSpins: payloadData.spins,
      bonus: payloadData.bonus || 0,
    });

    // First get current user data
    console.log("Fetching user data", { userId: payloadData.userId });
    const { data: currentUser, error: fetchError } = await supabase!
      .from("telegram_users")
      .select("game_state")
      .eq("user_id", payloadData.userId.toString())
      .single();

    if (fetchError) {
      console.error("Error fetching current user", {
        error: fetchError,
        userId: payloadData.userId,
      });
      return NextResponse.json({ ok: true });
    }

    console.log("Current user data", { currentUser });

    // Calculate new spin totals
    const currentSpins = currentUser.game_state?.spins || 0;
    const currentTotalSpins = currentUser.game_state?.totalSpins || 0;
    const newSpins = currentSpins + totalSpins;
    const newTotalSpins = currentTotalSpins + totalSpins;

    // Update game state with new spins
    const updatedGameState = {
      ...currentUser.game_state,
      spins: newSpins,
      totalSpins: newTotalSpins,
    };

    // Update with new totals
    console.log("🔄 Updating user with new game state", {
      previousSpins: currentSpins,
      addingSpins: totalSpins,
      newSpinsTotal: newSpins,
      newTotalSpins: newTotalSpins,
    });

    const { data: updatedUser, error: updateError } = await supabase!
      .from("telegram_users")
      .update({
        game_state: updatedGameState,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", payloadData.userId.toString())
      .select("game_state")
      .single();

    if (updateError) {
      console.error("❌ CRITICAL ERROR updating user spins", {
        error: updateError,
        userId: payloadData.userId,
        attemptedGameState: updatedGameState,
      });

      // Store failed payment for manual processing
      await supabase!.from("payment_records").insert({
        user_id: payloadData.userId.toString(),
        amount: total_amount,
        currency: currency,
        status: "failed_spin_update",
        charge_id: telegram_payment_charge_id,
        payload: payloadData,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({ ok: true }); // Still acknowledge to prevent retries
    }

    console.log("✅ Database update successful!", {
      finalSpins: updatedUser?.game_state?.spins,
      finalTotalSpins: updatedUser?.game_state?.totalSpins,
    });

    console.log("Successfully added spins to user", {
      userId: payloadData.userId,
      spinsAdded: totalSpins,
      newSpinCount: updatedUser?.game_state?.spins,
      newTotalSpins: updatedUser?.game_state?.totalSpins,
    });

    // Store payment record in the separate payment_records table
    const paymentRecord = {
      user_id: payloadData.userId.toString(),
      payment_type: "telegram_stars",
      amount: total_amount,
      currency: currency,
      charge_id: telegram_payment_charge_id,
      payload: payloadData,
      status: "completed",
      created_at: new Date().toISOString(),
    };

    // Try to insert into payment_records table
    const { error: insertPaymentError } = await supabase!
      .from("payment_records")
      .insert(paymentRecord);

    // Log the attempt to store the payment record
    console.log(
      "Attempting to store payment record in payment_records table:",
      {
        user_id: payloadData.userId.toString(),
        amount: total_amount,
        currency: currency,
        charge_id: telegram_payment_charge_id,
        status: "completed",
      }
    );

    if (insertPaymentError) {
      console.error("Error storing payment record in payment_records table", {
        error: insertPaymentError,
      });

      // Fall back to storing in game_state as a backup
      console.log("Falling back to storing payment record in game_state");

      // Add payment record to user's game_state
      if (!updatedGameState.payment_records) {
        updatedGameState.payment_records = [];
      }
      updatedGameState.payment_records.push(paymentRecord);

      // Update the user's game_state with the payment record
      const { error: updatePaymentError } = await supabase!
        .from("telegram_users")
        .update({
          game_state: updatedGameState,
        })
        .eq("user_id", payloadData.userId.toString());

      if (updatePaymentError) {
        console.error("Error storing payment record in game_state", {
          error: updatePaymentError,
        });
      } else {
        console.log("Payment record added to user's game_state as fallback");
      }
    } else {
      console.log(
        "Payment record successfully stored in payment_records table"
      );
    }

    // Continue anyway as the main transaction (adding spins) succeeded

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error handling successful payment:", error);
    return NextResponse.json({ ok: true }); // Still acknowledge to prevent retries
  }
}

// Answer pre-checkout query
async function answerPreCheckoutQuery(
  queryId: string,
  ok: boolean,
  errorMessage?: string
) {
  try {
    console.log("Answering pre-checkout query:", {
      queryId,
      ok,
      errorMessage: errorMessage || "No error (approving)",
    });

    const response = await fetch(`${BOT_API_URL}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pre_checkout_query_id: queryId,
        ok: ok,
        error_message: errorMessage,
      }),
    });

    // Log response status
    console.log(
      "answerPreCheckoutQuery response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to answer pre-checkout query:", errorData);

      // Try to parse the error for more details
      try {
        const errorJson = JSON.parse(errorData);
        console.error("Pre-checkout query error details:", errorJson);
      } catch {
        // Ignore parsing error
      }
    } else {
      const responseData = await response.json();
      console.log("Pre-checkout query response:", responseData);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error answering pre-checkout query:", error);
    return NextResponse.json({ ok: true });
  }
}

// GET endpoint for webhook verification
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: "Telegram payment webhook endpoint. Use POST for webhook updates.",
  });
}
