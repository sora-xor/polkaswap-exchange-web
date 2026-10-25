import { describe, expect, it } from 'vitest';

import {
  appendPinnedAssetAddress,
  normalizePinnedAssetAddresses,
  removeAddressBookEntry,
  removePinnedAssetAddress,
  setAddressBookEntry,
} from '@/stores/wallet/accountCollections';

describe('wallet account collection helpers', () => {
  it('updates pinned asset addresses without mutating the source list', () => {
    const current = Object.freeze(['xor', 'val']);

    expect(appendPinnedAssetAddress(current, 'pswap')).toEqual(['xor', 'val', 'pswap']);
    expect(appendPinnedAssetAddress(current, '')).toEqual(['xor', 'val']);
    expect(removePinnedAssetAddress(current, 'xor')).toEqual(['val']);
    expect(removePinnedAssetAddress(current, '')).toEqual(['xor', 'val']);
    expect(current).toEqual(['xor', 'val']);
  });

  it('normalizes multiple pinned asset addresses by dropping blanks and duplicates', () => {
    expect(normalizePinnedAssetAddresses(['xor', '', 'val', 'xor', 'pswap'])).toEqual(['xor', 'val', 'pswap']);
  });

  it('sets and removes address-book entries without mutating the source book', () => {
    const current = Object.freeze({
      alice: 'Alice',
      bob: 'Bob',
    });

    expect(setAddressBookEntry(current, { address: 'charlie', name: 'Charlie' })).toEqual({
      alice: 'Alice',
      bob: 'Bob',
      charlie: 'Charlie',
    });
    expect(setAddressBookEntry(current, { address: 'charlie' })).toEqual({
      alice: 'Alice',
      bob: 'Bob',
      charlie: '',
    });
    expect(removeAddressBookEntry(current, 'alice')).toEqual({
      bob: 'Bob',
    });
    expect(removeAddressBookEntry(current, '')).toEqual({
      alice: 'Alice',
      bob: 'Bob',
    });
    expect(current).toEqual({
      alice: 'Alice',
      bob: 'Bob',
    });
  });
});
