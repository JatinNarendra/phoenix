"use client";
import React from "react";

interface LoaderProps {
  isLoading?: boolean;
  size?: "small" | "medium" | "large";
  color?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  isLoading = true,
  size = "medium",
  color = "#FCC204",
  className = "",
}) => {
  if (!isLoading) return null;

  const sizeMap = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeMap[size]} animate-spin`}
        style={{
          borderRadius: "50%",
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
        }}
      />
      <span>Please wait...</span>
    </div>
  );
};

export default Loader;
