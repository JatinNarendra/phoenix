"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProgression } from "../../context/ProgressionContext";

// Import token images
import charactertokenpheonix from "../../../public/assets/spin/charactertokenpheonix.png";
import BrownQuestionMarkDiamond from "../../../public/assets/spin/brownquestionmarkdiamond.png";
import SpinHowItWorksImage from "../../../public/assets/spin/spinhowitworks.png";
import SpinIcon from "@/public/assets/SpinIcon.png";
import HourglassIcon from "@/public/assets/spin/hourglass.png";
import { BsCheckCircleFill } from "react-icons/bs";

import { useWebApp } from "@/app/hooks/useWebApp";

// Format number with k, m suffix
const formatNumber = (num: number | undefined): string => {
  if (!num) return "";
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}m`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

const HowItWorksPage = () => {
  const {
    state: progressionState,
    isTypeCompletionAllowed,
    getCurrentlyActiveType,
    getTimeUntilTypeEnd,
  } = useProgression();
  const { instance: WebApp } = useWebApp(true);
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = React.useState({
    hours: 71,
    minutes: 54,
    seconds: 17,
  });

  // Handle back navigation with Telegram WebApp
  useEffect(() => {
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.enableClosingConfirmation();

      const handleBack = () => {
        router.push("/spin");
      };

      WebApp.BackButton.onClick(handleBack);

      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [WebApp, router]);

  // Update timer every second
  useEffect(() => {
    // Get the currently active type
    const currentlyActiveType = getCurrentlyActiveType();

    // Get time remaining until the currently active type ends
    const timeUntilEnd = getTimeUntilTypeEnd(currentlyActiveType);

    const timer = setInterval(() => {
      const remaining = getTimeUntilTypeEnd(currentlyActiveType);
      setTimeRemaining(remaining);

      if (remaining.total <= 0) {
        clearInterval(timer);
        // Instead of reloading, just update the state to reflect the change
        // The component will re-render with updated data
        console.log("Timer ended, updating state without reload");
      }
    }, 1000);

    setTimeRemaining(timeUntilEnd);

    return () => clearInterval(timer);
  }, [getCurrentlyActiveType, getTimeUntilTypeEnd]);

  // Add Telegram WebApp viewport fix
  useEffect(() => {
    // Set viewport height for mobile devices and Telegram WebApp
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);

    return () => window.removeEventListener("resize", setViewportHeight);
  }, []);

  return (
    <div
      className="bg-[#150404] rounded-lg w-full h-[calc(100vh-60px)] overflow-y-auto"
      style={{
        height: "calc(var(--vh, 1vh) * 100)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="mb-6 mt-2 flex justify-center">
        <Image
          src={SpinHowItWorksImage}
          alt="Spin How It Works"
          width={350}
          height={200}
          className="rounded-md"
        />
      </div>
      <div className="p-4">
        <div className="flex flex-col justify-center items-center mb-4">
          <div className="flex w-[180px] h-[40px] bg-black justify-center items-center border-[1px] border-[#E18700] rounded-[12px] p-2">
            <Image src={SpinIcon} alt="Token" width={20} height={20} />
            <span className="text-[#E18700] font-bold text-sm ml-2">
              Ultimate Prize
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-[10px]">
            Collect Items To Win
          </h3>
          <h3 className="text-lg font-bold text-[#E18700] mt-1">Big Rewards</h3>
        </div>

        <div className="mb-4 rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] backdrop-blur-[14px] px-4 py-6">
          <div className="text-gray-400 text-sm mb-3 font-bold">Time Left</div>
          <div className="flex flex-col justify-center items-center bg-[#3A1C09] rounded-[14px] p-4">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex flex-col items-center">
                <Image
                  src={HourglassIcon}
                  alt="Hourglass"
                  width={24}
                  height={24}
                />
              </div>
              <div className="flex flex-col items-center">
                <div className="text-xl font-bold">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Hours</div>
              </div>
              <div className="text-gray-400 text-xl">:</div>
              <div className="flex flex-col items-center">
                <div className="text-xl font-bold">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Minutes</div>
              </div>
              <div className="text-gray-400 text-xl">:</div>
              <div className="flex flex-col items-center">
                <div className="text-xl font-bold">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Seconds</div>
              </div>
            </div>
          </div>
        </div>

        {/* Type Completion Restriction Message */}
        {!isTypeCompletionAllowed() && progressionState.lastCompletedType && (
          <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 w-full px-4">
            <div className="bg-[#195e4f] rounded-2xl px-4 py-3">
              <div className="flex flex-row items-start gap-2">
                <BsCheckCircleFill
                  className="text-green-400 mt-[2px]"
                  size={24}
                />
                <div className="flex flex-col">
                  <span className="text-green-200 text-[11px] font-bold mb-1">
                    Congrats on getting the grand prize! You will be able to
                    collect spin progression rewards when the next round is
                    live.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[10px] bg-[rgba(41,24,24,0.7)] border border-[rgba(255,255,255,0.1)] backdrop-blur-[14px] px-[24px] pt-[30px] pb-[10px]">
          <div className="text-white text-sm mb-4 font-bold">
            Collect To Progress
          </div>
          <div className="space-y-4">
            {/* Hit 1 Symbol */}
            <div className="flex flex-col">
              <div className="text-sm text-gray-400 font-bold mb-2">
                Hit 1 Symbol
              </div>
              <div className="flex flex-row justify-between w-full">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md"></div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md"></div>
                </div>
                <div className="flex items-center">
                  <span className="text-amber-500 font-bold mr-1">1</span>
                  <Image
                    src={charactertokenpheonix}
                    alt="Token"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            </div>

            {/* Hit 2 Symbol */}
            <div className="flex flex-col">
              <div className="text-sm text-gray-400 font-bold mb-2">
                Hit 2 Symbol
              </div>
              <div className="flex flex-row justify-between w-full">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md"></div>
                </div>
                <div className="flex items-center">
                  <span className="text-amber-500 font-bold mr-1">3</span>
                  <Image
                    src={charactertokenpheonix}
                    alt="Token"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            </div>

            {/* Hit 3 Symbol */}
            <div className="flex flex-col w-full">
              <div className="text-sm text-gray-400 font-bold mb-2">
                Hit 3 Symbol
              </div>
              <div className="flex flex-row justify-between w-full">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                  <div className="w-8 h-8 bg-[#3A1C09] rounded-md flex items-center justify-center overflow-hidden">
                    <Image
                      src={charactertokenpheonix}
                      alt="Token"
                      width={20}
                      height={20}
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-amber-500 font-bold mr-1">9</span>
                  <Image
                    src={charactertokenpheonix}
                    alt="Token"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="h-[1px] bg-gray-800"></div>
            <div className="mt-4 mb-2 flex items-center justify-center text-xs text-gray-400">
              <Image
                src={BrownQuestionMarkDiamond}
                alt="Task Completed"
                width={16}
                height={16}
                className="mr-2"
              />
              <span className="text-[#909090] font-bold">
                Set a spin multiplier to get more symbols.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
