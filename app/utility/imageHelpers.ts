// Function to get the phoenix image based on level
export const getPhoenixImage = (level: number): string => {
  try {
    return `/assets/homebackground/phoenix${level}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return '/assets/homebackground/phoenix1.png';
  }
};

// Function to get the badge image based on level
export const getBadgeImage = (level: number): string => {
  try {
    return `/assets/homebackground/badge${level}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return '/assets/homebackground/badge1.png';
  }
}; 