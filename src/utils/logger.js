/**
 * Logger utility for production-safe logging
 * In production, only errors are logged. In development, all logs are shown.
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args)
    }
  },

  /**
   * Log warnings (always logged)
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Log errors (always logged)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args)
    // In production, you could send to error tracking service here
    // e.g., Sentry, LogRocket, etc.
  },

  /**
   * Log network requests (only in development)
   */
  network: (...args) => {
    if (isDevelopment) {
      console.log('[NETWORK]', ...args)
    }
  }
}

export default logger
