"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWebApp } from "@/app/hooks/useWebApp";
import { useGame } from "@/app/context/GameContext";
import Image from "next/image";
import CoinsAndSpin from "@/app/components/CoinsAndSpin";
import { gameToast } from "@/app/utility/customToast";
import { SPIN_PURCHASE_OPTIONS } from "@/app/utility/spinConfig";
import telegramstar from "@/public/assets/spinpurchase/telegramstar.png";
import redspins from "@/public/assets/spinpurchase/redspins.png";
import goldenspins from "@/public/assets/spinpurchase/goldenspins.png";
import greenspins from "@/public/assets/spinpurchase/greenspins.png";
import skybluespins from "@/public/assets/spinpurchase/skybluespins.png";
import purplespins from "@/public/assets/spinpurchase/purplespins.png";
import yellowspins from "@/public/assets/spinpurchase/yellowspins.png";
import { StaticImageData } from "next/image";

// Define the type for spin purchase option
interface SpinPurchaseOption {
  id: string;
  icon: string;
  spins: number;
  bonus: string;
  price: number;
  freeForNow: boolean;
}

// Create a mapping of spin icons
const getSpinIcon = (iconName: string) => {
  const iconMap: { [key: string]: StaticImageData } = {
    yellow: yellowspins,
    purple: purplespins,
    skyblue: skybluespins,
    green: greenspins,
    golden: goldenspins,
    red: redspins,
  };

  return iconMap[iconName] || yellowspins; // Fallback to yellow if icon not found
};

export default function SpinPurchasePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { increaseSpins } = useGame();

  const [spinAmount, setSpinAmount] = useState<number>(0);
  const [purchaseOption, setPurchaseOption] =
    useState<SpinPurchaseOption | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (params.amount) {
      const amount = parseInt(params.amount as string, 10);
      setSpinAmount(amount);

      // Get the package ID from the URL query params if available
      const packageId = searchParams.get("id");

      // Find the matching purchase option by ID first, then by spins amount
      let option;
      if (packageId) {
        option = SPIN_PURCHASE_OPTIONS.find((opt) => opt.id === packageId);
      }

      // Fallback to finding by spin amount if ID search fails
      if (!option) {
        option = SPIN_PURCHASE_OPTIONS.find((opt) => opt.spins === amount);
      }

      if (option) {
        setPurchaseOption(option);
      } else {
        // If no matching option found, redirect back to spin purchase page
        router.push("/spinpurchase");
      }
    }
  }, [params.amount, searchParams, router]);

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/spinpurchase");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  const handlePurchase = useCallback(async () => {
    if (!purchaseOption || isLoading || !WebApp) return;

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
              Added {purchaseOption.spins.toLocaleString()} spins to your
              account
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

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to create payment invoice"
        );
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
            ? Math.floor((parseInt(purchaseOption.bonus.replace(/\D/g, "")) / 100) * purchaseOption.spins)
            : 0;
          const totalSpins = purchaseOption.spins + bonusSpins;

          // Update spins count immediately on client side
          increaseSpins(totalSpins);

          // Show success toast with detailed information
          gameToast.reward(
            <div className="text-center">
              <div className="text-lg font-bold text-green-400 mb-1">🎉 Payment Successful!</div>
              <div className="text-sm text-gray-300">
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
              <div className="text-lg font-bold text-yellow-400 mb-1">⏸️ Payment Cancelled</div>
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
              <div className="text-lg font-bold text-red-400 mb-1">❌ Payment Failed</div>
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
              <div className="text-lg font-bold text-red-400 mb-1">⚠️ Unknown Status</div>
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
          <div className="text-lg font-bold text-red-400 mb-1">🚫 Payment Error</div>
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
  }, [purchaseOption, isLoading, WebApp, increaseSpins, router]);

  // Handle case where purchase option isn't found
  if (!purchaseOption) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div>Loading purchase options...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black pt-2">
        <CoinsAndSpin />
      </div>

      {/* Main Content */}
      <div className="p-4 pt-6 flex flex-col items-center">
        <div className="max-w-md w-full backdrop-blur-[14px] rounded-[16px] bg-[#291818]/70 border border-white/10 p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Purchase {spinAmount.toLocaleString()} Spins
          </h1>

          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative w-24 h-24">
              <Image
                src={getSpinIcon(purchaseOption.icon)}
                alt={`${spinAmount} Spins`}
                width={96}
                height={96}
                className="w-24 h-24"
              />
            </div>

            <div className="text-3xl font-bold text-white">
              {spinAmount.toLocaleString()}
            </div>

            {purchaseOption.bonus && (
              <div className="text-[#E18700] text-lg font-bold mt-1">
                {purchaseOption.bonus}
              </div>
            )}
          </div>

          <div className="bg-[#3a1c09] rounded-lg p-4 flex items-center justify-center gap-3 mb-8">
            <div className="text-white text-lg">Cost:</div>
            <div className="flex items-center">
              <Image
                src={telegramstar}
                alt="Telegram Star"
                width={28}
                height={28}
                className="w-7 h-7 mr-2"
              />
              <span className="font-bold text-white text-xl">
                {purchaseOption.price}
              </span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className={`w-full py-4 rounded-lg font-bold text-white text-lg transition ${
              isLoading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#CC4700] to-[#FF8300] hover:from-[#FF8300] hover:to-[#CC4700]"
            }`}
          >
            {isLoading ? "Processing..." : "Purchase Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
