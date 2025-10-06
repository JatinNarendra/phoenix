// Production Image Loader Utility
// Handles image loading issues in production environments

interface ImageCache {
  [key: string]: string;
}

const imageCache: ImageCache = {};

// Function to preload critical images for production
export const preloadCriticalImages = async (): Promise<void> => {
  const criticalImages = [
    "/assets/homebackground/phoenix1.png",
    "/assets/homebackground/badge1.png",
    "/assets/leveldetails/leveldetailsbg1.png",
    "/assets/splashscreen.png",
    "/assets/SparkyIcon.png",
  ];

  const preloadPromises = criticalImages.map(async (src) => {
    try {
      const response = await fetch(src);
      if (response.ok) {
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        imageCache[src] = objectURL;
        console.log(`Preloaded critical image: ${src}`);
      } else {
        console.warn(`Failed to preload image: ${src}`);
      }
    } catch (error) {
      console.error(`Error preloading image ${src}:`, error);
    }
  });

  await Promise.allSettled(preloadPromises);
};

// Function to get cached image URL or fallback
export const getImageUrl = (src: string, fallbackSrc?: string): string => {
  // Return cached URL if available
  if (imageCache[src]) {
    return imageCache[src];
  }

  // Return original src (will work in dev, might fail in prod)
  return src;
};

// Function to load image with retry mechanism
export const loadImageWithRetry = (
  src: string,
  fallbackSrc: string,
  maxRetries: number = 3
): Promise<string> => {
  return new Promise((resolve) => {
    let retries = 0;

    const attemptLoad = () => {
      const img = new Image();

      img.onload = () => {
        console.log(`Image loaded successfully: ${src}`);
        resolve(src);
      };

      img.onerror = () => {
        retries++;
        console.warn(`Image load attempt ${retries} failed for: ${src}`);

        if (retries < maxRetries) {
          // Retry with a small delay
          setTimeout(attemptLoad, 100 * retries);
        } else {
          console.error(
            `All retry attempts failed for: ${src}, using fallback: ${fallbackSrc}`
          );
          resolve(fallbackSrc);
        }
      };

      img.src = src;
    };

    attemptLoad();
  });
};

// Function to check if we're in a production environment
export const isProductionEnvironment = (): boolean => {
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

// Enhanced image loading hook for React components
export const useImageLoader = (src: string, fallbackSrc: string) => {
  const [imageSrc, setImageSrc] = React.useState(src);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    loadImageWithRetry(src, fallbackSrc)
      .then((loadedSrc) => {
        setImageSrc(loadedSrc);
        setIsLoading(false);
        if (loadedSrc === fallbackSrc) {
          setHasError(true);
        }
      })
      .catch(() => {
        setImageSrc(fallbackSrc);
        setIsLoading(false);
        setHasError(true);
      });
  }, [src, fallbackSrc]);

  return { imageSrc, isLoading, hasError };
};

// Import React for the hook
import React from "react";
