import React, { useEffect, useState } from 'react';
import { GameState } from '../types/gameTypes';

interface SpinsDisplayProps {
  gameState: GameState;
  latestStateRef: React.MutableRefObject<{
    spins: number;
    coins: number;
  }>;
  nextSpinsTimer: number;
  // nextSpinTime is used in the parent component but not here
  // Using _nextSpinTime with underscore to indicate it's not used
  _nextSpinTime: number | null;
  formatTime: (seconds: number) => string;
}

const SpinsDisplay: React.FC<SpinsDisplayProps> = ({
  gameState,
  latestStateRef,
  nextSpinsTimer,
  _nextSpinTime,
  formatTime
}) => {
  // Use the gameState value as the primary source of truth
  // Fall back to the ref only if needed
  const spinCount = gameState.spins !== undefined ? 
    gameState.spins : 
    latestStateRef.current.spins;
    
  // Create internal timer state that updates every second
  const [internalTimer, setInternalTimer] = useState(nextSpinsTimer);
  const [timerKey, setTimerKey] = useState(Date.now());
  
  // Update the ref to match gameState for consistency
  useEffect(() => {
    if (gameState.spins !== undefined) {
      latestStateRef.current.spins = gameState.spins;
    }
  }, [gameState.spins, latestStateRef]);

  // Update internal timer when nextSpinsTimer changes
  useEffect(() => {
    setInternalTimer(nextSpinsTimer);
  }, [nextSpinsTimer]);
  
  // Set up a timer that updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setInternalTimer(prev => {
        const newValue = Math.max(0, prev - 1);
        // Force re-render by updating the key
        setTimerKey(Date.now());
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Spins Progress Bar */}
      <div className="w-full flex justify-center">
        <div className="w-3/4 max-w-[140px] flex flex-col gap-2">
          <div>
            <div className="relative rounded-full overflow-hidden" style={{
              background: 'linear-gradient(#301402, #301402) padding-box, linear-gradient(to bottom, #670F04, #CD1E08) border-box',
              border: '1px solid transparent'
            }}>
              <div className="relative h-5 rounded-full overflow-hidden">
                {spinCount < 50 ? (
                  <div 
                    className="absolute inset-0 bg-[#FFA501] transition-all duration-300"
                    style={{ width: `${(spinCount / 50) * 100}%` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#FFA501]" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {spinCount >= 50 ? '50/50' : `${spinCount}/50`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Excess Spins above 50 or show SpinTimer Progress Bar */}
      <div className="w-full flex justify-center">
        <div className="w-[120px]">
          {spinCount >= 50 ? (
            <div className="flex justify-center">
              <div className="relative">
                <div className="relative text-xs font-medium px-3 py-1 rounded-2xl flex items-center gap-1" 
                  style={{
                    background: 'linear-gradient(#301402, #301402) padding-box, linear-gradient(to bottom, #670F04, #CD1E08) border-box',
                    border: '1px solid transparent'
                  }}>
                  {spinCount === 50 ? (
                    <span className='px-4'>Full</span>
                  ) : (
                    <>
                      <span>+{spinCount - 50}</span>
                      <span>spins</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-full" 
              style={{
                background: 'linear-gradient(#301402, #301402) padding-box, linear-gradient(to bottom, #670F04, #CD1E08) border-box',
                border: '1px solid transparent'
              }}>
              <div className="relative h-5 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-0 bg-[#301402] transition-all duration-300"
                  style={{ 
                    // Testing code - 1 minute timer (60 seconds)
                    width: `${((60 - internalTimer) / 60) * 100}%` 
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-white whitespace-nowrap" key={timerKey}>
                    2 spins in {formatTime(internalTimer)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SpinsDisplay; 