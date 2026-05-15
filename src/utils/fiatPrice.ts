export type FiatPriceObjectLike = Readonly<Record<string, Nullable<string> | undefined>>;

/**
 * Reads a fiat price by asset address while tolerating checksum/lowercase
 * differences in hex asset identifiers returned by chain and indexer APIs.
 */
export function getFiatPriceByAddress(
  fiatPriceObject: Nullable<FiatPriceObjectLike>,
  address?: Nullable<string>
): Nullable<string> {
  if (!address || !fiatPriceObject) return null;

  return fiatPriceObject[address] ?? fiatPriceObject[address.toLowerCase()] ?? null;
}
