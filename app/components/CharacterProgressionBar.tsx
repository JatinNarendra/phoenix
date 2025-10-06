import React, { useState, useEffect, useReducer } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGame } from "../context/GameContext";
import { useProgression } from "../context/ProgressionContext";

// Images
import PhoenixIcon from "../../public/assets/spin/charactertokenpheonix.png";
// Remove image imports - we'll use src paths instead
import SparkIcon from "../../public/assets/spin/sparkicon.png";
import CharacterTokenSpin from "../../public/assets/spin/charactertokenspin.png";
import CharacterTokenTurbo from "../../public/assets/TurboIcon.png";
import CharacterTokenRecharge from "../../public/assets/RechargeIcon.png";

interface CharacterProgressionBarProps {
  sparkEarned?: number;
  resetTotal?: boolean;
  totalRewards?: {
    coins: number;
    spins: number;
    turbo: number;
    recharge: number;
    tokens?: number;
  };
  isSpinning?: boolean;
}

interface ProgressState {
  currentTokens: number;
  currentStep: number;
  requiredTokens: number;
  lastUpdate: number;
}

type ProgressAction =
  | {
      type: "UPDATE_PROGRESS";
      payload: { tokens: number; step: number; requiredTokens: number };
    }
  | { type: "RESET"; payload: ProgressState };

