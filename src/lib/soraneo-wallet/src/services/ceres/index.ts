import { FPNumber } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import isEmpty from 'lodash/fp/isEmpty';
import { interval } from 'rxjs';

import type { FiatPriceObject } from '../indexer/types';

const ceresUpdateInterval = interval(60_000);

export class CeresApiService {
  public static async getFiatPriceObject(): Promise<Nullable<FiatPriceObject>> {
    try {
      const cerestokenApi = await fetch('https://data.cerestoken.io/api/prices', { cache: 'no-store' });
      const data = await cerestokenApi.json();
      const cerestokenApiObj = (data as Array<any>).reduce<FiatPriceObject>((acc, item) => {
        if (+item.price) {
          acc[item.assetId] = new FPNumber(item.price).toCodecString();
        }
        return acc;
      }, {});
      if (isEmpty(cerestokenApiObj)) {
        return null;
      }
      if (!cerestokenApiObj[DAI.address]) {
        cerestokenApiObj[DAI.address] = FPNumber.ONE.toCodecString();
      }
      return cerestokenApiObj;
    } catch (error) {
      console.warn('[CERES API] not available!', error);
      return null;
    }
  }

  public static createFiatPriceSubscription(
    handler: (entity?: FiatPriceObject) => void,
    errorHandler: () => void
  ): VoidFunction {
    const subscription = ceresUpdateInterval.subscribe(async () => {
      const data = await CeresApiService.getFiatPriceObject();
      if (!data) {
        errorHandler();
      } else {
        handler(data);
      }
    });

    return () => {
      console.info(`[CERES API] Fiat values unsubscribe.`);
      subscription.unsubscribe();
    };
  }
}
