"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { resetUserProgressionData } from '../lib/userInitializer';
import { useGame } from './GameContext';

type RewardType = 'sparkcoins' | 'spins' | 'turbo' | 'recharge';

interface Reward {
  type: RewardType;
  value: number;
}

interface Step {
  tokens: number;
  reward: Reward;
}

type TypeProgressionData = Step[];

interface CompletedStep {
  type: number;
  step: number;
  reward: Reward;
}

interface ProgressionState {
  currentType: number;
  currentStep: number;
  collectedTokens: number;
  requiredTokens: number;
  reward: Reward;
  earnedRewards: {
    sparkcoins: number;
    spins: number;
    turbo: number;
    recharge: number;
  };
  lastCompletedStep: CompletedStep | null;
  lastCompletedType: number | null;
}

interface ProgressionTypeDefinition {
  id: number;
  name: string;
  ultimateReward: number;
  steps: {
    tokensRequired: number;
    reward: {
      spark?: number;
      spins?: number;
      turbo?: number;
      recharge?: number;
    }
  }[];
}

interface CharacterProgressionState {
  tokenType: number;
  nextRotationTime: number;
  currentTokens: number;
  requiredTokens: number;
  currentStep: number;
}

interface ProgressionContextType {
  state: ProgressionState;
  updateProgressWithTokens: (tokens: number) => void;
  resetProgression: () => void;
  clearStepCompletion: () => void;
  clearTypeCompletion: () => void;
  getTypeProgressionData: (type: number) => TypeProgressionData;
  getTypeCompletionReward: (type: number) => Reward | null;
  hasPendingRewards: () => boolean;
  getTimeRemaining: (nextRotationTime: number) => { hours: number; minutes: number; seconds: number; total: number };
  getProgressionType: (tokenType: number) => ProgressionTypeDefinition;
  initializeCharacterProgression: () => CharacterProgressionState;
  getGlobalRotationInfo: () => { tokenType: number; nextRotationTime: number };
  // Add new function to check if type completion is allowed
  isTypeCompletionAllowed: () => boolean;
  // Add function to get time remaining until next type completion is allowed
  getTimeUntilNextTypeCompletion: () => { hours: number; minutes: number; seconds: number; total: number };
  // New scheduling functions
  getCurrentlyActiveType: () => number;
  getTypeSchedule: (type: number) => { type: number; startTime: number; endTime: number; isCurrentlyActive: boolean } | null;
  isTypeCurrentlyActive: (type: number) => boolean;
  getTimeUntilTypeActive: (type: number) => { hours: number; minutes: number; seconds: number; total: number };
  getTimeUntilTypeEnd: (type: number) => { hours: number; minutes: number; seconds: number; total: number };
}

// Duration of each token type in milliseconds (72 hours)
export const ROTATION_DURATION = 72 * 60 * 60 * 1000;

// Base time for global rotation - Get from environment variable
// Format: YYYY-MM-DDTHH:mm:ssZ (e.g., 2024-12-01T00:00:00Z)
const getBaseTimeFromEnv = () => {
  const baseDate = process.env.NEXT_PUBLIC_GLOBAL_ROTATION_BASE_DATE;
  if (!baseDate) {
    return new Date('2024-12-01T00:00:00Z').getTime();
  }
  return new Date(baseDate).getTime();
};

export const GLOBAL_ROTATION_BASE_TIME = getBaseTimeFromEnv();

// Define the rotation sequence with all 22 types
export const rotationSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

/**
 * Get the currently active type based on the global rotation schedule
 * This is the type that should be "live" right now
 */
export const getCurrentlyActiveType = () => {
  const now = Date.now();
  const timeSinceBase = now - GLOBAL_ROTATION_BASE_TIME;
  const rotationCycles = Math.floor(timeSinceBase / ROTATION_DURATION);
  const currentTypeIndex = rotationCycles % rotationSequence.length;
  

  
  return rotationSequence[currentTypeIndex];
};

/**
 * Get the start and end times for a specific type
 */
export const getTypeSchedule = (type: number) => {
  // Find the index of this type in the rotation sequence
  const typeIndex = rotationSequence.indexOf(type);
  if (typeIndex === -1) return null;
  
  const now = Date.now();
  const timeSinceBase = now - GLOBAL_ROTATION_BASE_TIME;
  const rotationCycles = Math.floor(timeSinceBase / ROTATION_DURATION);
  
  // Calculate when this type was last active or will be next active
  let typeStartTime: number;
  let typeEndTime: number;
  
  // Check if this type is currently active
  const currentTypeIndex = rotationCycles % rotationSequence.length;
  
  if (typeIndex === currentTypeIndex) {
    // This type is currently active
    typeStartTime = GLOBAL_ROTATION_BASE_TIME + (rotationCycles * ROTATION_DURATION);
    typeEndTime = typeStartTime + ROTATION_DURATION;
  } else if (typeIndex < currentTypeIndex) {
    // This type was active in a previous cycle
    const cyclesAgo = currentTypeIndex - typeIndex;
    typeStartTime = GLOBAL_ROTATION_BASE_TIME + ((rotationCycles - cyclesAgo) * ROTATION_DURATION);
    typeEndTime = typeStartTime + ROTATION_DURATION;
  } else {
    // This type will be active in a future cycle
    const cyclesAhead = typeIndex - currentTypeIndex;
    typeStartTime = GLOBAL_ROTATION_BASE_TIME + ((rotationCycles + cyclesAhead) * ROTATION_DURATION);
    typeEndTime = typeStartTime + ROTATION_DURATION;
  }
  
  return {
    type,
    startTime: typeStartTime,
    endTime: typeEndTime,
    isCurrentlyActive: typeIndex === currentTypeIndex
  };
};

/**
 * Check if a type is currently active (live)
 */
export const isTypeCurrentlyActive = (type: number) => {
  const schedule = getTypeSchedule(type);
  if (!schedule) return false;
  
  const now = Date.now();
  return now >= schedule.startTime && now < schedule.endTime;
};

/**
 * Get the time remaining until a type becomes active
 */
export const getTimeUntilTypeActive = (type: number) => {
  const schedule = getTypeSchedule(type);
  if (!schedule) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  
  const now = Date.now();
  const timeLeft = Math.max(0, schedule.startTime - now);
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds, total: timeLeft };
};

/**
 * Get the time remaining until a type ends
 */
export const getTimeUntilTypeEnd = (type: number) => {
  const schedule = getTypeSchedule(type);
  if (!schedule) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  
  const now = Date.now();
  const timeLeft = Math.max(0, schedule.endTime - now);
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds, total: timeLeft };
};

