"use client";

import React from "react";
import { FaBug } from "react-icons/fa";

interface DebugIconProps {
  onClick: () => void;
}

const DebugIcon: React.FC<DebugIconProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 bg-black text-red-600 p-2 rounded-full shadow-lg hover:bg-gray-900 focus:outline-none border border-gray-800"
      aria-label="Debug"
    >
      <FaBug size={16} />
    </button>
  );
};

export default DebugIcon; 