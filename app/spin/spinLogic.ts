import { SYMBOLS, REWARDS, RewardKey, Reward } from './spinConstants';

// Define the generateReel function
export const generateReel = () => {
  return Array(3).fill(0).map(() => {
    // For each position, we want the spin icon (index 3) to have exactly 20% probability
    const rand = Math.random();
    if (rand < 0.2) {
      // 20% chance to get spin icon (index 3)
      return 3; // 'spin' is at index 3 in the SYMBOLS array
    } else {
      // 80% chance to get any other symbol
      // We need to exclude the spin icon (index 3) from the random selection
      // Generate a random index between 0-5
      const randomIndex = Math.floor(Math.random() * (SYMBOLS.length - 1));
      // If the index is >= 3, we need to shift it by 1 to skip the spin icon
      return randomIndex >= 3 ? randomIndex + 1 : randomIndex;
    }
  });
};

// Add a function to generate reels for multi-spin with controlled spin icon probability
export const generateReelForMultiSpin = (spinLevel: number) => {
  // For multi-spin levels, reduce the probability of getting spin icon based on spin level
  // This helps prevent excessive spin rewards during multi-spin sessions
  const spinIconProbability = spinLevel <= 1 ? 0.2 : 0.1; // Reduce probability for multi-spins
  
  return Array(3).fill(0).map(() => {
    const rand = Math.random();
    if (rand < spinIconProbability) {
      // Chance to get spin icon (index 3)
      return 3; // 'spin' is at index 3 in the SYMBOLS array
    } else {
      // Chance to get any other symbol
      // For higher spin levels, we still want to bias against high-value symbols
      // but maintain the controlled probability for spin icon
      if (spinLevel >= 50) {
        // For 50x spins, bias toward lower-value symbols but exclude spin icon
        const secondRand = Math.random();
        if (secondRand < 0.85) {
          // Exclude treasurebox, treasuretrove, and spin (indices 0, 1, and 3)
          // Generate a random index from [2, 4, 5, 6]
          const validIndices = [2, 4, 5, 6];
          return validIndices[Math.floor(Math.random() * validIndices.length)];
        } else {
          // Allow treasurebox and treasuretrove (indices 0 and 1)
          return Math.random() < 0.5 ? 0 : 1;
        }
      } else if (spinLevel >= 5) {
        // For 5x and 10x spins, slightly bias against high-value symbols
        const secondRand = Math.random();
        if (secondRand < 0.7) {
          // Exclude treasurebox, treasuretrove, and spin (indices 0, 1, and 3)
          // Generate a random index from [2, 4, 5, 6]
          const validIndices = [2, 4, 5, 6];
          return validIndices[Math.floor(Math.random() * validIndices.length)];
        } else {
          // Allow treasurebox and treasuretrove (indices 0 and 1)
          return Math.random() < 0.5 ? 0 : 1;
        }
      } else {
        // For regular spins, select any non-spin symbol with equal probability
        // Generate a random index between 0-5
        const randomIndex = Math.floor(Math.random() * (SYMBOLS.length - 1));
        // If the index is >= 3, we need to shift it by 1 to skip the spin icon
        return randomIndex >= 3 ? randomIndex + 1 : randomIndex;
      }
    }
  });
};

