/**
 * Formats a number with commas as thousands separators
 * @param value The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString();
}; 