const defaultState: ProgressionState = {
  currentType: 0,
  currentStep: 0,
  collectedTokens: 0,
  requiredTokens: 10,
  reward: { type: 'sparkcoins', value: 5000 },
  earnedRewards: {
    sparkcoins: 0,
    spins: 0,
    turbo: 0,
    recharge: 0,
  },
  lastCompletedStep: null,
  lastCompletedType: null,
};

// Pre-defined progression data for each type steps and steps rewards
const allProgressionData: { [key: number]: TypeProgressionData } = {
  1: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 69, reward: { type: 'spins', value: 60 } },
    { tokens: 26, reward: { type: 'recharge', value: 10 } },
    { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 115, reward: { type: 'spins', value: 200 } },
    { tokens: 39, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 26, reward: { type: 'recharge', value: 20 } },
    { tokens: 129, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 479, reward: { type: 'spins', value: 1000 } },
    { tokens: 65, reward: { type: 'recharge', value: 25 } },
    { tokens: 772, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1643, reward: { type: 'spins', value: 2000 } },
    { tokens: 65, reward: { type: 'recharge', value: 35 } },
    { tokens: 889, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2303, reward: { type: 'spins', value: 3000 } },
    { tokens: 135, reward: { type: 'recharge', value: 40 } },
    { tokens: 943, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3281, reward: { type: 'spins', value: 4000 } },
    { tokens: 150, reward: { type: 'recharge', value: 45 } },
    { tokens: 1345, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5355, reward: { type: 'spins', value: 5000 } }
  ],
  2: [
    { tokens: 4, reward: { type: 'sparkcoins', value: 75000 } },
    { tokens: 5, reward: { type: 'turbo', value: 5 } },
    { tokens: 5, reward: { type: 'recharge', value: 1 } },
    { tokens: 5, reward: { type: 'spins', value: 15 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 250000 } },
    { tokens: 7, reward: { type: 'spins', value: 25 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 5, reward: { type: 'recharge', value: 4 } },
    { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 76, reward: { type: 'spins', value: 200 } },
    { tokens: 43, reward: { type: 'sparkcoins', value: 5000000 } },
    { tokens: 493, reward: { type: 'spins', value: 600 } },
    { tokens: 257, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 51, reward: { type: 'recharge', value: 20 } },
    { tokens: 642, reward: { type: 'sparkcoins', value: 20000000 } },
    { tokens: 1643, reward: { type: 'spins', value: 2000 } },
    { tokens: 803, reward: { type: 'sparkcoins', value: 25000000 } },
    { tokens: 81, reward: { type: 'recharge', value: 25 } },
    { tokens: 2141, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2875, reward: { type: 'spins', value: 2500 } }
  ],
  3: [
    { tokens: 4, reward: { type: 'sparkcoins', value: 75000 } },
    { tokens: 5, reward: { type: 'turbo', value: 5 } },
    { tokens: 5, reward: { type: 'recharge', value: 1 } },
    { tokens: 5, reward: { type: 'spins', value: 15 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 250000 } },
    { tokens: 74, reward: { type: 'spins', value: 60 } },
    { tokens: 25, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 107, reward: { type: 'spins', value: 200 } },
    { tokens: 39, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 28, reward: { type: 'recharge', value: 20 } },
    { tokens: 130, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 435, reward: { type: 'spins', value: 1000 } },
    { tokens: 62, reward: { type: 'recharge', value: 25 } },
    { tokens: 710, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1582, reward: { type: 'spins', value: 2000 } },
    { tokens: 63, reward: { type: 'recharge', value: 35 } },
    { tokens: 961, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2295, reward: { type: 'spins', value: 3000 } },
    { tokens: 144, reward: { type: 'recharge', value: 40 } },
    { tokens: 1001, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3031, reward: { type: 'spins', value: 4000 } },
    { tokens: 139, reward: { type: 'recharge', value: 45 } },
    { tokens: 1464, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 4825, reward: { type: 'spins', value: 5000 } }
  ],
  4: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 5, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 71, reward: { type: 'spins', value: 60 } },
    { tokens: 28, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 113, reward: { type: 'spins', value: 200 } },
    { tokens: 35, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 129, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 434, reward: { type: 'spins', value: 1000 } },
    { tokens: 61, reward: { type: 'recharge', value: 25 } },
    { tokens: 795, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1658, reward: { type: 'spins', value: 1500 } },
    { tokens: 61, reward: { type: 'recharge', value: 35 } },
    { tokens: 905, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2446, reward: { type: 'spins', value: 2000 } },
    { tokens: 122, reward: { type: 'recharge', value: 40 } },
    { tokens: 1001, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3411, reward: { type: 'spins', value: 2500 } },
    { tokens: 145, reward: { type: 'recharge', value: 45 } },
    { tokens: 1252, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5845, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  5: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 10, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 8, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 74, reward: { type: 'spins', value: 60 } },
    { tokens: 25, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 112, reward: { type: 'spins', value: 200 } },
    { tokens: 35, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 24, reward: { type: 'recharge', value: 20 } },
    { tokens: 122, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 449, reward: { type: 'spins', value: 1000 } },
    { tokens: 68, reward: { type: 'recharge', value: 25 } },
    { tokens: 747, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1497, reward: { type: 'spins', value: 2000 } },
    { tokens: 62, reward: { type: 'recharge', value: 35 } },
    { tokens: 822, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2083, reward: { type: 'spins', value: 3000 } },
    { tokens: 141, reward: { type: 'recharge', value: 40 } },
    { tokens: 894, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3129, reward: { type: 'spins', value: 4000 } },
    { tokens: 138, reward: { type: 'recharge', value: 45 } },
    { tokens: 1374, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5668, reward: { type: 'spins', value: 5000 } }
  ],
  6: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 10, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 73, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 126, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 26, reward: { type: 'recharge', value: 20 } },
    { tokens: 137, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 490, reward: { type: 'spins', value: 1000 } },
    { tokens: 70, reward: { type: 'recharge', value: 25 } },
    { tokens: 784, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1710, reward: { type: 'spins', value: 1500 } },
    { tokens: 59, reward: { type: 'recharge', value: 35 } },
    { tokens: 841, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2206, reward: { type: 'spins', value: 2000 } },
    { tokens: 124, reward: { type: 'recharge', value: 40 } },
    { tokens: 893, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3019, reward: { type: 'spins', value: 2500 } },
    { tokens: 143, reward: { type: 'recharge', value: 45 } },
    { tokens: 1381, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5210, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  7: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 10, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 64, reward: { type: 'spins', value: 60 } },
    { tokens: 26, reward: { type: 'recharge', value: 10 } },
    { tokens: 14, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 111, reward: { type: 'spins', value: 200 } },
    { tokens: 39, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 27, reward: { type: 'recharge', value: 20 } },
    { tokens: 118, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 432, reward: { type: 'spins', value: 1000 } },
    { tokens: 70, reward: { type: 'recharge', value: 25 } },
    { tokens: 830, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1685, reward: { type: 'spins', value: 2000 } },
    { tokens: 69, reward: { type: 'recharge', value: 35 } },
    { tokens: 958, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2405, reward: { type: 'spins', value: 3000 } },
    { tokens: 148, reward: { type: 'recharge', value: 40 } },
    { tokens: 1005, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3572, reward: { type: 'spins', value: 2500 } },
    { tokens: 161, reward: { type: 'recharge', value: 45 } },
    { tokens: 1221, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5521, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  8: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 10, reward: { type: 'spins', value: 9 } },
    { tokens: 7, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 71, reward: { type: 'spins', value: 60 } },
    { tokens: 24, reward: { type: 'recharge', value: 10 } },
    { tokens: 14, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 107, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 24, reward: { type: 'recharge', value: 20 } },
    { tokens: 133, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 484, reward: { type: 'spins', value: 1000 } },
    // { tokens: 67, reward: { type: 'recharge', value: 25 } },
    // { tokens: 825, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1734, reward: { type: 'spins', value: 1500 } },
    // { tokens: 61, reward: { type: 'recharge', value: 35 } },
    // { tokens: 806, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2218, reward: { type: 'spins', value: 2000 } },
    // { tokens: 129, reward: { type: 'recharge', value: 40 } },
    // { tokens: 888, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3419, reward: { type: 'spins', value: 4000 } },
    // { tokens: 164, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1295, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 5741, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  9: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 63, reward: { type: 'spins', value: 60 } },
    { tokens: 24, reward: { type: 'recharge', value: 10 } },
    { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
  //   { tokens: 126, reward: { type: 'spins', value: 200 } },
  //   { tokens: 43, reward: { type: 'sparkcoins', value: 3000000 } },
  //   { tokens: 24, reward: { type: 'recharge', value: 20 } },
  //   { tokens: 137, reward: { type: 'sparkcoins', value: 10000000 } },
  //   { tokens: 462, reward: { type: 'spins', value: 1000 } },
  // { tokens: 69, reward: { type: 'recharge', value: 25 } },
    // { tokens: 782, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1627, reward: { type: 'spins', value: 2000 } },
    // { tokens: 67, reward: { type: 'recharge', value: 35 } },
    // { tokens: 804, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2223, reward: { type: 'spins', value: 3000 } },
    // { tokens: 151, reward: { type: 'recharge', value: 40 } },
    // { tokens: 887, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3607, reward: { type: 'spins', value: 2500 } },
    // { tokens: 123, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1278, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 5068, reward: { type: 'spins', value: 5000 } }
  ],
  10: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 70, reward: { type: 'spins', value: 60 } },
    // { tokens: 25, reward: { type: 'recharge', value: 10 } },
    // { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    // { tokens: 124, reward: { type: 'spins', value: 200 } },
    // { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    // { tokens: 25, reward: { type: 'recharge', value: 20 } },
    // { tokens: 142, reward: { type: 'sparkcoins', value: 10000000 } },
    // { tokens: 480, reward: { type: 'spins', value: 1000 } },
    // { tokens: 60, reward: { type: 'recharge', value: 25 } },
    // { tokens: 702, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1515, reward: { type: 'spins', value: 1500 } },
    // { tokens: 67, reward: { type: 'recharge', value: 35 } },
    // { tokens: 849, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2247, reward: { type: 'spins', value: 3000 } },
    // { tokens: 142, reward: { type: 'recharge', value: 40 } },
    // { tokens: 905, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3437, reward: { type: 'spins', value: 4000 } },
    // { tokens: 158, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1403, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 4820, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  11: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 72, reward: { type: 'spins', value: 60 } },
    { tokens: 23, reward: { type: 'recharge', value: 10 } },
    { tokens: 14, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 109, reward: { type: 'spins', value: 200 } },
    // { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    // { tokens: 26, reward: { type: 'recharge', value: 20 } },
    // { tokens: 131, reward: { type: 'sparkcoins', value: 10000000 } },
    // { tokens: 462, reward: { type: 'spins', value: 1000 } },
    // { tokens: 61, reward: { type: 'recharge', value: 25 } },
    // { tokens: 832, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1481, reward: { type: 'spins', value: 2000 } },
    // { tokens: 71, reward: { type: 'recharge', value: 35 } },
    // { tokens: 849, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2247, reward: { type: 'spins', value: 3000 } },
    // { tokens: 137, reward: { type: 'recharge', value: 40 } },
    // { tokens: 993, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3307, reward: { type: 'spins', value: 2500 } },
    // { tokens: 142, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1353, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 5284, reward: { type: 'spins', value: 5000 } }
  ],
  12: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    // { tokens: 10, reward: { type: 'spins', value: 9 } },
    // { tokens: 7, reward: { type: 'recharge', value: 4 } },
    // { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    // { tokens: 71, reward: { type: 'spins', value: 60 } },
    // { tokens: 24, reward: { type: 'recharge', value: 10 } },
    // { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    // { tokens: 114, reward: { type: 'spins', value: 200 } },
    // { tokens: 41, reward: { type: 'sparkcoins', value: 3000000 } },
    // { tokens: 24, reward: { type: 'recharge', value: 20 } },
    // { tokens: 123, reward: { type: 'sparkcoins', value: 10000000 } },
    // { tokens: 479, reward: { type: 'spins', value: 1000 } },
    // { tokens: 61, reward: { type: 'recharge', value: 25 } },
    // { tokens: 836, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1765, reward: { type: 'spins', value: 1500 } },
    // { tokens: 63, reward: { type: 'recharge', value: 35 } },
    // { tokens: 914, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2353, reward: { type: 'spins', value: 2000 } },
    // { tokens: 126, reward: { type: 'recharge', value: 40 } },
    // { tokens: 860, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3307, reward: { type: 'spins', value: 2500 } },
    // { tokens: 140, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1285, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 5153, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  13: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 10, reward: { type: 'spins', value: 9 } },
    // { tokens: 6, reward: { type: 'recharge', value: 4 } },
    // { tokens: 7, reward: { type: 'sparkcoins', value: 500000 } },
    // { tokens: 66, reward: { type: 'spins', value: 60 } },
    // { tokens: 24, reward: { type: 'recharge', value: 10 } },
    // { tokens: 14, reward: { type: 'sparkcoins', value: 1000000 } },
    // { tokens: 105, reward: { type: 'spins', value: 200 } },
    // { tokens: 36, reward: { type: 'sparkcoins', value: 3000000 } },
    // { tokens: 26, reward: { type: 'recharge', value: 20 } },
    // { tokens: 127, reward: { type: 'sparkcoins', value: 10000000 } },
    // { tokens: 445, reward: { type: 'spins', value: 1000 } },
    // { tokens: 66, reward: { type: 'recharge', value: 25 } },
    // { tokens: 756, reward: { type: 'sparkcoins', value: 30000000 } },
    // { tokens: 1680, reward: { type: 'spins', value: 2000 } },
    // { tokens: 66, reward: { type: 'recharge', value: 35 } },
    // { tokens: 889, reward: { type: 'sparkcoins', value: 50000000 } },
    // { tokens: 2496, reward: { type: 'spins', value: 3000 } },
    // { tokens: 133, reward: { type: 'recharge', value: 40 } },
    // { tokens: 974, reward: { type: 'sparkcoins', value: 65000000 } },
    // { tokens: 3187, reward: { type: 'spins', value: 4000 } },
    // { tokens: 157, reward: { type: 'recharge', value: 45 } },
    // { tokens: 1265, reward: { type: 'sparkcoins', value: 80000000 } },
    // { tokens: 5284, reward: { type: 'spins', value: 5000 } }
  ],
  14: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 5, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 12, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 70, reward: { type: 'spins', value: 60 } },
    { tokens: 24, reward: { type: 'recharge', value: 10 } },
    { tokens: 14, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 110, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 24, reward: { type: 'recharge', value: 20 } },
    { tokens: 126, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 504, reward: { type: 'spins', value: 1000 } },
    { tokens: 68, reward: { type: 'recharge', value: 25 } },
    { tokens: 715, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1635, reward: { type: 'spins', value: 1500 } },
    { tokens: 61, reward: { type: 'recharge', value: 35 } },
    { tokens: 847, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2475, reward: { type: 'spins', value: 2000 } },
    { tokens: 133, reward: { type: 'recharge', value: 40 } },
    { tokens: 995, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3307, reward: { type: 'spins', value: 2500 } },
    { tokens: 161, reward: { type: 'recharge', value: 45 } },
    { tokens: 1419, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5153, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  15: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 25, reward: { type: 'recharge', value: 10 } },
    { tokens: 13, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 109, reward: { type: 'spins', value: 200 } },
    { tokens: 37, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 132, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 517, reward: { type: 'spins', value: 1000 } },
    { tokens: 65, reward: { type: 'recharge', value: 25 } },
    { tokens: 735, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1626, reward: { type: 'spins', value: 2000 } },
    { tokens: 62, reward: { type: 'recharge', value: 35 } },
    { tokens: 974, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2327, reward: { type: 'spins', value: 3000 } },
    { tokens: 129, reward: { type: 'recharge', value: 40 } },
    { tokens: 1025, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3366, reward: { type: 'spins', value: 4000 } },
    { tokens: 161, reward: { type: 'recharge', value: 45 } },
    { tokens: 1422, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5399, reward: { type: 'spins', value: 5000 } }
  ],
  16: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 70, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 121, reward: { type: 'spins', value: 200 } },
    { tokens: 41, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 27, reward: { type: 'recharge', value: 20 } },
    { tokens: 128, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 453, reward: { type: 'spins', value: 1000 } },
    { tokens: 70, reward: { type: 'recharge', value: 25 } },
    { tokens: 828, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1502, reward: { type: 'spins', value: 1500 } },
    { tokens: 64, reward: { type: 'recharge', value: 35 } },
    { tokens: 919, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2171, reward: { type: 'spins', value: 2000 } },
    { tokens: 133, reward: { type: 'recharge', value: 40 } },
    { tokens: 867, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3314, reward: { type: 'spins', value: 2500 } },
    { tokens: 137, reward: { type: 'recharge', value: 45 } },
    { tokens: 1332, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 4881, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  17: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 106, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 24, reward: { type: 'recharge', value: 20 } },
    { tokens: 138, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 473, reward: { type: 'spins', value: 1000 } },
    { tokens: 64, reward: { type: 'recharge', value: 25 } },
    { tokens: 785, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1741, reward: { type: 'spins', value: 2000 } },
    { tokens: 62, reward: { type: 'recharge', value: 35 } },
    { tokens: 933, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2328, reward: { type: 'spins', value: 3000 } },
    { tokens: 131, reward: { type: 'recharge', value: 40 } },
    { tokens: 1011, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3268, reward: { type: 'spins', value: 4000 } },
    { tokens: 156, reward: { type: 'recharge', value: 45 } },
    { tokens: 1479, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5715, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  18: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 104, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 119, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 455, reward: { type: 'spins', value: 1000 } },
    { tokens: 61, reward: { type: 'recharge', value: 25 } },
    { tokens: 764, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1617, reward: { type: 'spins', value: 1500 } },
    { tokens: 59, reward: { type: 'recharge', value: 35 } },
    { tokens: 845, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2166, reward: { type: 'spins', value: 2000 } },
    { tokens: 133, reward: { type: 'recharge', value: 40 } },
    { tokens: 867, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3314, reward: { type: 'spins', value: 2500 } },
    { tokens: 137, reward: { type: 'recharge', value: 45 } },
    { tokens: 1332, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 4881, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  19: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 112, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 26, reward: { type: 'recharge', value: 20 } },
    { tokens: 136, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 435, reward: { type: 'spins', value: 1000 } },
    { tokens: 62, reward: { type: 'recharge', value: 25 } },
    { tokens: 718, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1582, reward: { type: 'spins', value: 2000 } },
    { tokens: 66, reward: { type: 'recharge', value: 35 } },
    { tokens: 893, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2144, reward: { type: 'spins', value: 2000 } },
    { tokens: 130, reward: { type: 'recharge', value: 40 } },
    { tokens: 1031, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3308, reward: { type: 'spins', value: 4000 } },
    { tokens: 156, reward: { type: 'recharge', value: 45 } },
    { tokens: 1412, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 4938, reward: { type: 'spins', value: 5000 } }
  ],
  20: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 116, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 120, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 475, reward: { type: 'spins', value: 1000 } },
    { tokens: 64, reward: { type: 'recharge', value: 25 } },
    { tokens: 843, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1616, reward: { type: 'spins', value: 1500 } },
    { tokens: 68, reward: { type: 'recharge', value: 35 } },
    { tokens: 928, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2166, reward: { type: 'spins', value: 2000 } },
    { tokens: 135, reward: { type: 'recharge', value: 40 } },
    { tokens: 855, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3333, reward: { type: 'spins', value: 2500 } },
    { tokens: 151, reward: { type: 'recharge', value: 45 } },
    { tokens: 1426, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5141, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  21: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 119, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 139, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 469, reward: { type: 'spins', value: 1000 } },
    { tokens: 59, reward: { type: 'recharge', value: 25 } },
    { tokens: 722, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1604, reward: { type: 'spins', value: 2000 } },
    { tokens: 66, reward: { type: 'recharge', value: 35 } },
    { tokens: 909, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2166, reward: { type: 'spins', value: 2000 } },
    { tokens: 127, reward: { type: 'recharge', value: 40 } },
    { tokens: 984, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3110, reward: { type: 'spins', value: 2500 } },
    { tokens: 147, reward: { type: 'recharge', value: 45 } },
    { tokens: 1391, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5141, reward: { type: 'sparkcoins', value: 90000000 } }
  ],
  22: [
    { tokens: 4, reward: { type: 'turbo', value: 3 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 100000 } },
    { tokens: 11, reward: { type: 'spins', value: 9 } },
    { tokens: 6, reward: { type: 'recharge', value: 4 } },
    { tokens: 6, reward: { type: 'sparkcoins', value: 500000 } },
    { tokens: 65, reward: { type: 'spins', value: 60 } },
    { tokens: 27, reward: { type: 'recharge', value: 10 } },
    { tokens: 12, reward: { type: 'sparkcoins', value: 1000000 } },
    { tokens: 119, reward: { type: 'spins', value: 200 } },
    { tokens: 38, reward: { type: 'sparkcoins', value: 3000000 } },
    { tokens: 25, reward: { type: 'recharge', value: 20 } },
    { tokens: 139, reward: { type: 'sparkcoins', value: 10000000 } },
    { tokens: 469, reward: { type: 'spins', value: 1000 } },
    { tokens: 59, reward: { type: 'recharge', value: 25 } },
    { tokens: 722, reward: { type: 'sparkcoins', value: 30000000 } },
    { tokens: 1604, reward: { type: 'spins', value: 2000 } },
    { tokens: 66, reward: { type: 'recharge', value: 35 } },
    { tokens: 909, reward: { type: 'sparkcoins', value: 50000000 } },
    { tokens: 2166, reward: { type: 'spins', value: 2000 } },
    { tokens: 127, reward: { type: 'recharge', value: 40 } },
    { tokens: 984, reward: { type: 'sparkcoins', value: 65000000 } },
    { tokens: 3110, reward: { type: 'spins', value: 2500 } },
    { tokens: 147, reward: { type: 'recharge', value: 45 } },
    { tokens: 1391, reward: { type: 'sparkcoins', value: 80000000 } },
    { tokens: 5141, reward: { type: 'sparkcoins', value: 90000000 } }
  ]
};

