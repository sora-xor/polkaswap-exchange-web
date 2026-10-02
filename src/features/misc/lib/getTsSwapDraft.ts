import { keccak256, toUtf8Bytes } from 'ethers';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { Operation, type HistoryItem } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import type { GetTsPurpose } from './getTsFlow';
import { normalizeGetTsAmount, parseGetTsSwapDraft, type GetTsSwapDraft } from './getTsPlan';
import { SORA_FUNDING_MAINNET_GENESIS } from './tonswapLiquidity';

/** Binds one reviewed deterministic SDK row to its purpose, public signer, chain, pair and exact DAI input. */
export function createGetTsSwapDraft(row: HistoryItem, genesis: string, purpose: GetTsPurpose): GetTsSwapDraft | null {
  const amount = normalizeGetTsAmount(row.amount);
  if (
    genesis !== SORA_FUNDING_MAINNET_GENESIS ||
    row.type !== Operation.Swap ||
    row.assetAddress !== DAI.address ||
    row.asset2Address !== XOR.address ||
    typeof row.from !== 'string' ||
    row.from.length > 128 ||
    !amount
  )
    return null;
  try {
    const account = decodeAddress(row.from);
    if (account.length !== 32) return null;
    const contextHash = keccak256(
      toUtf8Bytes(JSON.stringify([purpose, row.id, genesis, u8aToHex(account), DAI.address, XOR.address, amount]))
    );
    return parseGetTsSwapDraft({ id: row.id, amount, contextHash }, purpose);
  } catch {
    return null;
  }
}

/** Matches an exact persisted draft, never another recent swap or a stored completion flag. */
export function matchGetTsSwapDraft(
  row: HistoryItem,
  draft: GetTsSwapDraft,
  account: string,
  genesis: string,
  purpose: GetTsPurpose
): boolean {
  const actual = createGetTsSwapDraft(row, genesis, purpose);
  const current = createGetTsSwapDraft({ ...row, from: account }, genesis, purpose);
  return (
    !!actual &&
    actual.id === draft.id &&
    actual.amount === draft.amount &&
    actual.contextHash === draft.contextHash &&
    current?.contextHash === draft.contextHash
  );
}

/** Only explicit wallet cancellation permits discarding a draft with no signed SDK row. */
export function isDefiniteGetTsSwapRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && (error.code === 4001 || error.code === 'ACTION_REJECTED')) return true;
  return (
    'message' in error &&
    typeof error.message === 'string' &&
    /^(?:Cancelled|Canceled|User (?:rejected|cancelled|canceled)(?: the request)?)[.!]?$/i.test(error.message)
  );
}
