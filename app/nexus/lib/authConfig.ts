// Configuration for Nexus authentication
// These values will be overridden by environment variables when set

// Export constants that will be used by the authentication system
export const AUTH_CONFIG = {
  // Default admin password fallback (will use environment variable in production)
  ADMIN_PASSWORD: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123",
  
  // Default partner token fallback (will use environment variable in production)
  PARTNER_ACCESS_TOKEN: process.env.NEXT_PUBLIC_PARTNER_ACCESS_TOKEN || process.env.PARTNER_ACCESS_TOKEN || "partner123",
  
  // Whether to show development credentials (only in dev mode)
  SHOW_DEV_CREDENTIALS: process.env.NODE_ENV === 'development',
  
  // Auth token expiration time in seconds (24 hours)
  TOKEN_EXPIRATION: 60 * 60 * 24,
}; 