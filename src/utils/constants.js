// In production, API is at api.woozysocial.com. In development, use localhost:3001
// Runtime detection is more reliable than build-time MODE variable
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const baseURL = isLocalhost
  ? "http://localhost:3001"
  : "https://api.woozysocial.com";

export { baseURL };