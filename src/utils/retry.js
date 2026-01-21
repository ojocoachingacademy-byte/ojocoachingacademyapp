/**
 * Retry utility for failed network requests
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all)
 * @returns {Promise} Result of the function
 */
export async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options

  let lastError
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if we've exhausted retries or if error shouldn't be retried
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  throw lastError
}

/**
 * Retry a Supabase query
 * @param {Function} queryFn - Function that returns a Supabase query promise
 * @param {Object} options - Retry options
 * @returns {Promise} Query result
 */
export async function retrySupabaseQuery(queryFn, options = {}) {
  return retry(queryFn, {
    maxRetries: 3,
    initialDelay: 1000,
    shouldRetry: (error) => {
      // Retry on network errors or 5xx server errors
      if (!error) return false
      const errorMessage = error.message?.toLowerCase() || ''
      const errorCode = error.code || ''
      
      return (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorCode.startsWith('5') || // 5xx server errors
        errorCode === 'PGRST301' // Supabase connection error
      )
    },
    ...options
  })
}

/**
 * Retry a fetch request
 * @param {string} url - URL to fetch
 * @param {Object} fetchOptions - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} Fetch response
 */
export async function retryFetch(url, fetchOptions = {}, retryOptions = {}) {
  return retry(
    () => fetch(url, fetchOptions),
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        // Retry on network errors
        if (!error) return false
        return (
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch')
        )
      },
      ...retryOptions
    }
  )
}