const CharacterProgressionBar: React.FC<CharacterProgressionBarProps> = ({
  sparkEarned,
  resetTotal,
  totalRewards,
  isSpinning,
}) => {
  const { gameState } = useGame();
  const { getProgressionType } = useProgression();
  const router = useRouter();

  // Store the current session spark earned value
  const [totalSparkEarned, setTotalSparkEarned] = useState<number>(0);

  // Add animation state for progress bar
  const [animateProgress, setAnimateProgress] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [animateIcon, setAnimateIcon] = useState(false);

  // Use reducer for progress state
  const [progressState, dispatchProgress] = useReducer(
    (state: ProgressState, action: ProgressAction): ProgressState => {
      switch (action.type) {
        case "UPDATE_PROGRESS":
          // Only update if new tokens are higher or step changed
          if (
            action.payload.tokens > state.currentTokens ||
            action.payload.step !== state.currentStep
          ) {
            return {
              ...state,
              currentTokens: action.payload.tokens,
              currentStep: action.payload.step,
              requiredTokens: action.payload.requiredTokens,
              lastUpdate: Date.now(),
            };
          }
          return state;
        case "RESET":
          return {
            ...action.payload,
            lastUpdate: Date.now(),
          };
        default:
          return state;
      }
    },
    {
      currentTokens: 0,
      currentStep: 0,
      requiredTokens: 0,
      lastUpdate: 0,
    }
  );

  // Update totalSparkEarned when sparkEarned changes
  useEffect(() => {
    if (sparkEarned !== undefined) {
      setTotalSparkEarned(sparkEarned);
    }
  }, [sparkEarned]);

  // Reset totalSparkEarned when resetTotal prop changes to true
  useEffect(() => {
    if (resetTotal) {
      setTotalSparkEarned(0);
      dispatchProgress({
        type: "RESET",
        payload: {
          currentTokens: 0,
          currentStep: 0,
          requiredTokens: 0,
          lastUpdate: Date.now(),
        },
      });
    }
  }, [resetTotal]);

  // Add a visual indication that a new reward was added
  const [isNewReward, setIsNewReward] = useState(false);

  useEffect(() => {
    if (sparkEarned !== undefined && sparkEarned > 0) {
      // Trigger animation when new reward is added
      setIsNewReward(true);

      // Reset animation after a short delay
      const timer = setTimeout(() => {
        setIsNewReward(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [sparkEarned]);

  // Add effect to detect changes in character progression
  useEffect(() => {
    if (!gameState.characterProgression) return;

    const { currentTokens, currentStep, requiredTokens } =
      gameState.characterProgression;
    const now = Date.now();

    // Prevent rapid updates (debounce)
    if (now - progressState.lastUpdate < 100) {
      return;
    }

    // Always update the state from gameState.characterProgression
    dispatchProgress({
      type: "UPDATE_PROGRESS",
      payload: {
        tokens: currentTokens,
        step: currentStep,
        requiredTokens,
      },
    });

    // Trigger animation
    setAnimateProgress(true);
    setAnimateIcon(true);

    // Reset animation after delay
    const timer = setTimeout(() => {
      setAnimateProgress(false);
      setAnimateIcon(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState.characterProgression, progressState.lastUpdate]);

  // Add effect to update icon when step changes
  useEffect(() => {
    const characterProgression = gameState.characterProgression;
    if (!characterProgression) return;

    setAnimateIcon(true);
    const timer = setTimeout(() => {
      setAnimateIcon(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [
    gameState.characterProgression?.currentStep,
    gameState.characterProgression,
  ]);

  // Reset max progress when step changes
  useEffect(() => {
    if (gameState.characterProgression) {
      // Step change detected, no need to log
    }
  }, [
    gameState.characterProgression?.currentStep,
    gameState.characterProgression,
  ]);

  // Early return if no progression data
  if (!gameState.characterProgression) {
    return null;
  }

  const { tokenType } = gameState.characterProgression;
  const { currentTokens, requiredTokens, currentStep } = progressState;

  // Calculate progress percentage
  const progressPercentage = Math.min(
    100,
    (currentTokens / requiredTokens) * 100
  );

  const getCurrentStep = () => {
    const progressionType = getProgressionType(tokenType);
    if (
      !progressionType?.steps ||
      currentStep >= progressionType.steps.length ||
      currentStep < 0
    ) {
      return null;
    }
    return progressionType.steps[currentStep];
  };

  const getRewardIcon = () => {
    const currentStepReward = getCurrentStep();
    if (!currentStepReward) return SparkIcon;

    // If current step is completed, get the next step's reward
    if (
      gameState.characterProgression?.currentTokens !== undefined &&
      gameState.characterProgression?.requiredTokens !== undefined &&
      gameState.characterProgression.currentTokens >=
        gameState.characterProgression.requiredTokens
    ) {
      const progressionType = getProgressionType(
        gameState.characterProgression.tokenType
      );
      const nextStep = progressionType?.steps[currentStep + 1];
      if (nextStep?.reward) {
        if (nextStep.reward.spark) {
          return SparkIcon;
        } else if (nextStep.reward.spins) {
          return CharacterTokenSpin;
        } else if (nextStep.reward.turbo) {
          return CharacterTokenTurbo;
        } else if (nextStep.reward.recharge) {
          return CharacterTokenRecharge;
        }
      }
    }

    // Default to current step's reward
    if (currentStepReward.reward?.spark) {
      return SparkIcon;
    } else if (currentStepReward.reward?.spins) {
      return CharacterTokenSpin;
    } else if (currentStepReward.reward?.turbo) {
      return CharacterTokenTurbo;
    } else if (currentStepReward.reward?.recharge) {
      return CharacterTokenRecharge;
    }
    return SparkIcon;
  };

  const getRewardValue = () => {
    const currentStepReward = getCurrentStep();
    if (!currentStepReward?.reward) return "";

    const formatLargeNumber = (num: number) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
      }
      return num.toString();
    };

    // If current step is completed, get the next step's reward
    if (
      gameState.characterProgression?.currentTokens !== undefined &&
      gameState.characterProgression?.requiredTokens !== undefined &&
      gameState.characterProgression.currentTokens >=
        gameState.characterProgression.requiredTokens
    ) {
      const progressionType = getProgressionType(
        gameState.characterProgression.tokenType
      );
      const nextStep = progressionType?.steps[currentStep + 1];
      if (nextStep?.reward) {
        if (nextStep.reward.spark) {
          return formatLargeNumber(nextStep.reward.spark);
        } else if (nextStep.reward.spins) {
          return formatLargeNumber(nextStep.reward.spins);
        } else if (nextStep.reward.turbo) {
          return formatLargeNumber(nextStep.reward.turbo);
        } else if (nextStep.reward.recharge) {
          return formatLargeNumber(nextStep.reward.recharge);
        }
      }
    }

    // Default to current step's reward
    if (currentStepReward.reward.spark) {
      return formatLargeNumber(currentStepReward.reward.spark);
    } else if (currentStepReward.reward.spins) {
      return formatLargeNumber(currentStepReward.reward.spins);
    } else if (currentStepReward.reward.turbo) {
      return formatLargeNumber(currentStepReward.reward.turbo);
    } else if (currentStepReward.reward.recharge) {
      return formatLargeNumber(currentStepReward.reward.recharge);
    }
    return "";
  };

  return (
    <div className="w-fit mx-auto relative backdrop-blur-[21px] rounded-[12px] bg-black/60 border border-[#E2902966] h-[96px] flex flex-col items-center justify-center p-[0px_14px] text-left text-white font-['Rounded_Mplus_1c']">
      <div className="w-[240px] relative h-[65px]">
        {/* Spark Earned - Only show current spin session rewards */}
        {!isSpinning && (
          <div
            className={`absolute top-0 left-[calc(50%-63px)] text-[20px] leading-[140%] font-black tracking-[-0.02em] text-center ${
              isNewReward ? "scale-110 text-[#FFA501]" : ""
            } transition-all duration-300`}
          >
            <div className="flex items-center">
              <div className="w-5 h-5 relative mr-1">
                <Image
                  src={SparkIcon}
                  alt="Coins"
                  width={20}
                  height={20}
                  style={{ width: "auto", height: "auto" }}
                />
              </div>
              <span className="text-white">
                {totalRewards?.coins?.toLocaleString() ||
                  totalSparkEarned.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Progress bar group */}
        <div className="absolute top-[29px] left-[calc(50%-120px)] w-[240px] h-[34px] text-[12px]">
          {/* Character progress bar container */}
          <div className="absolute top-[11px] left-[calc(50%-110px)] w-[200px] h-[20px]">
            {/* Character progress background */}
            <div className="absolute -top-[1px] -left-[1px] w-[calc(100%+2px)] h-[22px] rounded-[40px] bg-[#301402] border border-[#FFA501] border-opacity-40 box-border flex flex-col items-start justify-start" />

            {/* Character progress fill */}
            <div
              className={`absolute top-0 left-0 h-[20px] bg-[#FFA501] rounded-[40px] ${
                animateProgress ? "transition-all duration-1000 ease-out" : ""
              }`}
              style={{
                width: `${Math.min(progressPercentage, 100) * 2}px`,
                borderRadius:
                  progressPercentage < 100 ? "40px 0 0 40px" : "40px",
                transform: "translateZ(0)", // Force hardware acceleration
                willChange: "width", // Optimize for width animations
              }}
            />

            {/* Progress text - Spark Character collection */}
            <div className="absolute top-[2px] left-[82px] tracking-[-0.02em] leading-[140%] font-extrabold">
              {currentTokens}/{requiredTokens}
            </div>
          </div>

          {/* Spark Character icon (left side) */}
          <div className="absolute left-[-8px] top-[2px]">
            <Image
              src={PhoenixIcon}
              alt="Spark Character"
              width={32}
              height={32}
              className="object-contain overflow-hidden"
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          {/* Reward icon (right side) */}
          <Image
            src={getRewardIcon()}
            alt="Reward Icon"
            width={32}
            height={32}
            className="absolute top-0 left-[200px] mix-blend-normal object-contain"
            style={{ width: "auto", height: "auto" }}
          />

          {/* Show the reward value with brown background and rounded corners */}
          <div className="absolute top-[24px] left-[199px] w-[36px] h-[18px] text-white bg-[#3a1c09] rounded-lg border border-[rgba(255,165,1,0.3)] shadow-[0_0_10px_rgba(255,165,1,0.2)] py-1 px-2 tracking-[-0.02em] leading-[140%] text-[10px] font-bold text-center flex items-center justify-center">
            {getRewardValue()}
          </div>
        </div>

        {/* Question mark group */}
        <div className="absolute top-[52px] left-[226px] text-[15px]">
          <div
            className="absolute w-[20px] h-[20px] -top-[2px]"
            onClick={() => router.push("/spin/how-it-works")}
          >
            <Image
              src="/assets/spin/brownquestionmarkdiamond.png"
              alt="Question Mark Background"
              width={25}
              height={29}
              className="absolute top-0 left-[8px] object-cover cursor-pointer"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterProgressionBar;
