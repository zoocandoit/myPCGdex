/**
 * Redirect URL validation utilities
 * Prevents open redirect vulnerabilities by validating redirect targets
 */

// Allowed internal paths for redirect after authentication
const ALLOWED_REDIRECT_PATHS = ["/scan", "/collection", "/profile"] as const;

// Default redirect path when validation fails
const DEFAULT_REDIRECT = "/scan";

/**
 * Validates if a redirect path is safe to use
 *
 * Security checks:
 * 1. Must start with "/" (internal path)
 * 2. Must NOT start with "//" (protocol-relative URL)
 * 3. Must NOT contain "http:" or "https:" (absolute URL)
 * 4. Must be in the allowed paths list (allowlist approach)
 *
 * @param path - The redirect path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isValidRedirectPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") {
    return false;
  }

  // Must start with "/" but not "//" (protocol-relative URL)
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  // Block absolute URLs embedded in path
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("http:") || lowerPath.includes("https:")) {
    return false;
  }

  // Block javascript: protocol
  if (lowerPath.includes("javascript:")) {
    return false;
  }

  // Allowlist check: path must start with one of the allowed paths
  return ALLOWED_REDIRECT_PATHS.some((allowed) => path.startsWith(allowed));
}

/**
 * Sanitizes a redirect path, returning a safe default if invalid
 *
 * @param path - The redirect path to sanitize
 * @param fallback - Optional custom fallback path (defaults to /scan)
 * @returns A safe redirect path
 */
export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (isValidRedirectPath(path)) {
    return path as string;
  }
  return fallback;
}

/**
 * Extracts and validates redirect path from URL search params
 *
 * @param searchParams - URLSearchParams or similar object
 * @param paramName - Name of the redirect parameter (default: "redirectTo")
 * @returns A safe redirect path
 */
export function getRedirectFromParams(
  searchParams: { get: (key: string) => string | null } | null | undefined,
  paramName: string = "redirectTo"
): string {
  const path = searchParams?.get(paramName);
  return getSafeRedirectPath(path);
}
