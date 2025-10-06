import React from "react";

interface SpinProgressionData {
  currentStep: number;
  totalSteps: number;
  collectedTokens: number;
  requiredTokens: number;
}

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  spinProgression?: SpinProgressionData;
}

export default function Tooltip({ children, content, position = 'right', spinProgression }: TooltipProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return "bottom-full right-0 mb-2";
      case 'bottom':
        return "top-full -left-48 mt-2";
      case 'left':
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case 'right':
      default:
        return "-top-2 left-full ml-2";
    }
  };

  const getArrowPositionClasses = () => {
    switch (position) {
      case 'top':
        return "top-full right-4 -mt-1";
      case 'bottom':
        return "bottom-full right-4 -mb-1";
      case 'left':
        return "left-full top-1/2 -translate-y-1/2 -ml-1";
      case 'right':
      default:
        return "-left-1 top-3";
    }
  };

  const getArrowBorderClasses = () => {
    switch (position) {
      case 'top':
        return "border-b border-r"; // Point downward for top position
      case 'bottom':
        return "border-t border-l"; // Point upward for bottom position
      case 'left':
        return "border-t border-r"; // Point rightward for left position
      case 'right':
      default:
        return "border-t border-l"; // Point leftward for right position
    }
  };

  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute z-50 invisible group-hover:visible bg-[#301402] text-white text-sm rounded-lg py-3 px-4
        ${getPositionClasses()} min-w-[240px] shadow-2xl border border-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        style={{ boxShadow: '0 30px 100px rgba(0, 0, 0, 1), 0 20px 70px rgba(0, 0, 0, 0.95), 0 10px 45px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 165, 1, 0.3)' }}
      >
        {content}
        
        {/* Spin Progression Completion Indicator */}
        {spinProgression && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-300 font-bold">Types Remaining:</span>
              <span className="text-xs text-yellow-400 font-bold">
                {spinProgression.currentStep + 1}/{spinProgression.totalSteps}
              </span>
            </div>
          </div>
        )}
        
        <div className={`absolute w-3 h-3 bg-[#301402] border-yellow-500 ${getArrowBorderClasses()} transform rotate-45 ${getArrowPositionClasses()}`} />
      </div>
    </div>
  );
}
