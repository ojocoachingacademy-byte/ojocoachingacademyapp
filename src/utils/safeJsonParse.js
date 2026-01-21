/**
 * Safely parse JSON string with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - Value to return if parsing fails (default: null)
 * @returns {*} Parsed object or defaultValue if parsing fails
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue
  }
  
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error parsing JSON:', error, 'String:', jsonString.substring(0, 100))
    return defaultValue
  }
}
