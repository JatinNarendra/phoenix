import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatCompactNumber } from './spinConstants';
import { Gift } from 'lucide-react';

// ProgressionBar Component
interface ProgressionBarProps {
  collectedTokens: number;
  requiredTokens: number;
  reward: {
    type: 'sparkcoins' | 'spins' | 'turbo' | 'recharge' | 'sparktoken';
    value: string | number;
  };
  isTypeCompletionRestricted?: boolean;
  timeUntilNextCompletion?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  isGlobalTimer?: boolean;
  hasCompletedAllSteps?: boolean; // Add new prop to indicate if user has completed all steps
}

const ProgressionBar: React.FC<ProgressionBarProps> = ({
  collectedTokens,
  requiredTokens,
  reward,
  isTypeCompletionRestricted,
  timeUntilNextCompletion,
  isGlobalTimer = false,
  hasCompletedAllSteps = false, // Default to false
}) => {
  const router = useRouter();
  const progress = (collectedTokens / requiredTokens) * 100;

  const getRewardImage = (type: string) => {
    switch (type) {
      case 'turbo':
        return '/assets/spin/turbo.png';
      case 'spins':
        return '/assets/spin/spin.png';
      case 'recharge':
        return '/assets/spin/recharge.png';
      case 'sparkcoins':
        return '/assets/spin/sparkcoin.png';
      case 'sparkytoken':
        return '/assets/spin/token.png';
      default:
        return '/assets/spin/sparkcoin.png';
    }
  };

  // Fix image aspect ratio warning by ensuring proper style attributes
  const imageStyle = { width: "auto", height: "auto" };

  // Determine if we should show the timer
  // Show timer if either:
  // 1. Type completion is restricted and we have timer data, OR
  // 2. User has completed all steps in the current type
  const shouldShowTimer = (isTypeCompletionRestricted && timeUntilNextCompletion) || hasCompletedAllSteps;

  // Create a default timer object if needed
  const defaultTimer = { hours: 0, minutes: 0, seconds: 0 };
  const timerToShow = timeUntilNextCompletion || defaultTimer;

  // Format the timer string
  const formattedTime = `${String(timerToShow.hours).padStart(2, '0')}:${String(timerToShow.minutes).padStart(2, '0')}:${String(timerToShow.seconds).padStart(2, '0')}`;

  return (
    <div className="w-full px-10">
      <div className="w-full">
        <div className="flex items-center justify-between w-full gap-0">
          {/* charactertoken requirement */}
          <div className="flex-shrink-0 flex items-center w-[24px] z-10">
            <Image 
              src="/assets/spin/token.png" 
              alt="Token" 
              width={64} 
              height={64} 
              style={imageStyle} 
              className={shouldShowTimer ? "opacity-90 grayscale" : ""}
            />
          </div>

          {/* character token requirement progress bar or timer */}
          <div className="flex-1 w-[200px] -mx-[10px]">
            {shouldShowTimer ? (
              // Show timer when type completion is restricted or all steps completed
              <div className="h-5 rounded-full overflow-hidden relative" style={{
                background: 'rgb(48, 20, 2)',
                borderRadius: '9999px',
                boxShadow: '0 0 0 1px #777'
              }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-white">
                      {isGlobalTimer ? 'Global Type Rotation' : 'Time Left'}:
                    </span>
                    <span className="text-xs font-medium text-white ml-1">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Show normal progress bar
              <div className="h-5 rounded-full overflow-hidden relative" style={{
                background: 'rgb(48, 20, 2)',
                borderRadius: '9999px',
                boxShadow: '0 0 0 1px #CD1E08'
              }}>
                <div className="absolute inset-[1px] bg-[#301402] rounded-full">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 1.5 }}>
                  <span className="text-xs font-medium text-white">
                    {`${collectedTokens}/${requiredTokens}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* character token requirement reward */}
          <div className="flex-shrink-0 flex flex-col items-center w-[32px] mt-0 z-10">
            {shouldShowTimer ? (
              // Show grayed out gift icon when timer is shown
              <div className="flex items-center justify-center w-[24px] h-[24px] rounded-full bg-[#301402] border border-[#777777] mt-2 mr-2">
                <Gift size={16} className="text-gray-500 opacity-90" />
              </div>
            ) : (
              // Show normal reward image when timer is not shown
              <Image 
                src={getRewardImage(reward.type)} 
                alt={reward.type} 
                width={68} 
                height={68} 
                style={imageStyle}
              />
            )}
            <span className={`text-xs font-medium ${shouldShowTimer ? "text-gray-500" : "text-gray-300"} px-2 rounded-2xl whitespace-nowrap -mt-2`} style={{
              background: '#301402',
              borderRadius: '1rem',
              boxShadow: shouldShowTimer 
                ? '0 0 0 1px #777' 
                : '0 0 0 1px #CD1E08',
              visibility: shouldShowTimer ? 'hidden' : 'visible'
            }}>
              {typeof reward.value === 'number' ? formatCompactNumber(reward.value) : reward.value}
            </span>
          </div>

          {/* how it works button */}
          <div className={`flex items-center  z-10 cursor-pointer ${shouldShowTimer ? '-ml-[12px] mt-6' : '-ml-[3px] mt-6'}`} onClick={() => router.push('/spin/how-it-works')}>
            <Image 
              src="/assets/spin/brownquestionmarkdiamond.png" 
              alt="How it works" 
              width={20} 
              height={20}
              className="hover:opacity-80 transition-opacity"
              style={imageStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressionBar; 