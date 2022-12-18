import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';

import { getXorPerEuroRatio, waitForAccountPair } from '@/utils';
import { defineUserStatus } from '@/utils/card';
import { soraCardActionContext } from './../soraCard';
import { CardIssueStatus } from '@/types/card';

const actions = defineActions({
  calculateXorRestPrice(context, xorPerEuro): void {
    const { state, commit } = soraCardActionContext(context);
    const { totalXorBalance } = state;
    const euroToPay = FPNumber.HUNDRED.add(FPNumber.ONE).sub(totalXorBalance.mul(xorPerEuro));
    const euroToPayInXor = euroToPay.div(xorPerEuro);

    commit.setXorPriceToDeposit(euroToPayInXor);
  },

  async calculateXorBalanceInEuros(context, xorTotalBalance: FPNumber): Promise<void> {
    const { commit, dispatch } = soraCardActionContext(context);
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
    const { commit, rootGetters, dispatch } = soraCardActionContext(context);

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
    const { commit } = soraCardActionContext(context);
    setTimeout(() => {
      commit.resetTotalXorBalanceUpdates();
    }, 1000 * 60 * 5);
  },

  async getUserKycStatus(context): Promise<void> {
    const { commit } = soraCardActionContext(context);

    const status: CardIssueStatus | undefined = await defineUserStatus();
    // remove
    // status = CardIssueStatus.Reject;
    // status = undefined;

    commit.setUserStatus(status);
  },
});

export default actions;
