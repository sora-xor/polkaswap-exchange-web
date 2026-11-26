import { gql } from '@urql/core';
import { api } from '@/lib/soraneo-wallet/src/api';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

export const RECOVERY_MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
export const APPROVED_RECOVERY_POLICY = '0x1f4e11427a9c0a61a4868af40c9e0bdf263bb44a9ee59886a537c52164f3cdbb';
const HASH = /^0x[0-9a-f]{64}$/;
export interface IndexerCapabilities {
  schemaVersion: 1;
  mode: 'legacy' | 'full-recovery' | 'canonical-stats-history';
  genesisHash: string;
  policyHash: string | null;
  statsReady: boolean;
  historyReady: boolean;
  currentViewsReady: boolean;
  entitlementsReady: boolean;
  indexedBlock: number | null;
  indexedBlockHash: string | null;
  reason: string | null;
}
export const CAPABILITIES_QUERY_TEXT = `query IndexerCapabilities {
  indexerCapabilities { schemaVersion mode genesisHash policyHash statsReady historyReady currentViewsReady
    entitlementsReady indexedBlock indexedBlockHash reason }
}`;
const query = gql<{ indexerCapabilities: unknown }>(CAPABILITIES_QUERY_TEXT);

/** Explicitly unavailable differs from a legitimate zero entitlement. */
export class EntitlementsUnavailableError extends Error {
  constructor() {
    super('Recovery balances and estimates are unavailable.');
    this.name = 'EntitlementsUnavailableError';
  }
}

/** Validate a fresh capability object against this chain, never freshness alone. */
export function parseEntitlementCapabilities(
  value: unknown,
  genesisHash = RECOVERY_MAINNET_GENESIS
): IndexerCapabilities {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EntitlementsUnavailableError();
  const row = value as IndexerCapabilities;
  if (
    row.schemaVersion !== 1 ||
    !['legacy', 'full-recovery', 'canonical-stats-history'].includes(row.mode) ||
    row.genesisHash !== genesisHash ||
    !HASH.test(row.genesisHash) ||
    (row.policyHash !== null && (typeof row.policyHash !== 'string' || !HASH.test(row.policyHash))) ||
    !['statsReady', 'historyReady', 'currentViewsReady', 'entitlementsReady'].every(
      (key) => typeof row[key as keyof IndexerCapabilities] === 'boolean'
    ) ||
    (row.indexedBlock !== null && (!Number.isSafeInteger(row.indexedBlock) || row.indexedBlock < 0)) ||
    (row.indexedBlockHash !== null &&
      (typeof row.indexedBlockHash !== 'string' ||
        !HASH.test(row.indexedBlockHash) ||
        row.indexedBlockHash === `0x${'0'.repeat(64)}`)) ||
    (row.indexedBlock === null) !== (row.indexedBlockHash === null) ||
    (row.reason !== null && (typeof row.reason !== 'string' || row.reason.length > 256)) ||
    !row.entitlementsReady ||
    row.indexedBlock === null ||
    row.mode === 'canonical-stats-history'
  )
    throw new EntitlementsUnavailableError();
  if (
    genesisHash === RECOVERY_MAINNET_GENESIS &&
    (row.mode !== 'full-recovery' || row.policyHash !== APPROVED_RECOVERY_POLICY || row.indexedBlock < 28_194_043)
  ) {
    throw new EntitlementsUnavailableError();
  }
  if ((row.mode === 'legacy' && row.policyHash !== null) || (row.mode !== 'legacy' && row.policyHash === null))
    throw new EntitlementsUnavailableError();
  return { ...row };
}

/** Reading an already connected identity is local; it does not scan or call RPC. */
function connectedGenesis(): string {
  try {
    return api.connection?.api?.genesisHash?.toString().toLowerCase() || RECOVERY_MAINNET_GENESIS;
  } catch {
    return RECOVERY_MAINNET_GENESIS;
  }
}

/** No capability cache, retry-to-another-endpoint, partial-error data or legacy mainnet approval. */
export async function requireEntitlements(indexer: PolkaswapIndexer = getCurrentIndexer()) {
  try {
    const genesis = connectedGenesis();
    const explorer = indexer.services.explorer.captureNetworkOnly();
    const response = await explorer.request(query);
    if (connectedGenesis() !== genesis) throw new EntitlementsUnavailableError();
    const capabilities = parseEntitlementCapabilities(response?.indexerCapabilities, genesis);
    return { capabilities, indexer: { ...indexer, services: { ...indexer.services, explorer } } as PolkaswapIndexer };
  } catch {
    throw new EntitlementsUnavailableError();
  }
}

/** Raw HTTP consumers pin one endpoint across capability and every snapshot page. */
export async function requireEndpointEntitlements(endpoint: string): Promise<IndexerCapabilities> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: CAPABILITIES_QUERY_TEXT }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new EntitlementsUnavailableError();
    const payload = await response.json();
    if (payload.errors?.length) throw new EntitlementsUnavailableError();
    return parseEntitlementCapabilities(payload.data?.indexerCapabilities);
  } catch {
    throw new EntitlementsUnavailableError();
  }
}
