export type IndexerJsonGuard<T> = (value: unknown) => value is T;

/** Returns true only for non-array JSON objects. */
export const isJsonRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

/**
 * Parses an untrusted JSON field returned by an indexer.
 * The caller-supplied fallback is returned for missing, malformed, or structurally invalid payloads.
 */
export function parseIndexerJson<T>(rawValue: unknown, fallback: T, guard: IndexerJsonGuard<T>): T {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return fallback;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
