import { useCallback, useRef, useState, useEffect, useMemo } from "react";

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
}

export const useLongPress = ({
  onLongPress,
  onClick,
  ms = 500,
}: LongPressOptions) => {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isLongPressActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const start = useCallback((_event: React.TouchEvent | React.MouseEvent) => {
    // Don't prevent default for touch events
    isLongPressActiveRef.current = false;
    setIsPressed(true);
    
    timerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const stop = useCallback((event: React.TouchEvent | React.MouseEvent, shouldTriggerClick: boolean = true) => {
    // Prevent click when long press is active
    if (isLongPressActiveRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (shouldTriggerClick && !isLongPressActiveRef.current && onClick) {
        onClick();
      }
    }
    isLongPressActiveRef.current = false;
  }, [onClick]);

  const handlers = useMemo(() => ({
    onMouseDown: (e: React.MouseEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => stop(e),
    onMouseLeave: (e: React.MouseEvent) => stop(e, false),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onTouchEnd: (e: React.TouchEvent) => stop(e),
  }), [start, stop]);

  return {
    handlers,
    isPressed,
  };
};
