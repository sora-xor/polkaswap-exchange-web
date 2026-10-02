import { decodeAddress } from '@polkadot/util-crypto';

const EVM_ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/i;

const normalizeAccount = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Compares recorded and connected bridge accounts without trusting their display
 * encoding. EVM/AccountKey20 addresses are case-insensitive, while AccountId32
 * addresses are compared by public key so different SS58 prefixes still match.
 * Malformed or empty values fail closed.
 */
export function areBridgeExternalAccountsEqual(recordedAccount: unknown, connectedAccount: unknown): boolean {
  const recorded = normalizeAccount(recordedAccount);
  const connected = normalizeAccount(connectedAccount);

  if (!(recorded && connected)) return false;

  if (EVM_ACCOUNT_PATTERN.test(recorded) && EVM_ACCOUNT_PATTERN.test(connected)) {
    return recorded.toLowerCase() === connected.toLowerCase();
  }

  try {
    const recordedPublicKey = decodeAddress(recorded, false);
    const connectedPublicKey = decodeAddress(connected, false);

    return (
      recordedPublicKey.length === connectedPublicKey.length &&
      recordedPublicKey.every((byte, index) => byte === connectedPublicKey[index])
    );
  } catch {
    return false;
  }
}