// Type completion rewards - given when all steps in a type are completed
const typeCompletionRewards: { [key: number]: Reward } = {
  1: { type: 'spins', value: 5000 },
  2: { type: 'spins', value: 2500 },
  3: { type: 'spins', value: 5000 },
  4: { type: 'spins', value: 2500 },
  5: { type: 'spins', value: 5000 },
  6: { type: 'spins', value: 2500 },
  7: { type: 'spins', value: 5000 },
  8: { type: 'spins', value: 2500 },
  9: { type: 'spins', value: 5000 },
  10: { type: 'spins', value: 2500 },
  11: { type: 'spins', value: 5000 },
  12: { type: 'spins', value: 2500 },
  13: { type: 'spins', value: 5000 },
  14: { type: 'spins', value: 2500 },
  15: { type: 'spins', value: 5000 },
  16: { type: 'spins', value: 2500 },
  17: { type: 'spins', value: 5000 },
  18: { type: 'spins', value: 2500 },
  19: { type: 'spins', value: 5000 },
  20: { type: 'spins', value: 2500 },
  21: { type: 'spins', value: 5000 },
  22: { type: 'spins', value: 2500 }
};

/**
 * Gets the current progression type based on token type
 * @param tokenType - Token type (1-22)
 * @returns The progression type configuration
 */
