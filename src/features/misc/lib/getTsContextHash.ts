import { stringToU8a } from '@polkadot/util';
import { keccakAsHex } from '@polkadot/util-crypto';

/**
 * Keccak-256 of a GetTS draft context string, as 0x-prefixed lowercase hex.
 *
 * Callers hash `JSON.stringify(...)` output, which never contains lone surrogates,
 * so the UTF-8 bytes (and therefore the hash) equal ethers'
 * `keccak256(toUtf8Bytes(context))`. Drafts persisted before this helper existed
 * keep matching. Using the polkadot hasher keeps ethers out of the swap page's
 * startup bundle.
 *
 * The context is always encoded as UTF-8 bytes first: passing a string straight
 * to `keccakAsHex` would decode a `0x…` value as hex instead. The bytes are copied
 * into this realm's `Uint8Array` because polkadot does not recognise typed arrays
 * from another realm (e.g. a `TextEncoder` from a different global) as bytes.
 */
export function getTsContextHash(context: string): string {
  return keccakAsHex(Uint8Array.from(stringToU8a(context)), 256);
}
