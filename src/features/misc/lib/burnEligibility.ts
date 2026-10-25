import { u8aEq } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

/** SORA Trust burns are ineligible for every public XOR burn reward campaign. */
export const SORA_TRUST_BURN_ADDRESS = 'cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo';

/** Matches the excluded account by its public key across SS58 and hexadecimal encodings. */
export function isExcludedXorBurnAddress(address: string): boolean {
  if (address === SORA_TRUST_BURN_ADDRESS) return true;
  try {
    const account = decodeAddress(address);
    return account.length === 32 && u8aEq(account, decodeAddress(SORA_TRUST_BURN_ADDRESS));
  } catch {
    return false;
  }
}