export const getProgressionType = (tokenType: number): ProgressionTypeDefinition => {
  // Create a progression type definition from the allProgressionData
  const steps = allProgressionData[tokenType] || allProgressionData[1];
  
  return {
    id: tokenType,
    name: `Type ${tokenType}`,
    ultimateReward: typeCompletionRewards[tokenType]?.value || 5000,
    steps: steps.map(step => ({
      tokensRequired: step.tokens,
      reward: {
        spark: step.reward.type === 'sparkcoins' ? step.reward.value : undefined,
        spins: step.reward.type === 'spins' ? step.reward.value : undefined,
        turbo: step.reward.type === 'turbo' ? step.reward.value : undefined,
        recharge: step.reward.type === 'recharge' ? step.reward.value : undefined
      }
    }))
  };
};

/**
 * Calculate time remaining until next rotation
 * @param nextRotationTime - Timestamp for next rotation
 * @returns Object with hours, minutes, seconds remaining
 */
export const getTimeRemaining = (nextRotationTime: number) => {
  const now = Date.now();
  const timeLeft = Math.max(0, nextRotationTime - now);
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return {
    hours,
    minutes,
    seconds,
    total: timeLeft
  };
};

/**
 * Gets the next token type in the rotation sequence
 * @param currentType - Current token type (1-22)
 * @returns Next token type
 */
