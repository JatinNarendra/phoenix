"use client";

import React, { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWebApp } from "../hooks/useWebApp";
import CoinsAndSpin from "../components/CoinsAndSpin";
import telegramstar from "@/public/assets/spinpurchase/telegramstar.png";
import redspins from "@/public/assets/spinpurchase/redspins.png";
import goldenspins from "@/public/assets/spinpurchase/goldenspins.png";
import greenspins from "@/public/assets/spinpurchase/greenspins.png";
import skybluespins from "@/public/assets/spinpurchase/skybluespins.png";
import purplespins from "@/public/assets/spinpurchase/purplespins.png";
import yellowspins from "@/public/assets/spinpurchase/yellowspins.png";
import { StaticImageData } from "next/image";
import { useGame } from "../context/GameContext";
import { gameToast } from "../utility/customToast";
import { SPIN_PURCHASE_OPTIONS } from "../utility/spinConfig";
import { handleSpinPurchase } from "../utility/purchaseUtils";
import { SpinCard } from "../types/gameTypes";

// Using SpinCard type from gameTypes.ts

const getSpinIcon = (value: string) => {
  const iconMap: { [key: string]: StaticImageData } = {
    yellow: yellowspins,
    purple: purplespins,
    skyblue: skybluespins,
    green: greenspins,
    golden: goldenspins,
    red: redspins,
  };

  return iconMap[value] || null;
};

export default function SpinPurchase() {
  const router = useRouter();
  const { instance: WebApp } = useWebApp(true);
  const { increaseSpins } = useGame();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.back();
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  const handleCardClick = useCallback(
    async (card: SpinCard, event: React.MouseEvent) => {
      event.preventDefault();

      if (!WebApp) {
        gameToast.error("Telegram WebApp not available");
        return;
      }

      // Directly trigger the purchase flow
      await handleSpinPurchase({
        purchaseOption: card,
        WebApp,
        increaseSpins,
        router,
        setIsLoading,
      });
    },
    [WebApp, increaseSpins, router]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main Content */}
      <div className="p-4 pt-6">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black">
          <CoinsAndSpin />
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
          {SPIN_PURCHASE_OPTIONS.map((card, index) => (
            <div key={index} className="block cursor-pointer">
              <div
                className={`relative backdrop-blur-[14px] rounded-[10px] h-[200px] flex flex-col items-center bg-[#291818]/70 border ${
                  index === 5
                    ? "border-[#960000]"
                    : index === 4
                    ? "border-[#E18700]"
                    : "border-white/10"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={(e) => !isLoading && handleCardClick(card, e)}
              >
                {/* Hot/Trending Label - Only for last two cards */}
                {index === 4 && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-bold px-3 py-1 bg-[#3a1c09] w-full rounded-t-[10px] flex items-center justify-center">
                    TRENDING
                  </div>
                )}
                {index === 5 && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-bold px-3 py-1 bg-[#CC190F] w-full rounded-t-[10px] flex items-center justify-center">
                    HOT
                  </div>
                )}

                {/* Spin Icon */}
                <div className="mt-8">
                  <Image
                    src={getSpinIcon(card.icon)}
                    alt={`${card.spins} Spins`}
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>

                {/* Spins Amount */}
                <div className="text-lg font-bold text-white mt-3">
                  {card.spins.toLocaleString()}
                </div>

                {/* Bonus Text */}
                {card.bonus && (
                  <div className="text-[#E18700] text-xs font-bold mt-2">
                    {card.bonus}
                  </div>
                )}

                {/* Free badge for free options */}
                {card.freeForNow && <div></div>}

                {/* Price */}
                <div className="absolute bottom-0 left-0 right-0 h-[25%] backdrop-blur-[14px] rounded-b-[10px] border-t border-white/10 flex items-center justify-center gap-2 bg-[#3a1c09]">
                  <Image
                    src={telegramstar}
                    alt="Telegram Star"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-bold text-white">{card.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
