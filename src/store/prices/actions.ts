import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';

import { getXorPerEuroRatio, waitForAccountPair } from '@/utils';
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
  calculateXorRestPrice(context, xorPerEuro): void {
    const { state, commit } = pricesActionContext(context);
    const { totalXorBalance } = state;
    const euroToPay = FPNumber.HUNDRED.add(FPNumber.ONE).sub(totalXorBalance.mul(xorPerEuro));
    const euroToPayInXor = euroToPay.div(xorPerEuro);

    commit.setXorPriceToDeposit(euroToPayInXor);
  },
  async calculateXorBalanceInEuros(context, xorTotalBalance: FPNumber): Promise<void> {
    const { commit, dispatch } = pricesActionContext(context);
    try {
      const xorPerEuro: string = await getXorPerEuroRatio();
      const xorPerEuroFPN = FPNumber.fromNatural(xorPerEuro);
      const euroBalance = xorTotalBalance.mul(xorPerEuroFPN).toNumber();
      commit.setEuroBalance(euroBalance.toString());

      if (euroBalance < 100) {
        dispatch.calculateXorRestPrice(xorPerEuroFPN);
      }
    } catch {}
  },
  async subscribeToTotalXorBalance(context): Promise<void> {
    const { commit, rootGetters, dispatch } = pricesActionContext(context);

    commit.resetTotalXorBalanceUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(async () => {
      const subscription = api.assets.getTotalXorBalanceObservable().subscribe((xorTotalBalance: FPNumber) => {
        commit.setTotalXorBalance(xorTotalBalance);
        dispatch.calculateXorBalanceInEuros(xorTotalBalance);
      });

      commit.setTotalXorBalanceUpdates(subscription);
    });
  },
  async unsubscribeFromTotalXorBalance(context): Promise<void> {
    const { commit } = pricesActionContext(context);
    setTimeout(() => {
      commit.resetTotalXorBalanceUpdates();
    }, 1000 * 60 * 5);
  },
});

export default actions;
