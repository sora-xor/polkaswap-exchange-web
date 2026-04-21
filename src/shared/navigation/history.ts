import type { Nullable } from '@/types/common';

const normalizeHistoryLocation = (location?: Nullable<string>): string => {
  if (!location) return '';

  const trimmedLocation = location.trim();
  if (!trimmedLocation) return '';

  if (typeof window !== 'undefined') {
    try {
      const parsedLocation = new URL(trimmedLocation, window.location.origin);
      const hashLocation = parsedLocation.hash.startsWith('#')
        ? parsedLocation.hash.slice(1)
        : parsedLocation.hash;

      if (hashLocation) {
        return hashLocation.startsWith('/') ? hashLocation : `/${hashLocation}`;
      }

      return `${parsedLocation.pathname}${parsedLocation.search}`;
    } catch {
      // Fall back to string normalization below when URL parsing fails.
    }
  }

  const hashIndex = trimmedLocation.indexOf('#');
  const resolvedLocation = hashIndex >= 0 ? trimmedLocation.slice(hashIndex + 1) : trimmedLocation;

  if (!resolvedLocation) return '';

  return resolvedLocation.startsWith('/') ? resolvedLocation : `/${resolvedLocation}`;
};

/** Reads the router-managed browser history back location without mirrored route state. */
export const resolveHistoryBackLocation = (): Nullable<string> => {
  if (typeof window === 'undefined') return null;

  const historyState = window.history?.state as { back?: unknown } | null;
  return typeof historyState?.back === 'string' ? historyState.back : null;
};

/** Checks whether the browser history back location points at a route prefix. */
export const hasHistoryBackPrefix = (prefix: string, backLocation = resolveHistoryBackLocation()): boolean => {
  return normalizeHistoryLocation(backLocation).startsWith(prefix);
};
