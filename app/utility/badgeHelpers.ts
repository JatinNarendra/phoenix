/**
 * Helper functions for working with level badges
 */

import { levelConfig } from './stageConfig';

/**
 * Gets the badge title for a specific level
 * @param level Current user level
 * @returns Badge title for the level
 */
export const getBadgeForLevel = (level: number): string => {
  // Make sure level is within valid range
  const validLevel = Math.min(Math.max(1, level), 10);
  
  // If we have a level config for this level, return the title
  if (levelConfig[validLevel]) {
    return levelConfig[validLevel].title;
  }
  
  // Fallback to a default title
  return "Phoenix Hatchling";
};

/**
 * Gets the badge image path for a specific level
 * @param level Current user level
 * @returns Image path for the badge
 */
export const getBadgeImagePath = (level: number): string => {
  try {
    const validLevel = Math.min(Math.max(1, level), 10);
    return `/assets/homebackground/badge${validLevel}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return '/assets/homebackground/badge1.png';
  }
}; 