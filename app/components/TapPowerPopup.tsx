"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import { FaSpinner } from "react-icons/fa";
import Close from "../../public/assets/Close.png";
import SparkyIcon from "../../public/assets/SparkyIcon.png";
import TapPowerIcon from "../../public/assets/tappower.png";
import { useGame } from "../context/GameContext";
import { gameToast } from "../utility/customToast";
import { tapPowerConfig } from "../utility/tapPowerConfig";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

interface TapPowerPopupProps {
  onClose: () => void;
  isOpen: boolean;
  onUpgrade: () => void;
}

const TapPowerPopup: React.FC<TapPowerPopupProps> = ({ onClose, isOpen, onUpgrade }) => {
  const { gameState, persistState } = useGame();
  
  // Get upgrade cost
  const currentLevel = gameState.upgrades?.tapLevel || 1;
  const tapConfig = tapPowerConfig[currentLevel];

  // Check if autotap is active and if there's already a pending upgrade
  const isAutotapActive = gameState.autoTapActive;
  const hasPendingUpgrade = gameState.pendingTapUpgrade !== undefined;
  const hasEnoughSpark = gameState.coins >= tapConfig.upgradeCost;

  // Effect to handle upgrade after autotap is completed and claimed
  useEffect(() => {
    // When autotap completes and there's a pending upgrade
    if (!isAutotapActive && hasPendingUpgrade && gameState.autoTapClaimed) {
      // Check if user has enough spark for the upgrade
      if (hasEnoughSpark) {
        // Apply the upgrade
        onUpgrade();
        gameToast.success(`Tap Power upgraded to level ${currentLevel + 1}!`);
      } else {
        // Show insufficient funds toast
        gameToast.error(`Not enough spark for upgrade. Need ${tapConfig.upgradeCost.toLocaleString()} spark.`);
        
        // Clear the pending upgrade since it can't be completed
        persistState(prev => ({
          ...prev,
          pendingTapUpgrade: undefined
        }));
      }
    }
  }, [isAutotapActive, hasPendingUpgrade, gameState.autoTapClaimed, onUpgrade, hasEnoughSpark, tapConfig.upgradeCost, currentLevel, persistState]);

  // Ensure that navigation works by cleaning up any body styles on unmount
  useEffect(() => {
    // Save original body overflow
    const originalOverflow = document.body.style.overflow;
    
    // Don't block scrolling or touch events on the body
    document.body.style.overflow = "auto";
    
    return () => {
      // Restore original body overflow on unmount
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    // If not enough spark, show error toast and don't proceed
    if (!hasEnoughSpark) {
      gameToast.error(`Not enough spark for upgrade. Need ${tapConfig.upgradeCost.toLocaleString()} spark.`);
      return;
    }
    
    if (isAutotapActive) {
      // If autotap is active, store the pending upgrade in global state
      const nextTapLevel = currentLevel + 1;
      
      persistState(prev => ({
        ...prev,
        // We'll deduct the cost when the upgrade is actually applied
        pendingTapUpgrade: nextTapLevel
      }));
      
      // Calculate remaining time for autotap
      const now = Date.now();
      const remainingTime = Math.max(0, (gameState.autoTapEndTime || 0) - now);
      const remainingSeconds = Math.ceil(remainingTime / 1000);
      
      gameToast.info(`Tap Power upgrade will be applied after Auto Tap completes in ${remainingSeconds} seconds`);
    } else {
      // Otherwise, upgrade immediately
      onUpgrade();
    }
  };

  // Determine if we should show the waiting state
  const showWaitingState = isAutotapActive && hasPendingUpgrade;
  
  // Handle backdrop click without stopping propagation
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-auto"
      style={{ touchAction: "auto" }}
    >
      {/* Backdrop that allows clicks to pass through when needed */}
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40"
        onClick={handleBackdropClick}
      />

      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50 pointer-events-auto">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border min-h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <Image src={Close.src} alt="Close" width={32} height={32} />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-4 py-2">
              <Image
                src={TapPowerIcon}
                alt="Tap Power"
                width={160}
                height={160}
                style={{ width: "260px", height: "240px" }}
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#E18700] text-center">
                  Tap Power
                </h2>
                <p className="text-gray-400 text-center">
                  Boost your Tap Power to level up <br />
                  faster! Upgrade now and gain more<br />
                  points with every tap!
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2">
                <Image
                  src={SparkyIcon}
                  alt="Spark"
                  width={24}
                  height={24}
                  style={{ width: "auto", height: "auto" }}
                />
                <span
                  className={`text-2xl font-bold ${
                    hasEnoughSpark ? "text-white" : "text-red-400"
                  }`}
                >
                  {tapConfig.upgradeCost.toLocaleString()}
                </span>
              </div>

              <div className="pt-4 flex justify-center w-full">
                {showWaitingState ? (
                  <CustomYellowButton className="w-fit" disabled>
                    <FaSpinner className="animate-spin mr-2 text-white" />
                    Waiting for Autotap to complete
                  </CustomYellowButton>
                ) : (
                  <CustomYellowButton
                    className="w-[160px]"
                    onClick={handleUpgradeClick}
                    disabled={!hasEnoughSpark}
                  >
                    Upgrade
                  </CustomYellowButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TapPowerPopup; 