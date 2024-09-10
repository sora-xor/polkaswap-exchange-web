import { FPNumber } from '@sora-substrate/sdk';
import { api, ScriptLoader } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { soraCardActionContext } from '@/store/soraCard';
import { waitForAccountPair, waitForSoraNetworkFromEnv, toPrecision } from '@/utils';
import {
  defineUserStatus,
  getXorPerEuroRatio,
  getFreeKycAttemptCount,
  soraCard,
  getUserIbanInfo,
  getFees,
} from '@/utils/card';

import type { Status } from '../../types/card';

const actions = defineActions({
  calculateXorRestPrice(context, xorPerEuro: FPNumber): void {
    const { state, commit } = soraCardActionContext(context);
    const { totalXorBalance } = state;
    const euroToPay = FPNumber.HUNDRED.add(FPNumber.ONE).sub(totalXorBalance.mul(xorPerEuro));
    const euroToPayInXor = euroToPay.div(xorPerEuro);

    commit.setXorPriceToDeposit(toPrecision(euroToPayInXor, 3)); // TODO: round up number
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
      await new Promise<void>((resolve) => {
        const subscription = api.assets.getTotalXorBalanceObservable().subscribe(async (xorTotalBalance: FPNumber) => {
          commit.setTotalXorBalance(xorTotalBalance);
          await dispatch.calculateXorBalanceInEuros({ xorPerEuro, xorTotalBalance });
          resolve();
        });

        commit.setTotalXorBalanceUpdates(subscription);
      });
      // After first call
      commit.setEuroBalanceLoaded(true);
    });
  },

  async unsubscribeFromTotalXorBalance(context): Promise<void> {
    const { commit } = soraCardActionContext(context);
    commit.resetTotalXorBalanceUpdates();
  },

  async getUserStatus(context): Promise<void> {
    const { commit } = soraCardActionContext(context);

    const { kycStatus, verificationStatus, rejectReasons, referenceNumber }: Status = await defineUserStatus();

    commit.setKycStatus(kycStatus);
    commit.setVerificationStatus(verificationStatus);
    commit.setReferenceNumber(referenceNumber);

    if (rejectReasons) commit.setRejectReason(rejectReasons);
  },

  async initPayWingsAuthSdk(context): Promise<void> {
    const { commit, rootState } = soraCardActionContext(context);
    let soraNetwork = rootState.wallet.settings.soraNetwork;
    if (!soraNetwork) {
      soraNetwork = await waitForSoraNetworkFromEnv();
    }
    const { authService } = soraCard(soraNetwork);

    await ScriptLoader.unload(authService.sdkURL, false).catch(() => {});
    await ScriptLoader.load(authService.sdkURL, false).catch(() => {});

    // TODO: [CARD] annotate via TS main calls
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
  },

  async getUserKycAttempt(context): Promise<void> {
    const { commit } = soraCardActionContext(context);
    const attempts = await getFreeKycAttemptCount();

    commit.setAttempts(attempts);
  },

  async getUserIban(context): Promise<void> {
    const { commit } = soraCardActionContext(context);
    const { iban, availableBalance } = await getUserIbanInfo();

    commit.setUserIban(iban);
    commit.setUserBalance(availableBalance);
  },

  async getFees(context): Promise<void> {
    const { commit } = soraCardActionContext(context);
    const { application, retry } = await getFees();

    commit.setFees({ application, retry });
  },
});

export default actions;
