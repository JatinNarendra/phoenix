// Function to get the phoenix image based on level
export const getPhoenixImage = (level: number): string => {
  try {
    // Ensure level is within valid range
    const validLevel = Math.max(1, Math.min(11, level));
    return `/assets/homebackground/phoenix${validLevel}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return "/assets/homebackground/phoenix1.png";
  }
};

// Function to get the badge image based on level
export const getBadgeImage = (level: number): string => {
  try {
    // Ensure level is within valid range
    const validLevel = Math.max(1, Math.min(11, level));
    return `/assets/homebackground/badge${validLevel}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return "/assets/homebackground/badge1.png";
  }
};

// Function to get level details background image
export const getLevelDetailsImage = (level: number): string => {
  try {
    // Ensure level is within valid range
    const validLevel = Math.max(1, Math.min(20, level));
    return `/assets/leveldetails/leveldetailsbg${validLevel}.png`;
  } catch {
    // Fallback to level 1 if image not found
    return "/assets/leveldetails/leveldetailsbg1.png";
  }
};

// Utility function to check if we're in production
export const isProduction = (): boolean => {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production";
  }

  const hostname = window.location.hostname;
  const isVercelApp = hostname.includes("vercel.app");
  const isSparkyDomain = hostname.includes("sparky-kappa.vercel.app");
  const isHTTPS = window.location.protocol === "https:";

  return (
    isSparkyDomain ||
    (isVercelApp && isHTTPS) ||
    (isHTTPS && !hostname.includes("localhost"))
  );
};

// Enhanced image loading with error handling
export const loadImageWithFallback = (
  src: string,
  fallbackSrc: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(fallbackSrc);
    img.src = src;
  });
};
