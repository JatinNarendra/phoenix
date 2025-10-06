"use client";

import React from "react";
import Image from "next/image";
import { toast, Toast } from "react-hot-toast";
// Remove image imports - we'll use src paths instead

interface ToastContentProps {
  t: Toast;
  message: React.ReactNode;
  variant?: string;
}

export const GameToastContent = ({
  t,
  message,
  variant,
}: ToastContentProps): React.ReactElement => {
  // Determine which icon to use based on the variant
  const getIconSrc = () => {
    switch (variant) {
      case "error":
        return "/assets/reddiamondicon.png";
      case "reward":
        return "/assets/TaskCompletedDiamond.png"; // Use TaskCompletedDiamond for reward/success
      case "success":
        return "/assets/TaskCompletedDiamond.png"; // Use TaskCompletedDiamond for success
      default:
        return "/assets/TaskCompletedDiamond.png";
    }
  };

  return (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0 relative w-[27px] h-[31px] flex items-center">
          <Image
            src={getIconSrc()}
            alt=""
            width={27}
            height={31}
            className="object-contain"
          />
        </div>
        <div className="text-white opacity-60 text-base leading-[140%] tracking-[-0.02em] max-w-[230px] flex-1 whitespace-pre-line">
          {message}
        </div>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 relative w-[29px] h-[29px] flex items-center"
      >
        <Image
          src="/assets/Close.png"
          alt="Close"
          width={29}
          height={29}
          className="object-contain"
        />
      </button>
    </div>
  );
};
