import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAccountPassphrase,
  readAccountPassphrase,
  storeAccountPassphrase,
  type WalletAddressFormatter,
} from '@/stores/wallet/passphrase';

import type { AccountState } from '@/stores/wallet/account/types';

const createState = (): AccountState =>
  ({
    addressKeyMapping: {},
    addressPassphraseMapping: {},
    accountPasswordTimer: {},
    accountPasswordTimestamp: {},
    accountPasswordTimeout: 1_000,
  }) as AccountState;

const formatAddress: WalletAddressFormatter = (address) => `formatted:${address}`;

describe('wallet passphrase session helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores encrypted passphrases and decrypts them by formatted address', () => {
    const state = createState();
    const clearExisting = vi.fn((address: string) => clearAccountPassphrase(state, address, formatAddress));

    storeAccountPassphrase({
      state,
      address: 'alice',
      password: 'secret-passphrase',
      formatAddress,
      clearExisting,
      createSessionKey: () => 'session-key',
    });

    expect(clearExisting).toHaveBeenCalledWith('alice');
    expect(state.addressKeyMapping['formatted:alice']).toBe('session-key');
    expect(state.addressPassphraseMapping['formatted:alice']).not.toBe('secret-passphrase');
    expect(state.accountPasswordTimestamp['formatted:alice']).toBe(1_700_000_000_000);
    expect(readAccountPassphrase(state, 'alice', formatAddress)).toBe('secret-passphrase');
  });

  it('clears cached passphrases when the timeout fires', () => {
    const state = createState();
    const clearExisting = (address: string): void => clearAccountPassphrase(state, address, formatAddress);

    storeAccountPassphrase({
      state,
      address: 'alice',
      password: 'secret-passphrase',
      formatAddress,
      clearExisting,
      createSessionKey: () => 'session-key',
    });

    vi.advanceTimersByTime(999);
    expect(readAccountPassphrase(state, 'alice', formatAddress)).toBe('secret-passphrase');

    vi.advanceTimersByTime(1);
    expect(readAccountPassphrase(state, 'alice', formatAddress)).toBeNull();
    expect(state.accountPasswordTimer['formatted:alice']).toBeNull();
    expect(state.accountPasswordTimestamp['formatted:alice']).toBeNull();
  });

  it('clears existing passphrase timers before resetting account mappings', () => {
    const state = createState();
    const timer = setTimeout(() => undefined, 10_000);
    const clearTimer = vi.fn();

    state.accountPasswordTimer['formatted:alice'] = timer;
    state.accountPasswordTimestamp['formatted:alice'] = 123;
    state.addressKeyMapping['formatted:alice'] = 'session-key';
    state.addressPassphraseMapping['formatted:alice'] = 'encrypted';

    clearAccountPassphrase(state, 'alice', formatAddress, clearTimer);

    expect(clearTimer).toHaveBeenCalledWith(timer);
    expect(state.accountPasswordTimer['formatted:alice']).toBeNull();
    expect(state.accountPasswordTimestamp['formatted:alice']).toBeNull();
    expect(state.addressKeyMapping['formatted:alice']).toBeNull();
    expect(state.addressPassphraseMapping['formatted:alice']).toBeNull();
  });

  it('returns null when the account address or encrypted session state is missing', () => {
    const state = createState();

    expect(readAccountPassphrase(state, '', formatAddress)).toBeNull();
    expect(readAccountPassphrase(state, 'alice', formatAddress)).toBeNull();
  });
});
