import type { Book, Nullable } from '@/types/common';

export type AddressBookEntry = {
  address?: Nullable<string>;
  name?: Nullable<string>;
};

/**
 * Appends one pinned asset address while preserving the existing wallet store contract.
 */
export function appendPinnedAssetAddress(current: readonly string[] = [], assetAddress?: Nullable<string>): string[] {
  return assetAddress ? [...current, assetAddress] : [...current];
}

/**
 * Removes all pinned entries for an asset address.
 */
export function removePinnedAssetAddress(current: readonly string[] = [], assetAddress?: Nullable<string>): string[] {
  return assetAddress ? current.filter((address) => address !== assetAddress) : [...current];
}

/**
 * Normalizes a user-ordered pinned asset list by dropping empty entries and duplicates.
 */
export function normalizePinnedAssetAddresses(assetAddresses: readonly string[] = []): string[] {
  return [...new Set(assetAddresses.filter(Boolean))];
}

/**
 * Adds or replaces one address-book entry without mutating the source book.
 */
export function setAddressBookEntry(book: Nullable<Book>, entry: AddressBookEntry): Book {
  if (!entry.address) {
    return { ...(book ?? {}) };
  }

  return {
    ...(book ?? {}),
    [entry.address]: entry.name ?? '',
  };
}

/**
 * Removes one address-book entry without mutating the source book.
 */
export function removeAddressBookEntry(book: Nullable<Book>, address?: Nullable<string>): Book {
  const nextBook = { ...(book ?? {}) };

  if (address) {
    delete nextBook[address];
  }

  return nextBook;
}
