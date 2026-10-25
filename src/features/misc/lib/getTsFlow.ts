/** Navigation state only: never persist wallet identities, balances, quotes, or transaction completion. */
export const GET_TS_STORAGE_KEY = 'polkaswap:get-ts:view:v1';
export const BUY_XOR_STORAGE_KEY = 'polkaswap:buy-xor:view:v1';
export type GetTsPurpose = 'ts' | 'xor';
export const GET_TS_SOURCES = ['card', 'ethereum', 'ton', 'xor', 'sora'] as const;
export type GetTsSource = (typeof GET_TS_SOURCES)[number];
export type GetTsStep = 'source' | 'wallets' | 'fund' | 'bridge' | 'swap' | 'burn';
export interface GetTsViewState {
  version: 1;
  source: GetTsSource | null;
  step: GetTsStep;
}
type ViewStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Returns the explicit review stages for a source, without inferring completed transactions. */
export function getTsSteps(source: GetTsSource | null, purpose: GetTsPurpose = 'ts'): GetTsStep[] {
  if (!source || (purpose === 'xor' && source === 'xor')) return ['source'];
  const stages: GetTsStep[] =
    source === 'xor'
      ? ['source', 'wallets']
      : source === 'sora'
        ? ['source', 'wallets', 'swap']
        : ['source', 'wallets', 'fund', 'bridge', 'swap'];
  return purpose === 'xor' ? stages : [...stages, 'burn'];
}

/** Accepts exact supported source values from URL input or persisted state. */
export function parseGetTsSource(value: unknown, purpose: GetTsPurpose = 'ts'): GetTsSource | null {
  return typeof value === 'string' &&
    !(purpose === 'xor' && value === 'xor') &&
    GET_TS_SOURCES.includes(value as GetTsSource)
    ? (value as GetTsSource)
    : null;
}

/** Rejects schema extensions so addresses or untrusted completion flags cannot be restored. */
export function parseGetTsView(value: unknown, purpose: GetTsPurpose = 'ts'): GetTsViewState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || !['version', 'source', 'step'].every((key) => key in record)) return null;
  const source = parseGetTsSource(record.source, purpose);
  if (record.version !== 1 || (record.source !== null && !source)) return null;
  if (!getTsSteps(source, purpose).includes(record.step as GetTsStep)) return null;
  return { version: 1, source, step: record.step as GetTsStep };
}

/** Storage is optional in private browsers and under restrictive embedded contexts. */
function viewStorage(): ViewStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Reads only a bounded, validated view record from the current browser tab. */
export function readGetTsView(storage = viewStorage(), purpose: GetTsPurpose = 'ts'): GetTsViewState | null {
  try {
    const raw = storage?.getItem(purpose === 'xor' ? BUY_XOR_STORAGE_KEY : GET_TS_STORAGE_KEY);
    return raw && raw.length <= 160 ? parseGetTsView(JSON.parse(raw), purpose) : null;
  } catch {
    return null;
  }
}

/** Saves a canonical view record; this never records a purchase, conversion, bridge, swap, or burn as complete. */
export function writeGetTsView(value: GetTsViewState, storage = viewStorage(), purpose: GetTsPurpose = 'ts'): boolean {
  const parsed = parseGetTsView(value, purpose);
  if (!parsed || !storage) return false;
  try {
    storage.setItem(purpose === 'xor' ? BUY_XOR_STORAGE_KEY : GET_TS_STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

/** Dismisses the saved navigation hint without changing wallets or transactions. */
export function clearGetTsView(storage = viewStorage(), purpose: GetTsPurpose = 'ts'): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(purpose === 'xor' ? BUY_XOR_STORAGE_KEY : GET_TS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Resolves safe URL navigation over a saved view, without reading arbitrary return URLs. */
export function resolveGetTsView(
  sourceQuery: unknown,
  stepQuery: unknown,
  saved: unknown,
  purpose: GetTsPurpose = 'ts'
): GetTsViewState {
  const previous = parseGetTsView(saved, purpose);
  const querySource = parseGetTsSource(sourceQuery, purpose);
  if (purpose === 'xor' && sourceQuery !== undefined && sourceQuery !== null && !querySource)
    return { version: 1, source: null, step: 'source' };
  const source = querySource ?? previous?.source ?? null;
  const defaultStep = querySource && querySource !== previous?.source ? 'source' : (previous?.step ?? 'source');
  const step =
    typeof stepQuery === 'string' && getTsSteps(source, purpose).includes(stepQuery as GetTsStep)
      ? (stepQuery as GetTsStep)
      : getTsSteps(source, purpose).includes(defaultStep)
        ? defaultStep
        : 'source';
  return { version: 1, source, step };
}

/** Current non-SORA funding routes require both a SORA signer and an Ethereum wallet. */
export function getTsWalletsReady(source: GetTsSource | null, soraConnected: boolean, evmConnected: boolean): boolean {
  return !!source && soraConnected && (source === 'xor' || source === 'sora' || evmConnected);
}

/** Resolves only unambiguous explicit guided routes; never guess a purchase purpose from an asset. */
export function parseGetTsFundingPurpose(query: Record<string, unknown>): GetTsPurpose | null {
  if (query.buyXor === '1' && query.campaign === undefined && query.getTs === undefined) return 'xor';
  if (query.campaign === 'tonswap' && query.getTs === '1' && query.buyXor === undefined) return 'ts';
  return null;
}

/** Keeps only the fixed purpose hint when navigating between bridge screens. */
export function getTsFundingQuery(purpose: GetTsPurpose): Record<string, string> {
  return purpose === 'xor' ? { buyXor: '1' } : { campaign: 'tonswap', getTs: '1' };
}

/** The guided bridge is DAI on Ethereum mainnet to SORA; the bridge owns network/asset validation. */
export function buildGetTsBridgeRoute(purpose: GetTsPurpose = 'ts'): { path: string; query: Record<string, string> } {
  return { path: '/bridge', query: { ...getTsFundingQuery(purpose), asset: 'DAI' } };
}

/** Limits the focused checkout shell to the two guides and explicitly tagged bridge review/history. */
export function isGetTsCheckoutRoute(path: unknown, query: Record<string, unknown>): boolean {
  return (
    path === '/get-ts' ||
    path === '/buy-xor' ||
    (typeof path === 'string' && /^\/bridge(?:\/|$)/.test(path) && parseGetTsFundingPurpose(query) !== null)
  );
}
