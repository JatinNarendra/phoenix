/**
 * Utility functions for spin-related calculations
 */

/**
 * Calculate how many spins should be added based on user inactivity
 * @param lastActiveTime - Timestamp when user was last active
 * @param currentSpins - Current number of spins user has
 * @param maxSpins - Maximum spins allowed (default 50)
 * @returns Object containing spins to add and explanation
 */
export function calculateRetroactiveSpins(
  lastActiveTime: number,
  currentSpins: number,
  maxSpins: number = 50
): { spinsToAdd: number; minutesAway: number; explanation: string } {
  // If user already has max spins, no need to add more
  if (currentSpins >= maxSpins) {
    return {
      spinsToAdd: 0,
      minutesAway: 0,
      explanation: "User already has maximum spins"
    };
  }

  const now = Date.now();
  const timeDifference = now - lastActiveTime;
  
  // Only calculate if user was away for more than 1 minute
  if (timeDifference < 60 * 1000) {
    return {
      spinsToAdd: 0,
      minutesAway: 0,
      explanation: "User was away for less than 1 minute"
    };
  }

  // Calculate minutes away (rounded down)
  const minutesAway = Math.floor(timeDifference / (60 * 1000));
  
  // Calculate spins to add (2 spins per minute)
  const potentialSpinsToAdd = minutesAway * 2;
  
  // Cap the total spins at maxSpins
  const spinsToAdd = Math.min(potentialSpinsToAdd, maxSpins - currentSpins);
  
  return {
    spinsToAdd,
    minutesAway,
    explanation: `User was away for ${minutesAway} minutes, adding ${spinsToAdd} spins (${potentialSpinsToAdd} calculated, capped at ${maxSpins} total)`
  };
}

/**
 * Update user's last active time
 * @param gameState - Current game state
 * @returns Updated game state with new lastActiveTime
 */
export function updateLastActiveTime<T extends { lastActiveTime?: number }>(gameState: T): T {
  return {
    ...gameState,
    lastActiveTime: Date.now()
  };
}

/**
 * Check if enough time has passed since last activity to warrant spin calculation
 * @param lastActiveTime - Timestamp when user was last active
 * @param minimumMinutes - Minimum minutes that must pass (default 1)
 * @returns Whether enough time has passed
 */
export function shouldCalculateRetroactiveSpins(
  lastActiveTime: number,
  minimumMinutes: number = 1
): boolean {
  const now = Date.now();
  const timeDifference = now - lastActiveTime;
  return timeDifference >= (minimumMinutes * 60 * 1000);
} 