export const getNextTokenType = (currentType: number): number => {
  const currentIndex = rotationSequence.findIndex(type => type === currentType);
  
  if (currentIndex === -1 || currentIndex === rotationSequence.length - 1) {
    // If not found or at the end, start from the beginning
    return rotationSequence[0];
  }
  
  return rotationSequence[currentIndex + 1];
};

/**
 * Gets the current token type and next rotation time based on global schedule
 * This ensures all users have the same token type at the same time
 * @returns Object with current token type and next rotation time
 */
export const getGlobalRotationInfo = () => {
  const now = Date.now();
  const timeSinceBase = now - GLOBAL_ROTATION_BASE_TIME;
  const rotationCycles = Math.floor(timeSinceBase / ROTATION_DURATION);
  const currentTypeIndex = rotationCycles % rotationSequence.length;
  const currentTokenType = rotationSequence[currentTypeIndex];
  
  // Calculate the next rotation time (end of current 72-hour period)
  const nextRotationTime = GLOBAL_ROTATION_BASE_TIME + ((rotationCycles + 1) * ROTATION_DURATION);
  
  return {
    tokenType: currentTokenType,
    nextRotationTime
  };
};

/**
 * Initialize character progression if it doesn't exist
 * @returns Initial character progression state
 */
export const initializeCharacterProgression = (): CharacterProgressionState => {
  const { tokenType, nextRotationTime } = getGlobalRotationInfo();
  const progressionType = getProgressionType(tokenType);
  
  return {
    tokenType,
    nextRotationTime,
    currentTokens: 0,
    requiredTokens: progressionType.steps[0].tokensRequired,
    currentStep: 0
  };
};

