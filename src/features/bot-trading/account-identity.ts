/** Stable account identity for locks and ledger comparisons across SS58 prefixes. */
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

// The exact GO funding path already locks the SORA 69 form; keep its lease namespace.
const SORA_SS58_PREFIX = 69;

/** Keep stored addresses untouched: an existing consent remains bound to its reviewed spelling. */
export function botAccountKey(account: string): string {
  let bytes: Uint8Array;
  try {
    bytes = decodeAddress(account);
  } catch {
    /* Legacy test and paper identities have no public key. */
    return account;
  }
  return bytes.length === 32 ? encodeAddress(bytes, SORA_SS58_PREFIX) : account;
}

/** Compare decoded public keys without changing a persisted bot, order or campaign. */
export function sameBotAccount(left: string, right: string): boolean {
  return left === right || botAccountKey(left) === botAccountKey(right);
}
