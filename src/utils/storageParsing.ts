export type StoredValueGuard<T> = (value: unknown) => value is T;

/**
 * Parses JSON-backed storage only when the decoded value matches the expected shape.
 * Corrupt or schema-incompatible values fall back without interrupting application startup.
 */
export function parseStoredJson<T>(rawValue: string | null | undefined, fallback: T, guard: StoredValueGuard<T>): T {
  if (!rawValue) return fallback;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Parses a strictly encoded persisted boolean, returning the supplied fallback for any other value. */
export function parseStoredBoolean(rawValue: string | null | undefined, fallback: null): boolean | null;
export function parseStoredBoolean(rawValue: string | null | undefined, fallback: boolean): boolean;
export function parseStoredBoolean(rawValue: string | null | undefined, fallback: boolean | null): boolean | null {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  return fallback;
}

/** Parses a finite persisted number and optionally applies a domain-specific validity predicate. */
export function parseStoredFiniteNumber(
  rawValue: string | null | undefined,
  fallback: number,
  predicate: (value: number) => boolean = () => true
): number {
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && predicate(parsed) ? parsed : fallback;
}
