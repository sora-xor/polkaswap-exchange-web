import { excludePoolXYKAssets } from '@sora-substrate/sdk/build/assets';

import { formatStringNumber } from '../../../util';

import type { SubqueryAssetEntity } from '../subquery/types';
import type { SubsquidAssetEntity } from '../subsquid/types';
import type { FiatPriceObject, UpdatesStream } from '../types';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export function parseAssetFiatPrice(entity: SubsquidAssetEntity | SubqueryAssetEntity): FiatPriceObject {
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

  const data = JSON.parse(entity.data);

  return Object.entries(data).reduce((acc, [id, price]) => {
    const priceFPNumber = formatStringNumber(price as string);
    const isPriceFinity = priceFPNumber.isFinity();
    if (isPriceFinity) {
      acc[id] = priceFPNumber.toCodecString();
    }
    return acc;
  }, {});
}

export function parseAssetRegistrationStreamUpdate(entity: UpdatesStream): Asset[] {
  const data = entity?.data ? JSON.parse(entity.data) : {};
  const newAssets = Object.values(data).map((item) => {
    const asset = JSON.parse(item as string);
    asset.decimals = Number(asset.decimals);
    return asset;
  }) as Asset[];
  const filtered = excludePoolXYKAssets(newAssets);

  return filtered;
}
