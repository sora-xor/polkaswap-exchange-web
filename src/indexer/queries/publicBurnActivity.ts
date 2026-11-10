import { FPNumber } from '@sora-substrate/math';

import { RECOVERY_MAINNET_GENESIS } from './capabilities';

export const BURN_ACTIVITY_MAX_AGE_MS = 180_000;
const XOR_AMOUNT = /^(?:0|[1-9]\d{0,76})(?:\.\d{1,18})?$/;

const CAMPAIGN_START_BLOCK = 27_720_478;
const RECOVERY_CHECKPOINT = 28_191_817;
type BurnScope = 'recent' | 'campaign';
const fields = 'startBlock throughBlock throughTimestamp burnCount burnedXor tonswapCount tonswapXor';
const capabilityFields = 'indexerCapabilities { genesisHash indexedBlock statsReady historyReady }';
const queries = {
  recent: `query PublicBurnActivity { publicBurnActivity { ${fields} } ${capabilityFields} }`,
  campaign: `query PublicTonswapCampaignActivity { publicTonswapCampaignActivity { ${fields} } ${capabilityFields} }`,
};

/** Finalized asset burn events in the inclusive block range, including the TONSWAP-marked subset. */
export interface PublicBurnActivity {
  startBlock: number;
  throughBlock: number;
  throughTimestamp: number;
  burnCount: number;
  burnedXor: string;
  tonswapCount: number;
  tonswapXor: string;
}

/** Preserve exact XOR decimals and reject malformed or inconsistent coverage before display. */
function parseActivity(value: unknown, checkpoint: unknown, scope: BurnScope): PublicBurnActivity | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<PublicBurnActivity>;
  const { startBlock, throughBlock, throughTimestamp, burnCount, burnedXor, tonswapCount, tonswapXor } = row;
  if (
    typeof startBlock !== 'number' ||
    !Number.isSafeInteger(startBlock) ||
    startBlock < 1 ||
    typeof throughBlock !== 'number' ||
    !Number.isSafeInteger(throughBlock) ||
    throughBlock < startBlock ||
    typeof checkpoint !== 'number' ||
    !Number.isSafeInteger(checkpoint) ||
    throughBlock > checkpoint ||
    typeof throughTimestamp !== 'number' ||
    !Number.isSafeInteger(throughTimestamp) ||
    throughTimestamp < 1 ||
    typeof burnCount !== 'number' ||
    !Number.isSafeInteger(burnCount) ||
    burnCount < 0 ||
    typeof tonswapCount !== 'number' ||
    !Number.isSafeInteger(tonswapCount) ||
    tonswapCount < 0 ||
    tonswapCount > burnCount ||
    typeof burnedXor !== 'string' ||
    !XOR_AMOUNT.test(burnedXor) ||
    typeof tonswapXor !== 'string' ||
    !XOR_AMOUNT.test(tonswapXor)
  )
    return null;
  const age = Date.now() - throughTimestamp * 1_000;
  const burned = new FPNumber(burnedXor);
  const tonswap = new FPNumber(tonswapXor);
  if (
    age < -30_000 ||
    (scope === 'recent' && (throughBlock !== checkpoint || age >= BURN_ACTIVITY_MAX_AGE_MS)) ||
    (scope === 'campaign' && (startBlock !== CAMPAIGN_START_BLOCK || throughBlock > RECOVERY_CHECKPOINT)) ||
    tonswap.gt(burned) ||
    (!tonswapCount && !tonswap.isZero()) ||
    (burnCount === tonswapCount && !tonswap.isEqualTo(burned))
  )
    return null;
  return { startBlock, throughBlock, throughTimestamp, burnCount, burnedXor, tonswapCount, tonswapXor };
}

/** Read one independently covered interval from the configured endpoint. Current activity must match the live cursor. */
export async function fetchPublicBurnActivity(
  endpoint: string,
  scope: BurnScope = 'recent'
): Promise<PublicBurnActivity | null> {
  if (!endpoint) return null;
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: queries[scope] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const caps = payload?.data?.indexerCapabilities;
  if (
    payload?.errors?.length ||
    caps?.genesisHash !== RECOVERY_MAINNET_GENESIS ||
    caps.statsReady !== true ||
    caps.historyReady !== true
  )
    return null;
  const row = scope === 'campaign' ? payload.data.publicTonswapCampaignActivity : payload.data.publicBurnActivity;
  return parseActivity(row, caps.indexedBlock, scope);
}
