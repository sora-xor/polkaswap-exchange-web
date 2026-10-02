/** Public navigation intent only; wallet addresses, keys and payment details never belong here. */
export const TONSWAP_INTENT_STORAGE_KEY = 'polkaswap:tonswap:onboarding:v1';
export const TONSWAP_INTENT_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export const TONSWAP_STARTING_POINTS = ['xor', 'sora', 'exchange', 'newWallet'] as const;
export type TonswapStartingPoint = (typeof TONSWAP_STARTING_POINTS)[number];

export interface TonswapOnboardingIntent {
  version: 1;
  campaign: 'tonswap';
  startingPoint: TonswapStartingPoint;
  amount?: string;
  returnPath: '/burn';
  savedAt: number;
}

type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type TonswapRoute = { path: string; query: Record<string, string> };

/** Accepts exact positive natural XOR strings without converting amounts to floating point. */
export function isTonswapIntentAmount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 97 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value) &&
    /[1-9]/.test(value)
  );
}

/** Validates both persisted and newly supplied intent, including its fixed internal return path. */
export function parseTonswapIntent(value: unknown, now = Date.now()): TonswapOnboardingIntent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const allowedKeys = ['version', 'campaign', 'startingPoint', 'amount', 'returnPath', 'savedAt'];
  if (Object.keys(record).some((key) => !allowedKeys.includes(key))) return null;
  if (
    record.version !== 1 ||
    record.campaign !== 'tonswap' ||
    !TONSWAP_STARTING_POINTS.includes(record.startingPoint as TonswapStartingPoint) ||
    record.returnPath !== '/burn' ||
    typeof record.savedAt !== 'number' ||
    !Number.isSafeInteger(record.savedAt) ||
    record.savedAt < 0 ||
    !Number.isFinite(now) ||
    record.savedAt > now ||
    now - record.savedAt > TONSWAP_INTENT_MAX_AGE_MS ||
    (record.amount !== undefined && !isTonswapIntentAmount(record.amount))
  ) {
    return null;
  }
  return {
    version: 1,
    campaign: 'tonswap',
    startingPoint: record.startingPoint as TonswapStartingPoint,
    ...(record.amount === undefined ? {} : { amount: record.amount as string }),
    returnPath: '/burn',
    savedAt: record.savedAt,
  };
}

/** Builds the minimal resumable intent; an empty preview is allowed without storing an amount. */
export function createTonswapIntent(
  startingPoint: TonswapStartingPoint,
  amount = '',
  now = Date.now()
): TonswapOnboardingIntent | null {
  return parseTonswapIntent(
    {
      version: 1,
      campaign: 'tonswap',
      startingPoint,
      ...(amount ? { amount } : {}),
      returnPath: '/burn',
      savedAt: now,
    },
    now
  );
}

/** Storage can be unavailable in private or embedded browsers; navigation must still work. */
function browserIntentStorage(): IntentStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Reads one tab's recent public intent and rejects malformed, expired or extended records. */
export function readTonswapIntent(
  storage: Pick<IntentStorage, 'getItem'> | undefined = browserIntentStorage(),
  now = Date.now()
): TonswapOnboardingIntent | null {
  try {
    const raw = storage?.getItem(TONSWAP_INTENT_STORAGE_KEY);
    return raw && raw.length <= 512 ? parseTonswapIntent(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

/** Saves a validated canonical record; no caller-supplied extra properties are persisted. */
export function writeTonswapIntent(
  intent: TonswapOnboardingIntent,
  storage: Pick<IntentStorage, 'setItem'> | undefined = browserIntentStorage(),
  now = Date.now()
): boolean {
  const valid = parseTonswapIntent(intent, now);
  if (!valid || !storage) return false;
  try {
    storage.setItem(TONSWAP_INTENT_STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

/** Clears the current tab's intent after completion or an explicit dismissal. */
export function clearTonswapIntent(
  storage: Pick<IntentStorage, 'removeItem'> | undefined = browserIntentStorage()
): void {
  try {
    storage?.removeItem(TONSWAP_INTENT_STORAGE_KEY);
  } catch {
    // Storage access is optional and must never interfere with wallet or transaction flows.
  }
}

/** Returns a router location so existing hash routing retains an IPFS content-path prefix. */
export function buildTonswapReturnRoute(): TonswapRoute {
  return { path: '/burn', query: { campaign: 'tonswap' } };
}

/** Selects existing funding pages without promising a new payment or cross-chain service. */
export function buildTonswapFundingRoute(startingPoint: TonswapStartingPoint): TonswapRoute {
  if (startingPoint === 'xor') return buildTonswapReturnRoute();
  if (startingPoint === 'sora') return { path: '/swap', query: { campaign: 'tonswap', acquire: 'XOR' } };
  return {
    path: startingPoint === 'exchange' ? '/deposit/transfer-from-cex' : '/deposit',
    query: { campaign: 'tonswap' },
  };
}
