"use client";
import React from "react";
import Image from "next/image";
import { useGame } from "../context/GameContext";
import { useRouter } from "next/navigation";
// Remove image imports - we'll use src paths instead
import { gameToast } from "../utility/customToast";
import { getEnergyConfig } from "../utility/energyConfig";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

interface Upgrade {
  id: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  price?: string;
  priceInCents?: number;
  coinPrice?: number;
  level?: number;
  maxLevel?: number;
  color: string;
  effect: string;
}

interface BoostsPopupProps {
  onClose: () => void;
  isOpen: boolean;
  boostType: "turbo" | "recharge";
  upgradeData?: Upgrade;
  onUpgrade?: (upgrade: Upgrade) => void;
}

const BoostsPopup: React.FC<BoostsPopupProps> = ({
  onClose,
  isOpen,
  boostType,
  upgradeData,
  onUpgrade,
}) => {
  const router = useRouter();
  const {
    gameState,
    criticalStateUpdate,
    setBoosterEndTime,
    setTurboActive,
    setRechargeActive,
    setTurboTimeLeft,
    setRechargeTimeLeft,
    setGameState,
  } = useGame();

  const boostConfig = {
    turbo: {
      title: "Turbo Attack",
      description:
        "Enter Turbo Mode and 10X your coin \n collection. You can only enable it for \n 10 seconds",
      icon: "/assets/turboattackpopupicon.png",
      duration: 10,
    },
    recharge: {
      title: "Recharge Boost",
      description:
        "The Recharge Elixir fully restores your \n energy. You can use it a maximum of 3 \n times per day",
      icon: "/assets/rechargeboost.png",
      duration: 0,
    },
  };

  const handleClaimBoost = async () => {
    try {
      const currentTime = Date.now();
      const rewardedKey =
        boostType === "turbo" ? "rewardedTurbo" : "rewardedRecharge";
      const inGameKey =
        boostType === "turbo" ? "inGameTurbo" : "inGameRecharge";

      const totalUses =
        (gameState.boosts?.[inGameKey] || 0) +
        (gameState.boosts?.[rewardedKey] || 0);

      if (totalUses === 0) {
        gameToast.error(
          "No boosters available! Get more boosters to continue."
        );
        onClose();
        return;
      }

      const hasRewardedUses = (gameState.boosts?.[rewardedKey] || 0) > 0;
      const useFromRewardedPool = hasRewardedUses;

      // Update booster uses in state immediately for UI feedback
      const updatedBoosts = {
        ...gameState.boosts,
        [rewardedKey]: useFromRewardedPool
          ? Math.max(0, (gameState.boosts?.[rewardedKey] || 0) - 1)
          : gameState.boosts?.[rewardedKey] || 0,
        [inGameKey]: !useFromRewardedPool
          ? Math.max(0, (gameState.boosts?.[inGameKey] || 0) - 1)
          : gameState.boosts?.[inGameKey] || 0,
        turboActive:
          boostType === "turbo" ? true : gameState.boosts?.turboActive,
        rechargeActive:
          boostType === "recharge" ? true : gameState.boosts?.rechargeActive,
      };

      // Update local state first for immediate UI feedback
      setGameState((prev) => ({
        ...prev,
        boosts: updatedBoosts,
      }));

      // Then update database with the updated boosts
      await criticalStateUpdate({
        boosts: updatedBoosts,
      });

      if (boostType === "turbo") {
        // Set turbo active after the database update
        setTurboActive(true);
        setBoosterEndTime(
          "turbo",
          currentTime + boostConfig.turbo.duration * 1000
        );
        setTurboTimeLeft(boostConfig.turbo.duration);

        // Force sync the turbo state change for UI update
        window.dispatchEvent(new Event("turboStateChange"));

        // Show toast for turbo activation
        gameToast.success(`${boostConfig[boostType].title} activated!`);
      } else {
        // Set recharge active after the database update
        setRechargeActive(true);

        // Get current energy level and config
        const energyLevel = Math.min(40, gameState.upgrades?.energyLevel || 1);
        const energyConfig = getEnergyConfig(energyLevel);

        // Immediately set energy to max capacity
        setGameState((prev) => ({
          ...prev,
          currentRecharge: energyConfig.maxRecharge,
          boosts: updatedBoosts,
        }));

        localStorage.setItem("rechargeBoosterActive", "true");
        localStorage.setItem("rechargeJustActivated", "true");
        setRechargeTimeLeft(boostConfig.recharge.duration);

        // Force sync the recharge state change for UI update
        window.dispatchEvent(new Event("rechargeStateChange"));
      }

      // Ensure state is synchronized before closing and navigating
      setTimeout(() => {
        onClose();
        router.push("/"); // Navigate to home page after activation
      }, 100); // Small delay to ensure state updates are processed
    } catch (error) {
      console.error("Error activating booster:", error);
      gameToast.error("Failed to activate booster");
    }
  };

  if (!isOpen) return null;

  // If upgradeData is provided, show upgrade popup content
  if (upgradeData) {
    return (
      <>
        <div
          className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40 "
          onClick={onClose}
        />
        <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50">
          <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border px-6 py-12">
            <div className="flex flex-col items-center space-y-4">
              {upgradeData.icon}
              <h2 className="text-2xl font-bold text-[#E18700]">
                {upgradeData.title}
              </h2>
              <div className="text-gray-400 text-md">
                {upgradeData.description}
              </div>
              <CustomYellowButton
                className="w-fit"
                onClick={() => onUpgrade?.(upgradeData)}
              >
                {upgradeData.coinPrice ? "Purchase" : "Upgrade"}
              </CustomYellowButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show boost popup content
  const currentBoost = boostConfig[boostType];
  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border pb-[20px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-6">
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <Image
                  src="/assets/Close.png"
                  alt="Close"
                  width={32}
                  height={32}
                />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <Image
                src={currentBoost.icon}
                alt={currentBoost.title}
                width={140}
                height={140}
                style={{ width: "auto", height: "auto" }}
              />
              <h2 className="text-2xl font-bold text-[#E18700] text-center mb-4">
                {currentBoost.title}
              </h2>
              <p className="text-gray-400 text-center text-sm">
                {currentBoost.description}
              </p>

              <div></div>

              <div className="flex items-center justify-center space-x-2">
                <Image
                  src="/assets/SparkyIcon.png"
                  alt="Spark"
                  width={24}
                  height={24}
                  style={{ width: "auto", height: "auto" }}
                />
                <span className="text-2xl font-bold text-white">Free</span>
              </div>

              <div className="pt-4 flex justify-center w-full">
                <CustomYellowButton
                  className="w-fit"
                  onClick={handleClaimBoost}
                >
                  Claim Boost
                </CustomYellowButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BoostsPopup;