// Helper function to check winner for specific reels
export const checkWinnerForReels = (reelsToCheck: number[][]) => {
  if (!reelsToCheck[0]?.length || !reelsToCheck[1]?.length || !reelsToCheck[2]?.length) return null;

  const symbols = reelsToCheck.map((reel) => {
    const symbolIndex = reel[1];
    if (symbolIndex >= 0 && symbolIndex < SYMBOLS.length) {
      return SYMBOLS[symbolIndex].id;
    }
    return '';
  });

  const symbolCounts: Record<string, number> = {};
  const uniqueSymbols = new Set<string>();

  symbols.forEach(symbol => {
    symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    uniqueSymbols.add(symbol);
  });

  let winningCombo: RewardKey | null = null;
  let newPrize: Reward | null = null;

  // First check for 3 of a kind
  if (Object.values(symbolCounts).some(count => count === 3)) {
    for (const [symbolId, count] of Object.entries(symbolCounts)) {
      if (count === 3) {
        const combo = `3${symbolId}` as RewardKey;
        if (combo in REWARDS) {
          winningCombo = combo;
          newPrize = REWARDS[combo];
          break;
        }
      }
    }
  } 
  // Special case: Check for "Treasure Trove + Sparky Token + Treasure Trove"
  else if (symbolCounts['treasuretrove'] === 2 && symbolCounts['sparkytoken'] === 1) {
    winningCombo = '1sparkytoken';
    newPrize = { type: 'sparkcoins', amount: 2500 };
  }
  // Special case: Check for "Sparky Token + Treasure Box + Sparky Token"
  else if (symbolCounts['sparkytoken'] === 2 && symbolCounts['treasurebox'] === 1) {
    winningCombo = '2sparkytoken-special';
    newPrize = { type: 'sparkcoins', amount: 20000 };
  }
  // Then check for 2 of a kind with treasuretrove or treasurebox
  else if (symbolCounts['treasuretrove'] === 2) {
    winningCombo = '2trove';
    newPrize = REWARDS[winningCombo];
  }
  else if (symbolCounts['treasurebox'] === 2) {
    if (symbolCounts['sparkytoken'] === 1) {
      winningCombo = '1sparkytoken';
      newPrize = REWARDS[winningCombo];
    } else {
      winningCombo = '2box';
      newPrize = REWARDS[winningCombo];
    }
  }
  // Then check for special combinations
  else if (
    (symbolCounts['treasuretrove'] === 1 && symbolCounts['treasurebox'] === 2) ||
    (symbolCounts['treasuretrove'] === 2 && symbolCounts['treasurebox'] === 1)
  ) {
    winningCombo = 'treasuretrove-treasurebox-other';
    newPrize = REWARDS[winningCombo];
  }
  // Then check for sparkytoken combinations
  else if (symbolCounts['sparkytoken'] === 1) {
    winningCombo = '1sparkytoken';
    newPrize = REWARDS[winningCombo];
  }
  // Then check for other 2 of a kind
  else if (Object.values(symbolCounts).some(count => count === 2)) {
    for (const [symbolId, count] of Object.entries(symbolCounts)) {
      if (count === 2) {
        const combo = `2${symbolId}` as RewardKey;
        if (combo in REWARDS) {
          winningCombo = combo;
          newPrize = REWARDS[combo];
          break;
        }
      }
    }
  }
  // Check for remaining sparkytoken combinations
  if (!winningCombo) {
    if (symbolCounts['sparkytoken'] === 2) {
      winningCombo = '2sparkytoken';
      newPrize = REWARDS[winningCombo];
    } else if (symbolCounts['sparkytoken'] === 3) {
      winningCombo = '3sparkytoken';
      newPrize = REWARDS[winningCombo];
    }
  }
  // Then check for other special combinations
  if (!winningCombo) {
    if (
      uniqueSymbols.size === 3 &&
      symbolCounts['treasuretrove'] === 1 &&
      symbolCounts['turbo'] === 1 &&
      symbolCounts['spin'] === 1
    ) {
      winningCombo = 'treasuretrove-turbo-spin';
      newPrize = REWARDS[winningCombo];
    }
    if (
      !winningCombo &&
      uniqueSymbols.size === 3 &&
      symbolCounts['treasuretrove'] === 1 &&
      symbolCounts['recharge'] === 1 &&
      symbolCounts['spin'] === 1
    ) {
      winningCombo = 'treasuretrove-recharge-spin';
      newPrize = REWARDS[winningCombo];
    }
    if (
      !winningCombo &&
      uniqueSymbols.size === 3 &&
      symbolCounts['treasurebox'] === 1 &&
      symbolCounts['turbo'] === 1 &&
      symbolCounts['recharge'] === 1
    ) {
      winningCombo = 'treasurebox-turbo-recharge';
      newPrize = REWARDS[winningCombo];
    }
    if (!winningCombo && uniqueSymbols.size === 3 && !uniqueSymbols.has('sparkytoken') && symbolCounts['treasurebox'] !== 2) {
      winningCombo = 'any3';
      newPrize = REWARDS[winningCombo];
    }
  }

  return { winningCombo, newPrize };
};

// Function to get number of sparky tokens from winning combination
export const getSparkyTokenCount = (combo: string | null) => {
  if (!combo) return 0;
  if (combo === '1sparkytoken') return 1;
  if (combo === '2sparkytoken') return 3; // Updated to match progression update (3 tokens)
  if (combo === '3sparkytoken') return 9; // Matches the 9 tokens in progression update
  return 0;
}; 