const ProgressionContext = createContext<ProgressionContextType | undefined>(undefined);

export const ProgressionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get character progression from GameContext to access global rotation timer
  const { gameState, updateSpinProgression } = useGame();

  // Add refs to prevent infinite loops
  const isInitializedRef = useRef(false);
  const isSyncingToGameStateRef = useRef(false);
  const lastSyncedStateRef = useRef<string>('');

  const [state, setState] = useState<ProgressionState>(() => {
    // Get the currently active type from the global rotation schedule
    const currentlyActiveType = getCurrentlyActiveType();
    
    // Try to load from GameState first (database-synced), then fallback to localStorage
    if (gameState.spinProgression) {
      const savedType = gameState.spinProgression.currentType;
      const savedTypeNumber = savedType + 1; // Convert back to 1-based index
      const newType = currentlyActiveType - 1; // Convert to 0-based index
      
      // Check if the global rotation has actually changed to a different type
      // We should only reset if the saved type is not the currently active type
      // AND the saved type is not in the current rotation cycle
      const shouldResetStep = savedTypeNumber !== currentlyActiveType;
      
      // Validate that the saved step is valid for the current type
      const currentTypeData = allProgressionData[currentlyActiveType];
      const savedStep = gameState.spinProgression.currentStep;
      const isStepValid = currentTypeData && currentTypeData[savedStep];
      
      // If step is invalid, we need to reset to the current global step
      const shouldResetDueToInvalidStep = !isStepValid;
      

      
      const initialState = {
        currentType: newType,
        currentStep: (shouldResetStep || shouldResetDueToInvalidStep) ? 0 : gameState.spinProgression.currentStep,
        collectedTokens: (shouldResetStep || shouldResetDueToInvalidStep) ? 0 : gameState.spinProgression.collectedTokens,
        requiredTokens: (shouldResetStep || shouldResetDueToInvalidStep) ? allProgressionData[currentlyActiveType][0].tokens : gameState.spinProgression.requiredTokens,
        reward: (shouldResetStep || shouldResetDueToInvalidStep) ? allProgressionData[currentlyActiveType][0].reward : gameState.spinProgression.reward,
        earnedRewards: gameState.spinProgression.earnedRewards,
        lastCompletedStep: gameState.spinProgression.lastCompletedStep,
        lastCompletedType: gameState.spinProgression.lastCompletedType
      };
      
      // Mark as initialized and set last synced state
      isInitializedRef.current = true;
      lastSyncedStateRef.current = JSON.stringify(initialState);
      
      return initialState;
    }
    
    // Fallback to localStorage if no GameState data
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spinProgression');
      if (saved) {
        try {
          const parsedState = JSON.parse(saved);
          const savedType = parsedState.currentType;
          const savedTypeNumber = savedType + 1; // Convert back to 1-based index
          const newType = currentlyActiveType - 1; // Convert to 0-based index
          
          // Check if the global rotation has actually changed to a different type
          const shouldResetStep = savedTypeNumber !== currentlyActiveType;
          
          // Validate that the saved step is valid for the current type
          const currentTypeData = allProgressionData[currentlyActiveType];
          const savedStep = parsedState.currentStep;
          const isStepValid = currentTypeData && currentTypeData[savedStep];
          
          // If step is invalid, we need to reset to the current global step
          const shouldResetDueToInvalidStep = !isStepValid;
          
         
          
          // Ensure currentType is synchronized with the currently active type
          parsedState.currentType = newType;
          
          if (shouldResetStep || shouldResetDueToInvalidStep) {
            parsedState.currentStep = 0;
            parsedState.collectedTokens = 0;
            parsedState.requiredTokens = allProgressionData[currentlyActiveType][0].tokens;
            parsedState.reward = allProgressionData[currentlyActiveType][0].reward;
          }
          
          isInitializedRef.current = true;
          lastSyncedStateRef.current = JSON.stringify(parsedState);
          return parsedState;
        } catch (e) {
          console.error('Failed to parse saved progression data', e);
        }
      }
    }
    
    // Use default state but with correct currentType and step data
    const correctedDefaultState = {
      ...defaultState,
      currentType: currentlyActiveType - 1, // Convert to 0-based index
      currentStep: 0,
      collectedTokens: 0,
      requiredTokens: allProgressionData[currentlyActiveType][0].tokens,
      reward: allProgressionData[currentlyActiveType][0].reward
    };
    
    isInitializedRef.current = true;
    lastSyncedStateRef.current = JSON.stringify(correctedDefaultState);
    return correctedDefaultState;
  });

  // Sync state changes to GameState (database) and localStorage
  const syncToGameState = useCallback(async (newState: ProgressionState) => {
    // Prevent recursive syncing
    if (isSyncingToGameStateRef.current) {
      return;
    }
    
    const newStateString = JSON.stringify(newState);
    
    // Only sync if the state has actually changed
    if (newStateString === lastSyncedStateRef.current) {
      return;
    }
    
    try {
      isSyncingToGameStateRef.current = true;
      
      // Update GameState with new spin progression data using the dedicated function
      updateSpinProgression({
        currentType: newState.currentType,
        currentStep: newState.currentStep,
        collectedTokens: newState.collectedTokens,
        requiredTokens: newState.requiredTokens,
        reward: newState.reward,
        earnedRewards: newState.earnedRewards,
        lastCompletedStep: newState.lastCompletedStep,
        lastCompletedType: newState.lastCompletedType
      });
      
      // Update last synced state
      lastSyncedStateRef.current = newStateString;
    } catch (error) {
      console.error('Failed to sync spin progression to GameState:', error);
    } finally {
      isSyncingToGameStateRef.current = false;
    }
  }, [updateSpinProgression]);

  // Save to localStorage and GameState whenever state changes
  useEffect(() => {
    // Only sync after initialization to prevent initial sync loops
    if (!isInitializedRef.current) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('spinProgression', JSON.stringify(state));
    }
    
    // Sync to GameState for database persistence
    syncToGameState(state);
  }, [state, syncToGameState]);

  // Only sync from GameState on initial load, not on every change
  useEffect(() => {
    // Only load from GameState if we haven't initialized yet and GameState has data
    if (isInitializedRef.current || !gameState.spinProgression) {
      return;
    }
    
    const gameStateProgression = gameState.spinProgression;
    const initialState = {
      currentType: gameStateProgression.currentType,
      currentStep: gameStateProgression.currentStep,
      collectedTokens: gameStateProgression.collectedTokens,
      requiredTokens: gameStateProgression.requiredTokens,
      reward: gameStateProgression.reward,
      earnedRewards: gameStateProgression.earnedRewards,
      lastCompletedStep: gameStateProgression.lastCompletedStep,
      lastCompletedType: gameStateProgression.lastCompletedType
    };
    
    setState(initialState);
    isInitializedRef.current = true;
    lastSyncedStateRef.current = JSON.stringify(initialState);
  }, [gameState.spinProgression]);

  // Effect to update requiredTokens and reward when currentType changes
  useEffect(() => {
    // Only run after initialization
    if (!isInitializedRef.current) {
      return;
    }
    
    // Get the current step data for the current type
    const currentTypeData = allProgressionData[state.currentType + 1];
    if (currentTypeData && currentTypeData[state.currentStep]) {
      const currentStepData = currentTypeData[state.currentStep];
      
      // Update the state with the correct step data
      setState(prevState => ({
        ...prevState,
        requiredTokens: currentStepData.tokens,
        reward: currentStepData.reward
      }));
    } else {
      // If the current step is invalid, reset to the current global step

      
      // Get the currently active type and determine the correct step
      const currentlyActiveType = getCurrentlyActiveType();
      const globalTypeData = allProgressionData[currentlyActiveType];
      
      if (globalTypeData && globalTypeData[0]) {
        // Reset to step 0 of the currently active type
        setState(prevState => ({
          ...prevState,
          currentType: currentlyActiveType - 1, // Convert to 0-based index
          currentStep: 0,
          collectedTokens: 0,
          requiredTokens: globalTypeData[0].tokens,
          reward: globalTypeData[0].reward
        }));
      }
    }
  }, [state.currentType, state.currentStep]);

  const updateProgressWithTokens = (tokens: number) => {
    setState(prevState => {
      const newCollectedTokens = prevState.collectedTokens + tokens;
      
      // Check if we've completed the current step
      if (newCollectedTokens >= prevState.requiredTokens) {
        // Get the current step's reward
        const currentTypeData = allProgressionData[prevState.currentType + 1];
        const currentStepData = currentTypeData[prevState.currentStep];
        const reward = currentStepData.reward;
        
        // Calculate earned rewards
        const newEarnedRewards = { ...prevState.earnedRewards };
        if (reward.type === 'sparkcoins') {
          newEarnedRewards.sparkcoins += reward.value;
        } else if (reward.type === 'spins') {
          newEarnedRewards.spins += reward.value;
        } else if (reward.type === 'turbo') {
          newEarnedRewards.turbo += reward.value;
        } else if (reward.type === 'recharge') {
          newEarnedRewards.recharge += reward.value;
        }
        
        // Move to the next step
        const nextStep = prevState.currentStep + 1;
        const nextTypeData = allProgressionData[prevState.currentType + 1];
        
        // Check if we've completed all steps for this type
        if (!nextTypeData[nextStep]) {
          // Mark type as completed (type completion reward will be handled separately in spin logic)
          const completedType = prevState.currentType + 1;
          
          // Check if type completion is allowed for the completed type
          const completedTypeSchedule = getTypeSchedule(completedType);
          const now = Date.now();
          
          // If the completed type's period hasn't ended yet, restrict progression
          if (completedTypeSchedule && now < completedTypeSchedule.endTime) {
            // Type completion not allowed - stay on the last step and don't progress to next type
            // But user has already received the type completion reward and type is marked as completed
            return {
              ...prevState,
              collectedTokens: newCollectedTokens, // Keep the tokens but don't progress
              earnedRewards: newEarnedRewards,
              lastCompletedStep: {
                type: prevState.currentType + 1,
                step: prevState.currentStep,
                reward: reward
              },
              lastCompletedType: completedType // Mark as completed type
            };
          }
          
          // Type completion is allowed - proceed to next type
          const nextType = (prevState.currentType + 1) % 22;
          const nextTypeFirstStep = allProgressionData[nextType + 1][0];
          
          return {
            ...prevState,
            currentType: nextType,
            currentStep: 0,
            collectedTokens: 0,
            requiredTokens: nextTypeFirstStep.tokens,
            reward: nextTypeFirstStep.reward,
            earnedRewards: newEarnedRewards,
            lastCompletedStep: {
              type: prevState.currentType + 1,
              step: prevState.currentStep,
              reward: reward
            },
            lastCompletedType: completedType
          };
        }
        
        // Continue to the next step in the same type
        return {
          ...prevState,
          currentStep: nextStep,
          collectedTokens: 0,
          requiredTokens: nextTypeData[nextStep].tokens,
          reward: nextTypeData[nextStep].reward,
          earnedRewards: newEarnedRewards,
          lastCompletedStep: {
            type: prevState.currentType + 1,
            step: prevState.currentStep,
            reward: reward
          },
          lastCompletedType: null
        };
      }
      
      // Just update collected tokens
      return {
        ...prevState,
        collectedTokens: newCollectedTokens
      };
    });
  };

  const resetProgression = () => {
    setState(defaultState);
    // Also clear localStorage to ensure a complete reset
    resetUserProgressionData();
  };

  const clearStepCompletion = () => {
    setState(prevState => ({
      ...prevState,
      lastCompletedStep: null,
      // Don't clear lastCompletedType so the timer continues to show
      // lastCompletedType: null,
      earnedRewards: {
        sparkcoins: 0,
        spins: 0,
        turbo: 0,
        recharge: 0,
      }
    }));
  };

  const clearTypeCompletion = () => {
    setState(prevState => ({
      ...prevState,
      lastCompletedType: null
    }));
  };

  // Add a helper function to check if there are pending rewards
  const hasPendingRewards = () => {
    return (
      state.earnedRewards.sparkcoins > 0 ||
      state.earnedRewards.spins > 0 ||
      state.earnedRewards.turbo > 0 ||
      state.earnedRewards.recharge > 0
    );
  };

  const getTypeProgressionData = (type: number): TypeProgressionData => {
    return allProgressionData[type] || [];
  };

  const getTypeCompletionReward = (type: number): Reward | null => {
    return typeCompletionRewards[type] || null;
  };

  // Check if type completion is allowed based on whether user has completed any type and its cycle hasn't ended
  const isTypeCompletionAllowed = useCallback(() => {
    // Check if user has completed a type and is waiting for timer
    if (state.lastCompletedType) {
      // Get the schedule for the last completed type
      const completedTypeSchedule = getTypeSchedule(state.lastCompletedType);
      if (!completedTypeSchedule) {
        return true; // Allow if no schedule found
      }
      
      const now = Date.now();
      
     
      
      // If the completed type's period hasn't ended yet, restrict progression
      if (now < completedTypeSchedule.endTime) {
        return false;
      }
      
      // If the completed type's period has ended, allow progression
      return true;
    }
    
    // Check if user is on the current global type and has completed all steps
    const currentlyActiveType = getCurrentlyActiveType();
    const currentTypeData = allProgressionData[currentlyActiveType];
    
    // If user is on the current global type and has completed all steps
    if (state.currentType + 1 === currentlyActiveType && currentTypeData) {
      const isOnLastStep = state.currentStep >= currentTypeData.length - 1;
      const hasCompletedCurrentStep = state.collectedTokens >= state.requiredTokens;
      
      if (isOnLastStep && hasCompletedCurrentStep) {
        // User has completed all steps in the current type, check if type period has ended
        const currentTypeSchedule = getTypeSchedule(currentlyActiveType);
        if (currentTypeSchedule) {
          const now = Date.now();
          
         
          
          // If the current type's period hasn't ended yet, restrict progression
          if (now < currentTypeSchedule.endTime) {
            return false;
          }
        }
      }
    }
    
    // Allow progression in all other cases
    return true;
  }, [state.lastCompletedType, state.currentType, state.currentStep, state.collectedTokens, state.requiredTokens]);

  // Get time until next type completion based on the last completed type's schedule
  const getTimeUntilNextTypeCompletion = useCallback(() => {
    // Check if user has completed a type and is waiting for timer
    if (state.lastCompletedType) {
      // Get the schedule for the last completed type
      const completedTypeSchedule = getTypeSchedule(state.lastCompletedType);
      if (!completedTypeSchedule) {
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
      
      const now = Date.now();
      const timeLeft = Math.max(0, completedTypeSchedule.endTime - now);
      
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      
      
      return { hours, minutes, seconds, total: timeLeft };
    }
    
    // Check if user is on the current global type and has completed all steps
    const currentlyActiveType = getCurrentlyActiveType();
    const currentTypeData = allProgressionData[currentlyActiveType];
    
    // If user is on the current global type and has completed all steps
    if (state.currentType + 1 === currentlyActiveType && currentTypeData) {
      const isOnLastStep = state.currentStep >= currentTypeData.length - 1;
      const hasCompletedCurrentStep = state.collectedTokens >= state.requiredTokens;
      
     
      
      if (isOnLastStep && hasCompletedCurrentStep) {
        // User has completed all steps in the current type, show time until type ends
        const currentTypeSchedule = getTypeSchedule(currentlyActiveType);
        if (currentTypeSchedule) {
          const now = Date.now();
          const timeLeft = Math.max(0, currentTypeSchedule.endTime - now);
          
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
         
          
          return { hours, minutes, seconds, total: timeLeft };
        }
      }
    }
    
   
    // No timer needed
    return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  }, [state.lastCompletedType, state.currentType, state.currentStep, state.collectedTokens, state.requiredTokens]);

  return (
    <ProgressionContext.Provider value={{ 
      state, 
      updateProgressWithTokens, 
      resetProgression,
      clearStepCompletion,
      clearTypeCompletion,
      getTypeProgressionData,
      getTypeCompletionReward,
      hasPendingRewards,
      getTimeRemaining,
      getProgressionType,
      initializeCharacterProgression,
      getGlobalRotationInfo,
      isTypeCompletionAllowed,
      getTimeUntilNextTypeCompletion,
      getCurrentlyActiveType,
      getTypeSchedule,
      isTypeCurrentlyActive,
      getTimeUntilTypeActive,
      getTimeUntilTypeEnd
    }}>
      {children}
    </ProgressionContext.Provider>
  );
};

