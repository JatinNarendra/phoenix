"use client";
import React from "react";
import Image from "next/image";
import Close from "../../public/assets/Close.png";
import SparkyIcon from "../../public/assets/SparkyIcon.png";
import EnergyCapacityIcon from "../../public/assets/energycapacity.png";
import { useGame } from "../context/GameContext";
import { getEnergyConfig } from "../utility/energyConfig";
import CustomYellowButton from "@/app/ui/CustomYellowButton";

interface EnergyCapacityPopupProps {
  onClose: () => void;
  isOpen: boolean;
  onUpgrade: () => void;
}

const EnergyCapacityPopup: React.FC<EnergyCapacityPopupProps> = ({
  onClose,
  isOpen,
  onUpgrade,
}) => {
  const { gameState } = useGame();
  const currentLevel = gameState.upgrades?.energyLevel || 1;
  const nextLevelConfig = getEnergyConfig(currentLevel + 1);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50 z-40 "
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 transform transition-all duration-300 max-w-md mx-auto z-50">
        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border min-h-[580px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col p-8">
            <div className="flex justify-end mb-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <Image src={Close.src} alt="Close" width={32} height={32} />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <Image
                src={EnergyCapacityIcon}
                alt="Energy Capacity"
                width={120}
                height={120}
                style={{ width: "180px", height: "160px" }}
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#E18700] text-center">
                  Energy Capacity
                </h2>
                <p className="text-gray-400 text-center text-sm">
                  Purchase the Energy Charm to expand your energy capacity.
                  Upgrade the boost to reach the max limit!
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
                <span className="text-2xl font-bold text-white">
                  {nextLevelConfig?.upgradePrice.toLocaleString()}
                </span>
              </div>

              <div className="pt-4 flex justify-center w-full">
                <CustomYellowButton className="w-[160px]" onClick={onUpgrade}>
                  Upgrade
                </CustomYellowButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnergyCapacityPopup;
