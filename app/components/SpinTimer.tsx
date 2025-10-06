import React, { useEffect, useState } from 'react';

interface SpinTimerProps {
  nextSpinsTimer: number;
  formatTime: (seconds: number) => string;
  className?: string;
}

const SpinTimer: React.FC<SpinTimerProps> = ({
  nextSpinsTimer,
  formatTime,
  className = ''
}) => {
  // Create internal timer state that updates every second
  const [internalTimer, setInternalTimer] = useState(nextSpinsTimer);
  const [timerKey, setTimerKey] = useState(Date.now());
  
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
    <div className={`relative w-full h-6 ${className}`}>
      <div className="relative w-full h-full">
        <div className="absolute inset-0 rounded-lg bg-black border border-[rgba(226,144,41,0.4)] shadow-[0_0_10px_rgba(226,144,41,0.2)]">
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" key={timerKey}>
            {formatTime(internalTimer)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpinTimer; 