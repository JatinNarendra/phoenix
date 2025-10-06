import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
// Remove image imports - we'll use src paths instead
import CustomYellowButton from "@/app/ui/CustomYellowButton";

interface PenaltyWarningPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onYesCompleted: () => void;
  sparkyValue?: number;
}

const PenaltyWarningPopup: React.FC<PenaltyWarningPopupProps> = ({
  isOpen,
  onClose,
  onYesCompleted,
  sparkyValue = 2000000, // Default value for backward compatibility
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const callbackTriggeredRef = useRef(false);

  // Reset state when popup opens or closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsAnimating(false);
      callbackTriggeredRef.current = false;
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Function to handle closing with animation
  const handleCloseWithAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 500);
  };

  // Function to handle Yes Completed with animation
  const handleYesCompletedWithAnimation = () => {
    if (isAnimating || callbackTriggeredRef.current) return;
    setIsAnimating(true);
    callbackTriggeredRef.current = true;

    // First close this popup completely
    setTimeout(() => {
      // First call onClose to fully remove this popup from DOM
      onClose();

      // Then with a slight delay, trigger the callback to show the next popup
      setTimeout(() => {
        onYesCompleted();
      }, 100);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-end justify-center z-[10000]">
      <div
        className="fixed inset-0 backdrop-blur-[14px] bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseWithAnimation();
          }
        }}
      />
      <div
        className={`fixed inset-x-0 bottom-0 transform transition-all duration-500 max-w-md mx-auto ${
          isAnimating ? "opacity-0 translate-y-full" : "opacity-100"
        }`}
      >
        <button
          onClick={handleCloseWithAnimation}
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
          <Image src="/assets/Close.png" alt="Close" width={32} height={32} />
        </button>

        <div className="w-full relative backdrop-blur-[14px] rounded-t-[10px] bg-[#291818] border border-white/10 box-border h-[650px]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none rounded-t-[10px]" />
          <div className="relative h-full flex flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="mt-4">
                <Image
                  src="/assets/Earn/PenaltyWarningPopupIcon.png"
                  alt="Penalty Warning Icon"
                  width={180}
                  height={132}
                  className="mb-4"
                  priority
                />
              </div>
              <div className="w-full flex flex-col items-center gap-4">
                <b className="w-full relative tracking-[-0.02em] leading-[140%] text-[24px] font-rounded-mplus text-[#e18700] text-center">
                  <p className="m-0">Be sure to</p>
                  <p className="m-0">complete the task!</p>
                </b>
                <p className="w-full relative text-[14px] tracking-[-0.02em] leading-[140%] font-rounded-mplus text-white opacity-60 text-center">
                  If you&apos;re caught cheating (must be <br /> subscribed for
                  at least 5 days), you&apos;ll <br /> be penalized with double
                  the SPARK.
                </p>
              </div>

              <div className="flex flex-col gap-4 mt-6 w-full">
                {/* Combined amounts container */}
                <div className="flex items-center justify-between gap-4">
                  {/* Positive amount */}
                  <div className="relative flex-1 backdrop-blur-[14px] rounded-[10px] bg-[#3A1C09] border border-white/10 box-border p-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/assets/SparkyIcon.png"
                        alt="Sparky"
                        width={18}
                        height={18}
                      />
                      <span className="text-white text-[14px] font-medium">
                        +{sparkyValue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Negative amount (2x sparky value) */}
                  <div className="relative flex-1 backdrop-blur-[14px] rounded-[10px] bg-[#3A1C09] border border-white/10 box-border p-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/assets/SparkyIcon.png"
                        alt="Sparky"
                        width={18}
                        height={18}
                      />
                      <span className="text-[#FF4343] text-[14px] font-medium">
                        -{(sparkyValue * 2).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <CustomYellowButton
                onClick={handleYesCompletedWithAnimation}
                className="mt-8"
                disabled={isAnimating}
              >
                Yes, Completed!
              </CustomYellowButton>

              <button
                onClick={handleCloseWithAnimation}
                className="w-full text-[#e18700] underline text-center hover:opacity-80 transition-colors text-sm mt-2"
                disabled={isAnimating}
              >
                Let me check again!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PenaltyWarningPopup;
