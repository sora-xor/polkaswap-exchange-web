import { excludePoolXYKAssets } from '@sora-substrate/sdk/build/assets';

import { isJsonRecord, parseIndexerJson } from '@/utils/indexerParsing';

import { readMarketPrice } from '../marketPrice';

import type { AssetEntity, FiatPriceObject, UpdatesStream } from '../types';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export function parseAssetFiatPrice(entity: AssetEntity): FiatPriceObject {
  const price = readMarketPrice(entity.priceUSDExact, entity.priceUSD);
  return price ? { [entity.id]: price.toCodecString() } : {};
}

/** Preserve an exact zero and omit unquoted tokens from the wallet price map. */
export function parsePriceStreamUpdate(entity: UpdatesStream): Nullable<FiatPriceObject> {
  if (!entity) return null;
  const exact = Object.hasOwn(entity, 'pricesExact');
  const raw = exact ? entity.pricesExact : entity.data;
  if (raw == null || raw === '') return null;
  const data = isJsonRecord(raw) ? raw : parseIndexerJson<Record<string, unknown> | null>(raw, null, isJsonRecord);
  if (!data) return exact ? null : {};
  const prices: FiatPriceObject = {};
  for (const [id, value] of Object.entries(data)) {
    const price = exact ? readMarketPrice(value) : readMarketPrice(undefined, value);
    if (id.trim() && price) prices[id] = price.toCodecString();
  }
  return prices;
}

export function parseAssetRegistrationStreamUpdate(entity: UpdatesStream): Asset[] {
  const data = parseIndexerJson(entity?.data, {}, isJsonRecord);
  const newAssets = Object.values(data).reduce<Asset[]>((assets, item) => {
    const asset = parseIndexerJson(item, {}, isJsonRecord);
    const decimals = Number(asset.decimals);

    if (
      typeof asset.address !== 'string' ||
      !asset.address.trim() ||
      typeof asset.symbol !== 'string' ||
      !asset.symbol.trim() ||
      typeof asset.name !== 'string' ||
      typeof asset.isMintable !== 'boolean' ||
      !Number.isSafeInteger(decimals) ||
      decimals < 0
    ) {
      return assets;
    }

    assets.push({ ...asset, decimals } as Asset);
    return assets;
  }, []);
  const filtered = excludePoolXYKAssets(newAssets);

  return filtered;
}
