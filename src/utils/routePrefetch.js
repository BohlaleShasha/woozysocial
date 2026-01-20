/**
 * Route prefetching utility for instant navigation
 * Preloads route components when hovering over navigation links
 */

const prefetchedRoutes = new Set();

/**
 * Prefetch a lazy-loaded route component
 * @param {Function} importFn - The dynamic import function for the route
 * @param {string} routePath - The route path (for tracking)
 */
export const prefetchRoute = (importFn, routePath) => {
  // Only prefetch once per route
  if (prefetchedRoutes.has(routePath)) {
    return;
  }

  prefetchedRoutes.add(routePath);

  // Trigger the lazy import to start downloading the chunk
  importFn().catch(() => {
    // If prefetch fails, remove from cache so it can be retried
    prefetchedRoutes.delete(routePath);
  });
};

/**
 * Create a prefetch handler for navigation links
 * Usage: <Link to="/dashboard" onMouseEnter={createPrefetchHandler(DashboardImport, '/dashboard')} />
 */
export const createPrefetchHandler = (importFn, routePath) => {
  return () => {
    // Use requestIdleCallback to avoid interfering with user interactions
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => prefetchRoute(importFn, routePath));
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => prefetchRoute(importFn, routePath), 50);
    }
  };
};
