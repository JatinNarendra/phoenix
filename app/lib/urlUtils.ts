/**
 * Utility functions for URL environment checking
 * These functions help determine the environment without exposing URLs to the browser
 */

/**
 * Server-side function to check if current host matches development environment
 * @param host - The host header from the request
 * @returns boolean indicating if it's development environment
 */
export function isDevEnvironment(host: string): boolean {
  const devUrl = process.env.DEV_URL || 'localhost:3000';
  const devHostname = devUrl.split(':')[0];
  return host.includes(devHostname);
}

/**
 * Server-side function to check if current host matches production environment
 * @param host - The host header from the request
 * @returns boolean indicating if it's production environment
 */
export function isProdEnvironment(host: string): boolean {
  const prodUrl = process.env.PROD_URL || 'sparky-kappa.vercel.app';
  return host.includes(prodUrl) || host.includes('vercel.app');
}

/**
 * Client-side function to check if running in development mode
 * Uses window.location to determine environment without exposing URLs
 * @returns boolean indicating if it's development environment
 */
export function isClientDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check common development patterns without exposing the actual URLs
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    ['3000', '3001', '3002', '8080', '8000'].includes(window.location.port)
  );
}

/**
 * Client-side function to check if running in production mode
 * @returns boolean indicating if it's production environment
 */
export function isClientProdEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  // First check if it's definitely development
  if (isClientDevEnvironment()) return false;
  
  // Check for specific production patterns
  const hostname = window.location.hostname;
  const isVercelApp = hostname.includes('vercel.app');
  const isSparkyDomain = hostname.includes('sparky-kappa.vercel.app');
  const isHTTPS = window.location.protocol === 'https:';
  
  // More specific production detection
  return (
    isSparkyDomain || 
    (isVercelApp && isHTTPS) ||
    (isHTTPS && !hostname.includes('localhost'))
  );
}

/**
 * Get development URL parts without exposing the full URL
 * @returns object with hostname and port for development
 */
export function getDevUrlParts(): { hostname: string; port: string } {
  const devUrl = process.env.DEV_URL || 'localhost:3000';
  const [hostname, port] = devUrl.split(':');
  return { hostname, port };
}