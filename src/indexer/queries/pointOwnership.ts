import { requireEntitlements } from './capabilities';
import { gql } from '@urql/core';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { fetchAccountMeta } from './pointSystem';
import type { AccountPointSystems } from '@/types/pointSystem';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import type { QueryData } from '@/lib/soraneo-wallet/src/services/indexer/types';

const CHECKPOINT_BLOCK = 28_191_817;
const CHECKPOINT_HASH = '0x7f7c253fa72f32e7b03f32bdc9ae456fd7174fb131b689be6d876006124129f0';
const HASH = /^0x[0-9a-f]{64}$/;

export interface PointHistorySource {
  account: string;
  firstBlock: number;
  lastBlock: number | null;
}

export interface PointOwnership {
  status: 'legacy' | 'active' | 'replacement' | 'retired' | 'extinguished';
  ready: boolean;
  accountId: string;
  policyHash: string | null;
  checkpointBlock: number | null;
  checkpointHash: string | null;
  sources: PointHistorySource[];
  referralRewardsCodec: string;
}

const ownershipQuery = gql<QueryData<unknown>>`
  query SoratopiaPointOwnership($id: String!) {
    data: soratopiaPointOwnership(id: $id) {
      status
      ready
      accountId
      policyHash
      checkpointBlock
      checkpointHash
      referralRewardsCodec
      sources {
        account
        firstBlock
        lastBlock
      }
    }
  }
`;

/** Compare actual AccountId32 values, preserving returned historical address aliases. */
function accountId(address: unknown): string {
  if (typeof address !== 'string' || !address || address.length > 128) throw new Error('Invalid points account');
  const decoded = decodeAddress(address);
  if (decoded.length !== 32) throw new Error('Invalid points account length');
  return u8aToHex(decoded);
}

/** Validate the indexer's ownership admission; it is not a client-side recovery certificate. */
export function parsePointOwnership(value: unknown, account: string): PointOwnership {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Missing points ownership');
  const row = value as PointOwnership;
  if (typeof row.referralRewardsCodec !== 'string' || !/^(0|[1-9][0-9]{0,79})$/.test(row.referralRewardsCodec)) {
    throw new Error('Invalid points referral reward amount');
  }
  const statuses = ['legacy', 'active', 'replacement', 'retired', 'extinguished'];
  if (
    !statuses.includes(row.status) ||
    typeof row.ready !== 'boolean' ||
    !HASH.test(row.accountId) ||
    row.accountId !== accountId(account) ||
    !Array.isArray(row.sources) ||
    row.sources.length > 16
  ) {
    throw new Error('Invalid points ownership identity');
  }
  if (row.status === 'legacy') {
    if (
      row.referralRewardsCodec !== '0' ||
      !row.ready ||
      row.policyHash !== null ||
      row.checkpointBlock !== null ||
      row.checkpointHash !== null ||
      row.sources.length !== 1 ||
      row.sources[0]?.account !== account ||
      row.sources[0]?.firstBlock !== 1 ||
      row.sources[0]?.lastBlock !== null
    ) {
      throw new Error('Invalid legacy points ownership');
    }
  } else {
    if (
      typeof row.policyHash !== 'string' ||
      !HASH.test(row.policyHash) ||
      row.checkpointBlock !== CHECKPOINT_BLOCK ||
      row.checkpointHash !== CHECKPOINT_HASH
    )
      throw new Error('Invalid points recovery identity');
    if ((row.status === 'retired' || row.status === 'extinguished') && row.referralRewardsCodec !== '0') {
      throw new Error('Blocked points ownership has referral rewards');
    }
    if ((!row.ready || row.status === 'retired' || row.status === 'extinguished') && row.sources.length) {
      throw new Error('Blocked points ownership has sources');
    }
  }
  const aliases = new Set<string>();
  const previousOwners = new Set<string>();
  let historicalAliases = 0;
  let currentAliases = 0;
  for (const source of row.sources) {
    if (
      !source ||
      typeof source !== 'object' ||
      aliases.has(`${source.account}:${source.firstBlock}:${source.lastBlock}`)
    )
      throw new Error('Duplicate points source');
    const owner = accountId(source.account);
    aliases.add(`${source.account}:${source.firstBlock}:${source.lastBlock}`);
    if (row.status === 'legacy') continue;
    if (source.firstBlock === 1 && source.lastBlock === CHECKPOINT_BLOCK) {
      if (
        (row.status === 'replacement' && owner === row.accountId) ||
        (row.status === 'active' && owner !== row.accountId)
      )
        throw new Error('Incorrect historical points owner');
      previousOwners.add(owner);
      historicalAliases += 1;
    } else {
      const expectedStart = CHECKPOINT_BLOCK + 1;
      if (owner !== row.accountId || source.firstBlock !== expectedStart || source.lastBlock !== null) {
        throw new Error('Invalid or overlapping points history interval');
      }
      currentAliases += 1;
    }
  }
  if (historicalAliases > 8 || currentAliases > 8 || previousOwners.size > 1) throw new Error('Points source bound');
  return { ...row, sources: row.sources.map((source) => ({ ...source })) };
}

/** Read ownership before loading scores. Missing schema, partial/error data and bad evidence fail closed. */
export async function fetchPointOwnership(account: string, indexer?: PolkaswapIndexer): Promise<PointOwnership | null> {
  try {
    const session = await requireEntitlements(indexer ?? getCurrentIndexer());
    const response = await session.indexer.services.explorer.request(ownershipQuery, { id: account });
    const ownership = parsePointOwnership(response?.data, account);
    if (
      ownership.policyHash !== session.capabilities.policyHash ||
      (session.capabilities.mode === 'full-recovery' && ownership.status === 'legacy')
    )
      return null;
    return ownership;
  } catch {
    return null;
  }
}

/** V1's legacy burn/RPC fallback cannot certify a remapped recovery history. */
export function canShowPoints(ownership: PointOwnership | null, version: 1 | 2): boolean {
  return (
    !!ownership?.ready &&
    (ownership.status === 'legacy' ||
      (version === 2 && (ownership.status === 'active' || ownership.status === 'replacement')))
  );
}

/** Read projected metadata on the same explorer and require its exact admitted owner/policy. */
export async function fetchOwnedPointMetadata(
  account: string,
  selectedIndexer?: PolkaswapIndexer
): Promise<AccountPointSystems | null> {
  try {
    const { indexer } = await requireEntitlements(selectedIndexer ?? getCurrentIndexer());
    const ownership = await fetchPointOwnership(account, indexer);
    if (!ownership || !canShowPoints(ownership, 2)) return null;
    const metadata = await fetchAccountMeta(account, indexer);
    if (
      !metadata ||
      metadata.recoveryPolicyHash !== ownership.policyHash ||
      accountId(metadata.accountId) !== ownership.accountId
    )
      return null;
    return ownership.status === 'legacy'
      ? metadata
      : {
          ...metadata,
          recoveryReferralRewards: FPNumber.fromCodecValue(ownership.referralRewardsCodec, XOR.decimals),
        };
  } catch {
    return null;
  }
}
