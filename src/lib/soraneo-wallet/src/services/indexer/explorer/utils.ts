import { excludePoolXYKAssets } from '@sora-substrate/sdk/build/assets';

import { isJsonRecord, parseIndexerJson } from '@/utils/indexerParsing';

import { formatStringNumber } from '../../../util';

import type { AssetEntity, FiatPriceObject, UpdatesStream } from '../types';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export function parseAssetFiatPrice(entity: AssetEntity): FiatPriceObject {
  const acc = {};
  const id = entity.id;
  const priceFPNumber = formatStringNumber(entity.priceUSD);
  const isPriceFinity = priceFPNumber.isFinity();
  if (isPriceFinity) {
    acc[id] = priceFPNumber.toCodecString();
  }
  return acc;
}

export function parsePriceStreamUpdate(entity: UpdatesStream): Nullable<FiatPriceObject> {
  if (!entity?.data) return null;

  const data = parseIndexerJson(entity.data, {}, isJsonRecord);

  return Object.entries(data).reduce((acc, [id, price]) => {
    if (!id.trim() || typeof price !== 'string') return acc;

    const priceFPNumber = formatStringNumber(price);
    const isPriceFinity = priceFPNumber.isFinity();
    if (isPriceFinity) {
      acc[id] = priceFPNumber.toCodecString();
    }
    return acc;
  }, {});
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
