import React from "react";
import { gameToast } from "./customToast";
import { SpinCard } from "../types/gameTypes";
import { TelegramWebApp } from "../types/telegram";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Handles the purchase of spin packages using Telegram Stars
 */
export async function handleSpinPurchase({
  purchaseOption,
  WebApp,
  increaseSpins,
  router,
  setIsLoading,
}: {
  purchaseOption: SpinCard;
  WebApp: TelegramWebApp;
  increaseSpins: (amount: number) => void;
  router: AppRouterInstance;
  setIsLoading: (loading: boolean) => void;
}) {
  if (!purchaseOption || !WebApp) return;

  setIsLoading(true);

  try {
    // Check if this is a free package (for testing)
    if (purchaseOption.freeForNow) {
      // Handle free packages
      increaseSpins(purchaseOption.spins);

      gameToast.reward(
        <div>
          <div>Free spins added!</div>
          <div>
            Added {purchaseOption.spins.toLocaleString()} spins to your account
          </div>
        </div>
      );

      setIsLoading(false);

      setTimeout(() => {
        router.push("/spin");
      }, 1500);
      return;
    }

    // Check if we're in a proper Telegram environment
    console.log("WebApp check:", {
      hasWebApp: !!WebApp,
      hasInitData: !!WebApp?.initData,
      initData: WebApp?.initData,
    });

    if (!WebApp || !WebApp.initData || WebApp.initData === "user=default") {
      gameToast.error(
        <div>
          <div>Payment not available</div>
          <div>Please open this app through Telegram to make purchases</div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // Create Telegram Star payment invoice
    console.log("Creating payment invoice for:", {
      id: purchaseOption.id,
      spins: purchaseOption.spins,
      price: purchaseOption.price,
    });

    const response = await fetch("/api/payments/stars", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: WebApp.initData,
        spinPackage: {
          id: purchaseOption.id,
          spins: purchaseOption.spins,
          bonus: purchaseOption.bonus
            ? parseInt(purchaseOption.bonus.replace(/\D/g, ""))
            : 0,
          price: purchaseOption.price,
        },
      }),
    });

    const responseData = await response.json();
    console.log("Payment API response:", responseData);

    if (!response.ok) {
      const errorMessage =
        responseData.error || "Failed to create payment invoice";
      console.error("Payment API error:", errorMessage);
      throw new Error(errorMessage);
    }

    const invoiceUrl = responseData.invoiceUrl || responseData.result;
    console.log("Received invoice URL:", invoiceUrl);

    // Check if we have a valid invoice URL and openInvoice function
    if (!invoiceUrl) {
      throw new Error("No payment URL received from server");
    }

    if (!WebApp.openInvoice) {
      console.error("openInvoice method not available:", WebApp);
      throw new Error(
        "Payment interface not available in this Telegram version"
      );
    }

    // Open Telegram payment interface
    console.log("Opening invoice with URL:", invoiceUrl);
    WebApp.openInvoice(invoiceUrl, (status: string) => {
      setIsLoading(false);
      console.log("Payment status received:", status);

      if (status === "paid") {
        // Calculate total spins including bonus
        const bonusSpins = purchaseOption.bonus
          ? Math.floor(
              (parseInt(purchaseOption.bonus.replace(/\D/g, "")) / 100) *
                purchaseOption.spins
            )
          : 0;
        const totalSpins = purchaseOption.spins + bonusSpins;

        // Update spins count immediately on client side
        increaseSpins(totalSpins);

        // Show success toast with detailed information
        gameToast.reward(
          <div className="text-center">
            <div className="text-sm text-gray-300">
              Payment Successful! <br />
              {totalSpins.toLocaleString()} spins added to your account
            </div>
            {bonusSpins > 0 && (
              <div className="text-xs text-yellow-400 mt-1">
                +{bonusSpins.toLocaleString()} bonus spins included!
              </div>
            )}
          </div>,
          { duration: 4000 }
        );

        // Navigate back to the game after successful payment
        setTimeout(() => {
          router.push("/spin");
        }, 2000);
      } else if (status === "cancelled") {
        // Show cancellation toast
        gameToast.info(
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-400 mb-1">
              ⏸️ Payment Cancelled
            </div>
            <div className="text-sm text-gray-300">
              No charges were made to your account
            </div>
          </div>,
          { duration: 3000 }
        );
      } else if (status === "failed") {
        // Show detailed failure toast
        gameToast.error(
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 mb-1">
              ❌ Payment Failed
            </div>
            <div className="text-sm text-gray-300 mb-1">
              Unable to process your payment
            </div>
            <div className="text-xs text-gray-400">
              Please check your Stars balance and try again
            </div>
          </div>,
          { duration: 4000 }
        );
      } else {
        // Handle any other unknown status
        gameToast.error(
          <div className="text-center">
            <div className="text-lg font-bold text-red-400 mb-1">
              ⚠️ Unknown Status
            </div>
            <div className="text-sm text-gray-300">
              Payment status: {status}
            </div>
            <div className="text-xs text-gray-400">
              Please contact support if this continues
            </div>
          </div>,
          { duration: 4000 }
        );
      }
    });
  } catch (error) {
    setIsLoading(false);
    console.error("Payment error:", error);

    // Show detailed error toast
    gameToast.error(
      <div className="text-center">
        <div className="text-lg font-bold text-red-400 mb-1">
          🚫 Payment Error
        </div>
        <div className="text-sm text-gray-300 mb-1">
          Unable to process your payment request
        </div>
        <div className="text-xs text-gray-400">
          Please try again or contact support
        </div>
      </div>,
      { duration: 4000 }
    );
  }
}
