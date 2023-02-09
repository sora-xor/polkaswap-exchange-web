import { defineActions } from 'direct-vuex';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';

import { waitForAccountPair } from '@/utils';
import { defineUserStatus, getXorPerEuroRatio, soraCard } from '@/utils/card';
import { soraCardActionContext } from './../soraCard';
import { Status } from '@/types/card';
import { loadScript } from 'vue-plugin-load-script';

const actions = defineActions({
  calculateXorRestPrice(context, xorPerEuro): void {
    const { state, commit } = soraCardActionContext(context);
    const { totalXorBalance } = state;
    const euroToPay = FPNumber.HUNDRED.add(FPNumber.ONE).sub(totalXorBalance.mul(xorPerEuro));
    const euroToPayInXor = euroToPay.div(xorPerEuro);

    commit.setXorPriceToDeposit(euroToPayInXor);
  },

  async calculateXorBalanceInEuros(context, { xorPerEuro, xorTotalBalance }): Promise<void> {
    const { commit, dispatch } = soraCardActionContext(context);

    try {
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

    const xorPerEuro: string = await getXorPerEuroRatio();

    await waitForAccountPair(async () => {
      const subscription = api.assets.getTotalXorBalanceObservable().subscribe((xorTotalBalance: FPNumber) => {
        commit.setTotalXorBalance(xorTotalBalance);
        dispatch.calculateXorBalanceInEuros({ xorPerEuro, xorTotalBalance });
      });

      commit.setTotalXorBalanceUpdates(subscription);
    });
  },

  async unsubscribeFromTotalXorBalance(context): Promise<void> {
    const { commit } = soraCardActionContext(context);
    commit.resetTotalXorBalanceUpdates();
  },

  async getUserStatus(context): Promise<void> {
    const { commit } = soraCardActionContext(context);

    const { kycStatus, verificationStatus }: Status = await defineUserStatus();

    commit.setKycStatus(kycStatus);
    commit.setVerificationStatus(verificationStatus);
  },

  async initPayWingsAuthSdk(context): Promise<void> {
    const { commit, rootState } = soraCardActionContext(context);
    const soraNetwork = rootState.wallet.settings.soraNetwork || WALLET_CONSTS.SoraNetwork.Test;
    const { authService } = soraCard(soraNetwork);

    await loadScript(authService.sdkURL).then(() => {
      // TODO: annotate via TS main calls
      // @ts-expect-error no undefined
      const login = Paywings.WebSDK.create({
        Domain: 'soracard.com',
        UnifiedLoginApiKey: authService.apiKey,
        env: authService.env,
        AccessTokenTypeID: 1,
        UserTypeID: 2,
        ClientDescription: 'Auth',
      });

      commit.setPayWingsAuthSdk(login);
    });
  },
});

export default actions;
