import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';

import { pricesActionContext } from './../prices';
import { PricesPayload } from './types';

const actions = defineActions({
  async getPrices(context, payload?: PricesPayload): Promise<void> {
    const { commit } = pricesActionContext(context);
    if (payload && payload.assetAAddress && payload.assetBAddress && payload.amountA && payload.amountB) {
      try {
        const [price, priceReversed] = await Promise.all([
          api.divideAssetsByAssetIds(
            payload.assetAAddress,
            payload.assetBAddress,
            payload.amountA,
            payload.amountB,
            false
          ),
          api.divideAssetsByAssetIds(
            payload.assetAAddress,
            payload.assetBAddress,
            payload.amountA,
            payload.amountB,
            true
          ),
        ]);

        commit.setPrices({ price, priceReversed });
      } catch (error) {
        commit.resetPrices();
      }
    } else {
      commit.resetPrices();
    }
  },
});

export default actions;
