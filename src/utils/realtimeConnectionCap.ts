export const DEFAULT_REALTIME_CONNECTION_CAP = Number.MAX_SAFE_INTEGER;
export const ENABLED_REALTIME_CONNECTION_CAP = 4;

/**
 * Normalizes realtime connection-cap feature flags into a finite worker-safe
 * connection budget. `true` enables the conservative default cap, while absent
 * or invalid values keep the budget effectively unlimited.
 */
export function resolveRealtimeConnectionCap(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (value === true) {
    return ENABLED_REALTIME_CONNECTION_CAP;
  }

  return DEFAULT_REALTIME_CONNECTION_CAP;
}
