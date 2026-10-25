import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import type { GetTsPurpose } from './getTsFlow';
import { isGetTsTransactionReference } from './getTsPlan';
import {
  readGetTsConversionProgress,
  type GetTsConversionProgress,
  type GetTsConversionReadClient,
  type GetTsConversionTransaction,
} from './getTsConversionProgress';
import { TONSWAP_CONVERSION_CONTRACTS } from './tonswapConversion';

export const GET_TS_CONVERSION_FINGERPRINT_KEYS = {
  ts: 'polkaswap:get-ts:conversion-fingerprint:v1',
  xor: 'polkaswap:buy-xor:conversion-fingerprint:v1',
} as const;
type FingerprintStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface Fingerprint {
  version: 1;
  originalHash: string;
  requestDigest: string;
}
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const TIMEOUT = 15_000;
const same = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
const storageAvailable = (): FingerprintStorage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
};

/** Digests the exact same-nonce request, excluding changeable gas terms and all receipt status. */
export function getTsConversionRequestDigest(
  transaction: GetTsConversionTransaction | null,
  hash: string,
  account: string
): string | null {
  if (!transaction || !ADDRESS.test(account) || !isGetTsTransactionReference(hash)) return null;
  const detailed = transaction as GetTsConversionTransaction & { nonce?: unknown; data?: unknown; value?: unknown };
  if (
    !same(detailed.hash, hash) ||
    detailed.chainId !== 1n ||
    !same(detailed.from, account) ||
    !same(detailed.to, TONSWAP_CONVERSION_CONTRACTS.gateway) ||
    !Number.isSafeInteger(detailed.nonce) ||
    (detailed.nonce as number) < 0 ||
    typeof detailed.data !== 'string' ||
    !/^0x(?:[0-9a-f]{2}){4,32768}$/i.test(detailed.data) ||
    typeof detailed.value !== 'bigint' ||
    detailed.value < 0n ||
    detailed.value >= 1n << 256n
  )
    return null;
  return u8aToHex(
    sha256AsU8a(
      JSON.stringify([
        1,
        account.toLowerCase(),
        detailed.nonce,
        detailed.to!.toLowerCase(),
        detailed.data.toLowerCase(),
        detailed.value.toString(),
      ]),
      true
    )
  );
}

/** Contains slow/unavailable wallet RPCs without accepting any late result or writing after context changed. */
async function bounded<T>(
  fallback: T,
  isCurrent: () => boolean,
  action: (current: () => boolean) => Promise<T>
): Promise<T> {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const current = () => active && isCurrent();
  try {
    return await Promise.race([
      action(current),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          active = false;
          resolve(fallback);
        }, TIMEOUT);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    active = false;
    clearTimeout(timer);
  }
}

/** Checks only the selected provider's existing account/network; never requests a connection or signature. */
async function assertWallet(client: GetTsConversionReadClient, account: string, current: () => boolean) {
  if (!current() || !ADDRESS.test(account)) throw new Error('Recovery context unavailable');
  const [network, chainId, accounts] = await Promise.all([
    client.getNetwork(),
    client.send('eth_chainId', []),
    client.send('eth_accounts', []),
  ]);
  if (
    !current() ||
    network.chainId !== 1n ||
    chainId !== '0x1' ||
    !Array.isArray(accounts) ||
    !same(accounts[0], account)
  )
    throw new Error('Recovery wallet changed');
}

/** Stores one bounded public-hash/request-digest pair per purpose; no raw account, calldata, value or status. */
export async function captureGetTsConversionFingerprint(
  client: GetTsConversionReadClient,
  originalHash: string,
  account: string,
  purpose: GetTsPurpose = 'ts',
  isCurrent: () => boolean = () => true,
  storage = storageAvailable()
): Promise<boolean> {
  return bounded(false, isCurrent, async (current) => {
    if (!storage || !isGetTsTransactionReference(originalHash) || !['ts', 'xor'].includes(purpose)) return false;
    await assertWallet(client, account, current);
    if (!current()) return false;
    const transaction = await client.getTransaction(originalHash);
    const requestDigest = getTsConversionRequestDigest(transaction, originalHash, account);
    if (!requestDigest) return false;
    await assertWallet(client, account, current);
    if (!current()) return false;
    const entry: Fingerprint = { version: 1, originalHash: originalHash.toLowerCase(), requestDigest };
    storage.setItem(GET_TS_CONVERSION_FINGERPRINT_KEYS[purpose], JSON.stringify(entry));
    return true;
  });
}

/**
 * Explicit replacement-hash recovery. Same sender/nonce/call/value is required;
 * cancellations and unrelated transfers never complete the original conversion.
 * The caller may rebind its plan only after received/failed canonical evidence.
 */
export async function verifyGetTsConversionReplacement(
  client: GetTsConversionReadClient,
  originalHash: string,
  replacementHash: string,
  account: string,
  purpose: GetTsPurpose = 'ts',
  isCurrent: () => boolean = () => true,
  storage = storageAvailable()
): Promise<GetTsConversionProgress> {
  const unavailable: GetTsConversionProgress = { state: 'unavailable', reference: replacementHash };
  return bounded(unavailable, isCurrent, async (current) => {
    if (
      !isGetTsTransactionReference(originalHash) ||
      !isGetTsTransactionReference(replacementHash) ||
      same(originalHash, replacementHash) ||
      !['ts', 'xor'].includes(purpose)
    )
      return unavailable;
    await assertWallet(client, account, current);
    if (!current()) return unavailable;
    const [original, replacement] = await Promise.all([
      client.getTransaction(originalHash),
      client.getTransaction(replacementHash),
    ]);
    if (!current()) return unavailable;
    let expected = getTsConversionRequestDigest(original, originalHash, account);
    // An observable but mismatched original must not be repaired from saved data.
    if (original && !expected) return unavailable;
    if (!original) {
      try {
        const raw = storage?.getItem(GET_TS_CONVERSION_FINGERPRINT_KEYS[purpose]);
        if (!raw || raw.length > 512) return unavailable;
        const entry: unknown = JSON.parse(raw);
        if (
          !entry ||
          typeof entry !== 'object' ||
          Array.isArray(entry) ||
          Object.keys(entry).sort().join(',') !== 'originalHash,requestDigest,version' ||
          !('version' in entry) ||
          entry.version !== 1 ||
          !('originalHash' in entry) ||
          !same(entry.originalHash, originalHash) ||
          !('requestDigest' in entry) ||
          typeof entry.requestDigest !== 'string' ||
          !isGetTsTransactionReference(entry.requestDigest)
        )
          return unavailable;
        expected = entry.requestDigest;
      } catch {
        return unavailable;
      }
    }
    const actual = getTsConversionRequestDigest(replacement, replacementHash, account);
    if (!expected || !actual || expected !== actual) return unavailable;
    const result = await readGetTsConversionProgress(client, replacementHash, account, current);
    return current() ? result : unavailable;
  });
}
