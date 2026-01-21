/**
 * Standardized error messages
 */

export const ERROR_MESSAGES = {
  // Authentication
  AUTH_REQUIRED: 'Please log in to continue',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Network
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  REQUEST_FAILED: 'Request failed. Please try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Validation
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number (10 digits)',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  REQUIRED_FIELD: 'This field is required',
  
  // Database
  FETCH_ERROR: 'Failed to load data. Please refresh the page.',
  SAVE_ERROR: 'Failed to save. Please try again.',
  DELETE_ERROR: 'Failed to delete. Please try again.',
  NOT_FOUND: 'The requested item was not found.',
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  TRY_AGAIN: 'Something went wrong. Please try again.',
  
  // User-friendly messages
  GENERIC_ERROR: 'Oops! Something went wrong. Our team has been notified.',
  CONTACT_SUPPORT: 'If this problem persists, please contact support.',
}

/**
 * Get user-friendly error message from error object
 * @param {Error|string|object} error - Error object or message
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  if (!error) {
    return ERROR_MESSAGES.UNKNOWN_ERROR
  }
  
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error
  }
  
  // If it's an error object with a message
  if (error.message) {
    const message = error.message.toLowerCase()
    
    // Map common error patterns to user-friendly messages
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
    
    if (message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ERROR_MESSAGES.AUTH_REQUIRED
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return ERROR_MESSAGES.AUTH_FAILED
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_MESSAGES.NOT_FOUND
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return error.message // Return validation errors as-is
    }
    
    // Return the error message if it's user-friendly
    if (error.message.length < 100) {
      return error.message
    }
  }
  
  // Default fallback
  return ERROR_MESSAGES.GENERIC_ERROR
}

/**
 * Format error for display
 * @param {Error|string|object} error - Error object or message
 * @param {string} context - Context where error occurred (optional)
 * @returns {string} Formatted error message
 */
export function formatError(error, context = '') {
  const message = getErrorMessage(error)
  
  if (context) {
    return `${context}: ${message}`
  }
  
  return message
}
