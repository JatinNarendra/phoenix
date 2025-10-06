"use client";
import React, { useEffect, useState, useRef } from 'react';
import anime from 'animejs';

interface AnimeJSCounterProps {
  value: number;
  formatOptions?: Intl.NumberFormatOptions;
  className?: string;
  duration?: number;
}

export const AnimeJSCounter: React.FC<AnimeJSCounterProps> = ({
  value,
  formatOptions = {},
  className = '',
  duration = 800
}) => {
  const [displayValue, setDisplayValue] = useState(Math.floor(value));
  const prevValueRef = useRef(Math.floor(value));
  const animationRef = useRef<anime.AnimeInstance | null>(null);

  useEffect(() => {
    const intValue = Math.floor(value);
    
    // Don't animate on first render
    if (prevValueRef.current === intValue) {
      return;
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      animationRef.current.pause();
    }

    // Start with the previous value
    const startValue = prevValueRef.current;

    // Store the new value for the next update
    prevValueRef.current = intValue;

    // Create the animation
    animationRef.current = anime({
      targets: { value: startValue },
      value: intValue,
      duration: duration,
      easing: 'easeOutExpo',
      round: 1, // Round to whole numbers
      update: (anim) => {
        if (anim.animations[0]) {
          const value = anim.animations[0].currentValue;
          setDisplayValue(Math.floor(Number(value)));
        }
      }
    });

    // Cleanup
    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toLocaleString(undefined, {
        ...formatOptions,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
      })}
    </span>
  );
};

export default AnimeJSCounter; 