"use client";
import React from "react";
import Image from "next/image";
// Remove image imports - we'll use src paths instead
import { useGame } from "../context/GameContext";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

interface RechargeSpeedPopupProps {
  onClose: () => void;
  isOpen: boolean;
  onUpgrade: () => void;
}

const RechargeSpeedPopup: React.FC<RechargeSpeedPopupProps> = ({
  onClose,
  isOpen,
  onUpgrade,
}) => {
  const { gameState } = useGame();
  const currentLevel = gameState.upgrades?.rechargeLevel || 1;
  const maxLevel = 3;
  const isMaxLevel = currentLevel >= maxLevel;
  const upgradeCost = 100 * (currentLevel + 1);

  if (!isOpen) return null;

  // Backdrop click closes only if clicking directly on the backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-auto"
      style={{ touchAction: "auto" }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40"
        onClick={handleBackdropClick}
      />
      {/* Popup container */}
      <div className="fixed inset-x-0 bottom-0 max-w-md mx-auto z-50 pointer-events-auto">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-6">
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <Image
                  src="/assets/Close.png"
                  alt="Close"
                  width={32}
                  height={32}
                />
              </button>
            </div>
            <div className="flex flex-col items-center space-y-8 py-4">
              <Image
                src="/assets/energyrechargeratepopupicon.png"
                alt="Recharge Speed"
                width={140}
                height={140}
                style={{ width: "auto", height: "auto" }}
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#E18700] text-center">
                  Energy Recharge Rate
                </h2>
                <p className="text-gray-400 text-center">
                  {isMaxLevel
                    ? "Your recharge speed is already at maximum level!"
                    : "Purchase the Recharge Spell to speed up energy recovery. Upgrade the boost to reach the max!"}
                </p>
              </div>
              {!isMaxLevel && (
                <>
                  <div className="flex items-center justify-center space-x-2">
                    <Image
                      src="/assets/SparkyIcon.png"
                      alt="Spark"
                      width={24}
                      height={24}
                      style={{ width: "auto", height: "auto" }}
                    />
                    <span className="text-2xl font-bold text-white">
                      {upgradeCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-4 flex justify-center">
                    <CustomYellowButton
                      onClick={onUpgrade}
                      className="w-[160px]"
                    >
                      Upgrade
                    </CustomYellowButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargeSpeedPopup;
