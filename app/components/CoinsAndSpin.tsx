"use client";
import React from "react";
import SpinIcon from "@/public/assets/SpinIcon.png";
import SpinPlusIcon from "@/public/assets/SpinPlus.png";
import Image from "next/image";
import SparkyIcon from "@/public/assets/SparkyIcon.png";
import { useGame } from "../context/GameContext";
import { useRouter, usePathname } from "next/navigation";

const CoinsAndSpin = () => {
  const { gameState } = useGame();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on spin purchase page
  const isSpinPurchasePage =
    pathname === "/spinpurchase" ||
    pathname === "/purchase/spin" ||
    pathname.startsWith("/purchase/spin/");

  // Gradient border and background classes
  const borderGradient = "bg-gradient-to-r from-[#4E320B] to-[#5C470D]";
  const borderRadius = "rounded-[14px]";
  const cardBg = "bg-[#3A1C09]";

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div
      className="grid grid-cols-2 gap-4 w-full font-rounded-mplus font-bold"
      style={{ gridTemplateColumns: "auto auto" }}
    >
      {/* Coins Card */}
      <div className="relative flex items-center">
        <div
          className={`${borderGradient} ${borderRadius} p-[1.5px] w-[180px] h-10 flex items-center ml-2`}
        >
          <div
            className={`${cardBg} ${borderRadius} flex items-center h-full w-full pl-8 pr-4 relative `}
          >
            {/* Sparky Icon */}
            <div className="absolute -left-2">
              <Image
                src={SparkyIcon}
                alt="Sparky Icon"
                width={28}
                height={28}
                style={{ width: "auto", height: "auto" }}
                className="object-contain"
              />
            </div>
            {/* Coins amount */}
            <span className="text-sm ml-2">
              {formatNumber(gameState.coins || 0)}
            </span>
          </div>
        </div>
      </div>
      {/* Spins Card */}
      <div
        className="relative flex justify-end"
        onClick={() => !isSpinPurchasePage && router.push("/spin")}
      >
        <div
          className={`${borderGradient} ${borderRadius} p-[1.5px] w-[110px] h-10 flex items-center cursor-pointer`}
        >
          <div
            className={`${cardBg} ${borderRadius} flex items-center h-full w-full pl-14 pr-4 relative`}
          >
            {/* Spin Icon and amount */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Image
                src={SpinIcon}
                alt="Spin Icon"
                width={28}
                height={28}
                style={{ width: "auto", height: "auto" }}
                className="object-contain"
              />
            </div>
            {/* Spins amount */}
            <span className="relative -left-6 text-sm">
              {formatNumber(gameState.spins || 0)}
            </span>
            {/* Plus icon */}
            {!isSpinPurchasePage && (
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering parent onClick
                  router.push("/spinpurchase");
                }}
              >
                <Image
                  src={SpinPlusIcon}
                  alt="Spin Plus"
                  width={28}
                  height={28}
                  style={{ width: "auto", height: "auto" }}
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CoinsAndSpin);
