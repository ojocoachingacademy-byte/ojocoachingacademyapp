/**
 * Input validation utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate phone number (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (!phone) return false
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length === 10
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum length (default: 6)
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validatePassword(password, minLength = 6) {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }
  
  if (password.length < minLength) {
    return { 
      valid: false, 
      message: `Password must be at least ${minLength} characters long` 
    }
  }
  
  return { valid: true, message: '' }
}

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: `${fieldName} is required` }
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${fieldName} cannot be empty` }
  }
  
  return { valid: true, message: '' }
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validateNumberRange(value, min, max) {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, message: 'Must be a valid number' }
  }
  
  if (num < min) {
    return { valid: false, message: `Must be at least ${min}` }
  }
  
  if (num > max) {
    return { valid: false, message: `Must be at most ${max}` }
  }
  
  return { valid: true, message: '' }
}

/**
 * Sanitize string input (basic XSS prevention)
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}