export const useProgression = (): ProgressionContextType => {
  const context = useContext(ProgressionContext);
  
  // Check if we're on a Nexus route and handle gracefully
  if (context === undefined) {
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/nexus') || window.location.pathname === '/nexuslogin')) {
      console.warn("useProgression called on Nexus route without ProgressionProvider, returning null context");
      // Return a safe default context for Nexus routes
      return {
        state: {
          currentType: 0,
          currentStep: 0,
          collectedTokens: 0,
          requiredTokens: 0,
          reward: { type: "sparkcoins" as any, value: 0 },
          earnedRewards: {
            sparkcoins: 0,
            spins: 0,
            turbo: 0,
            recharge: 0,
          },
          lastCompletedStep: null,
          lastCompletedType: null,
        },
        updateProgressWithTokens: () => {},
        resetProgression: () => {},
        clearStepCompletion: () => {},
        clearTypeCompletion: () => {},
        getTypeProgressionData: () => [],
        getTypeCompletionReward: () => null,
        hasPendingRewards: () => false,
        getTimeRemaining: () => ({ hours: 0, minutes: 0, seconds: 0, total: 0 }),
        getProgressionType: () => ({
          id: 0,
          name: "Default",
          ultimateReward: 0,
          steps: [],
        }),
        initializeCharacterProgression: () => ({
          tokenType: 0,
          nextRotationTime: 0,
          currentTokens: 0,
          requiredTokens: 0,
          currentStep: 0,
        }),
        getGlobalRotationInfo: () => ({ tokenType: 0, nextRotationTime: 0 }),
        isTypeCompletionAllowed: () => false,
        getTimeUntilNextTypeCompletion: () => ({ hours: 0, minutes: 0, seconds: 0, total: 0 }),
        getCurrentlyActiveType: () => 0,
        getTypeSchedule: () => null,
        isTypeCurrentlyActive: () => false,
        getTimeUntilTypeActive: () => ({ hours: 0, minutes: 0, seconds: 0, total: 0 }),
        getTimeUntilTypeEnd: () => ({ hours: 0, minutes: 0, seconds: 0, total: 0 }),
      };
    }
    throw new Error('useProgression must be used within a ProgressionProvider');
  }
  return context;
}; 