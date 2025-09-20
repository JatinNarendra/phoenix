// Cache for preloaded images
const imageCache: { [key: string]: string } = {};

// Function to convert image to base64
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Function to preload images
export const preloadImages = async () => {
  try {
    // Fetch the image
    const response = await fetch('/assets/connectionfailedicon.png');
    const blob = await response.blob();
    const file = new File([blob], 'connectionfailedicon.png', { type: 'image/png' });
    
    // Convert to base64 and cache
    const base64 = await convertToBase64(file);
    imageCache['connectionfailedicon'] = base64;
  } catch (error) {
    console.error('Failed to preload image:', error);
  }
};

// Function to get preloaded image
export const getPreloadedImage = (imageName: string): string => {
  return imageCache[imageName] || '';
}; 