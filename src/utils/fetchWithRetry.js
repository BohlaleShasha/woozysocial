/**
 * fetchWithRetry - Wrapper around fetch with automatic retry logic
 *
 * Features:
 * - Exponential backoff retry on network errors
 * - Configurable max retries and timeout
 * - Only retries on network errors, not HTTP errors (4xx, 5xx)
 * - Abortable via AbortController
 */

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  retryDelay: 1000, // Base delay in ms (will be multiplied by attempt number)
  retryOnStatus: [502, 503, 504], // Retry on these HTTP status codes
};

/**
 * Delay helper with exponential backoff
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on network failures
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} fetchOptions - Standard fetch options
 * @param {Object} retryOptions - Retry configuration
 * @returns {Promise<Response>} - The fetch response
 */
export const fetchWithRetry = async (url, fetchOptions = {}, retryOptions = {}) => {
  const options = { ...DEFAULT_OPTIONS, ...retryOptions };
  const { maxRetries, timeout, retryDelay, retryOnStatus } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge abort signal with any existing signal
      const mergedOptions = {
        ...fetchOptions,
        signal: controller.signal,
      };

      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);

      // Check if we should retry based on status code
      if (retryOnStatus.includes(response.status) && attempt < maxRetries) {
        console.warn(`Request to ${url} returned ${response.status}, retrying (attempt ${attempt + 1}/${maxRetries})...`);
        await delay(retryDelay * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // Don't retry if request was intentionally aborted
      if (error.name === 'AbortError' && !fetchOptions.signal?.aborted) {
        // This was our timeout, retry if we have attempts left
        if (attempt < maxRetries) {
          console.warn(`Request to ${url} timed out, retrying (attempt ${attempt + 1}/${maxRetries})...`);
          await delay(retryDelay * (attempt + 1));
          continue;
        }
      }

      // Network error (no connection, DNS failure, etc.)
      if (error.message === 'Failed to fetch' && attempt < maxRetries) {
        console.warn(`Network error fetching ${url}, retrying (attempt ${attempt + 1}/${maxRetries})...`);
        await delay(retryDelay * (attempt + 1));
        continue;
      }

      // If this was a user abort, don't retry
      if (error.name === 'AbortError') {
        throw error;
      }
    }
  }

  // All retries exhausted
  throw lastError;
};

/**
 * JSON fetch with retry - convenience wrapper that parses JSON response
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} fetchOptions - Standard fetch options
 * @param {Object} retryOptions - Retry configuration
 * @returns {Promise<{data: any, response: Response}>} - Parsed JSON data and response
 */
export const fetchJsonWithRetry = async (url, fetchOptions = {}, retryOptions = {}) => {
  const response = await fetchWithRetry(url, fetchOptions, retryOptions);

  // Parse JSON response
  const data = await response.json();

  return { data, response };
};

export default fetchWithRetry;
