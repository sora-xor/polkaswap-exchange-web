import { FPNumber } from '@sora-substrate/math';
import { gql } from '@urql/core';
import { APPROVED_RECOVERY_POLICY, RECOVERY_MAINNET_GENESIS } from '../capabilities';
import type { NetworkCounts } from './volume';

const day = 86_400;
const fields = ['transactions', 'bridgeIncomingTransactions', 'bridgeOutgoingTransactions'] as const;
type Field = (typeof fields)[number];
type Observation = { timestamp: number; value: NetworkCounts | null };
type Row = { start: number; end: number } & Record<Field, number>;
type Capabilities = {
  genesisHash: string;
  policyHash: string;
  mode: string;
  statsReady: boolean;
  historyReady: boolean;
  indexedBlock: number;
};
type Result = { days: Row[]; indexerCapabilities: Capabilities };

export const archivedCounterDaysQuery = gql<Result>`
  query VerifiedNetworkCounterDays($start: Int!, $end: Int!) {
    days: verifiedNetworkCounterDays(start: $start, end: $end) {
      start
      end
      transactions
      bridgeIncomingTransactions
      bridgeOutgoingTransactions
    }
    indexerCapabilities {
      genesisHash
      policyHash
      mode
      statsReady
      historyReady
      indexedBlock
    }
  }
`;

/** Merge one complete, possibly clipped UTC day at most once. A disagreement remains unknown for that counter. */
export function mergeArchivedCountDays(
  observations: Observation[],
  start: number,
  end: number,
  result: Result | null
): Observation[] {
  const caps = result?.indexerCapabilities;
  if (
    !caps ||
    caps.genesisHash !== RECOVERY_MAINNET_GENESIS ||
    caps.policyHash !== APPROVED_RECOVERY_POLICY ||
    caps.mode !== 'canonical-stats-history' ||
    caps.historyReady !== true ||
    caps.statsReady !== true ||
    !Number.isSafeInteger(caps.indexedBlock) ||
    caps.indexedBlock < 28_191_817 ||
    !Array.isArray(result?.days) ||
    result.days.length > 366
  )
    return observations;
  const available = new Map<number, Row>();
  const interests = new Set(observations.map((observation) => observation.timestamp / 1000));
  for (const row of result.days) {
    if (
      !row ||
      !Number.isSafeInteger(row.start) ||
      !Number.isSafeInteger(row.end) ||
      !interests.has(row.start) ||
      row.start < start ||
      row.start >= end ||
      (row.start !== start && row.start % day !== 0) ||
      row.end !== Math.min(end, (Math.floor(row.start / day) + 1) * day) ||
      available.has(row.start) ||
      fields.some((key) => !Number.isSafeInteger(row[key]) || row[key] < 0 || row[key] > 0x7fffffff)
    )
      return observations;
    available.set(row.start, row);
  }
  return observations.map((o) => {
    const row = available.get(o.timestamp / 1000);
    if (!row) return o;
    const v: NetworkCounts = {
      accounts: o.value?.accounts ?? null,
      transactions: null,
      bridgeIncomingTransactions: null,
      bridgeOutgoingTransactions: null,
    };
    for (const key of fields) {
      const known = o.value?.[key],
        observed = new FPNumber(row[key]);
      v[key] = known && !known.isEqualTo(observed) ? null : (known ?? observed);
    }
    return { timestamp: o.timestamp, value: v };
  });
}
