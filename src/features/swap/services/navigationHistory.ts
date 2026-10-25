import type { Nullable } from '@/types/common';

const ORDER_BOOK_HISTORY_PREFIX = '/trade';

const normalizeHistoryLocation = (location?: Nullable<string>): string => {
  if (!location) return '';

  const trimmedLocation = location.trim();
  if (!trimmedLocation) return '';

  const hashIndex = trimmedLocation.indexOf('#');
  const resolvedLocation = hashIndex >= 0 ? trimmedLocation.slice(hashIndex + 1) : trimmedLocation;

  if (!resolvedLocation) return '';

  return resolvedLocation.startsWith('/') ? resolvedLocation : `/${resolvedLocation}`;
};

/**
 * Reads the router-managed browser history back location without depending on
 * the legacy mirrored route store.
 */
export const resolveHistoryBackLocation = (): Nullable<string> => {
  if (typeof window === 'undefined') return null;

  const historyState = window.history?.state as { back?: unknown } | null;
  return typeof historyState?.back === 'string' ? historyState.back : null;
};

/**
 * Detects swap entries that were reached from the order book route so the
 * feature can preserve the handoff URL contract.
 */
export const isSwapBackNavigationFromOrderBook = (backLocation?: Nullable<string>): boolean => {
  const location = normalizeHistoryLocation(backLocation);
  return location.startsWith(ORDER_BOOK_HISTORY_PREFIX);
};
