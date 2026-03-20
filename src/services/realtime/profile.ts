export const DEFAULT_REALTIME_PROFILE = 'balanced' as const;

export const REALTIME_PROFILES = ['balanced', 'ultra', 'load_first'] as const;
export type RealtimeProfile = (typeof REALTIME_PROFILES)[number];

export const REALTIME_PRIORITIES = ['critical', 'standard', 'background'] as const;
export type RealtimePriority = (typeof REALTIME_PRIORITIES)[number];

type FlushProfileConfig = Record<RealtimePriority, number>;

const PROFILE_FLUSH_INTERVALS_VISIBLE: Record<RealtimeProfile, FlushProfileConfig> = {
  balanced: {
    critical: 250,
    standard: 1000,
    background: 5000,
  },
  ultra: {
    critical: 50,
    standard: 250,
    background: 1000,
  },
  load_first: {
    critical: 500,
    standard: 2000,
    background: 7000,
  },
};

const PROFILE_FLUSH_INTERVAL_HIDDEN: Record<RealtimeProfile, number> = {
  balanced: 5000,
  ultra: 1000,
  load_first: 7000,
};

const BASE_BACKOFF_DELAY_MS = 2000;
const BACKOFF_MULTIPLIER = 1.7;
const MAX_BACKOFF_DELAY_MS = 120000;
const JITTER_RATIO = 0.25;

/**
 * Normalizes a runtime realtime profile value to a supported enum.
 */
export function normalizeRealtimeProfile(value: unknown): RealtimeProfile {
  if (typeof value !== 'string') {
    return DEFAULT_REALTIME_PROFILE;
  }

  return (REALTIME_PROFILES as readonly string[]).includes(value)
    ? (value as RealtimeProfile)
    : DEFAULT_REALTIME_PROFILE;
}

/**
 * Returns the event flush cadence for a stream priority under a given profile.
 */
export function resolveRealtimeFlushIntervalMs(options: {
  profile?: RealtimeProfile;
  priority?: RealtimePriority;
  visible?: boolean;
}): number {
  const profile = normalizeRealtimeProfile(options.profile);
  const priority = (options.priority ?? 'standard') as RealtimePriority;
  const visible = options.visible ?? true;

  if (!visible) {
    return PROFILE_FLUSH_INTERVAL_HIDDEN[profile];
  }

  return PROFILE_FLUSH_INTERVALS_VISIBLE[profile][priority];
}

/**
 * Produces exponential reconnect delay with jitter.
 */
export function resolveRealtimeBackoffDelayMs(attempt: number, randomFn: () => number = Math.random): number {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  const exponentialDelay = Math.min(
    MAX_BACKOFF_DELAY_MS,
    Math.floor(BASE_BACKOFF_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, safeAttempt))
  );
  const jitter = Math.floor(exponentialDelay * JITTER_RATIO * randomFn());

  return exponentialDelay + jitter;
}
