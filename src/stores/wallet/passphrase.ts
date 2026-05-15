import cryptoRandomString from 'crypto-random-string';
import { AES, enc } from 'crypto-js';

import type { AccountState } from '@/stores/wallet/account/types';
import type { Nullable } from '@/types/common';

export type WalletAddressFormatter = (address: string, isFormatted?: boolean) => string;

export type StoreAccountPassphraseParams = {
  state: AccountState;
  address: string;
  password: string;
  formatAddress: WalletAddressFormatter;
  clearExisting: (address: string) => void;
  createSessionKey?: () => string;
  now?: () => number;
  schedule?: (handler: VoidFunction, timeout: number) => NodeJS.Timeout;
};

/**
 * Decrypts the temporarily cached account passphrase for a formatted wallet address.
 */
export function readAccountPassphrase(
  state: AccountState,
  accountAddress: string,
  formatAddress: WalletAddressFormatter
): Nullable<string> {
  if (!accountAddress) {
    return null;
  }

  const address = formatAddress(accountAddress, false);
  const encryptedPassphrase = state.addressPassphraseMapping[address];
  const sessionKey = state.addressKeyMapping[address];

  if (!(encryptedPassphrase && sessionKey)) {
    return null;
  }

  return AES.decrypt(encryptedPassphrase, sessionKey).toString(enc.Utf8);
}

/**
 * Clears a cached account passphrase, timestamp, and expiry timer.
 */
export function clearAccountPassphrase(
  state: AccountState,
  nextAddress: string,
  formatAddress: WalletAddressFormatter,
  clearTimer: (timer: NodeJS.Timeout) => void = clearTimeout
): void {
  const address = formatAddress(nextAddress, false);
  const timer = state.accountPasswordTimer[address];

  if (timer) {
    clearTimer(timer);
  }

  state.accountPasswordTimer[address] = null;
  state.accountPasswordTimestamp[address] = null;
  state.addressKeyMapping = {
    ...state.addressKeyMapping,
    [address]: null,
  };
  state.addressPassphraseMapping = {
    ...state.addressPassphraseMapping,
    [address]: null,
  };
}

/**
 * Encrypts and stores a passphrase for short-lived transaction signing reuse.
 */
export function storeAccountPassphrase({
  state,
  address,
  password,
  formatAddress,
  clearExisting,
  createSessionKey = () => cryptoRandomString({ length: 10, type: 'ascii-printable' }),
  now = Date.now,
  schedule = setTimeout,
}: StoreAccountPassphraseParams): void {
  clearExisting(address);

  const formattedAddress = formatAddress(address, false);
  const sessionKey = createSessionKey();
  const passphrase = AES.encrypt(password, sessionKey).toString();

  state.addressPassphraseMapping = {
    ...state.addressPassphraseMapping,
    [formattedAddress]: passphrase,
  };
  state.addressKeyMapping = {
    ...state.addressKeyMapping,
    [formattedAddress]: sessionKey,
  };

  const timer = schedule(() => clearExisting(address), state.accountPasswordTimeout);

  state.accountPasswordTimer = {
    ...state.accountPasswordTimer,
    [formattedAddress]: timer,
  };
  state.accountPasswordTimestamp = {
    ...state.accountPasswordTimestamp,
    [formattedAddress]: now(),
  };
}
