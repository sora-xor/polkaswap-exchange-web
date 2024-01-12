<template>
  <div class="sora-card-wrapper">
    <confirmation-info v-if="step === Step.ConfirmationInfo" v-loading="loading" @confirm-apply="openKycPage" />
    <sora-card-intro v-else-if="showIntro" :maintenance="isUnderMaintenance" @confirm-apply="openKycPage" />
    <sora-card-kyc
      v-else-if="step === Step.KYC"
      :getReadyPage="getReadyPage"
      @go-to-start="openStartPage"
      @go-to-kyc-result="openKycResultPage"
      @go-to-dashboard="openDashboard"
    />
    <dashboard v-else-if="step === Step.Dashboard" @logout="logout" />
  </div>
</template>

<script lang="ts">
import { api, mixins, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, state, getter, mutation } from '@/store/decorators';
import { AttemptCounter, UserInfo, VerificationStatus } from '@/types/card';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type { NavigationGuardNext, Route } from 'vue-router';

enum Step {
  StartPage = 'StartPage',
  KYC = 'KYC',
  ConfirmationInfo = 'ConfirmationInfo',
  Dashboard = 'Dashboard',
  Maintenance = 'Maintenance',
}

@Component({
  components: {
    SoraCardIntro: lazyComponent(Components.SoraCardIntroPage),
    SoraCardKyc: lazyComponent(Components.SoraCardKYC),
    ConfirmationInfo: lazyComponent(Components.ConfirmationInfo),
    Dashboard: lazyComponent(Components.Dashboard),
  },
})
export default class SoraCard extends Mixins(mixins.LoadingMixin, SubscriptionsMixin) {
  readonly Step = Step;

  @state.soraCard.attemptCounter private attemptCounter!: AttemptCounter;
  @state.soraCard.wantsToPassKycAgain private wantsToPassKycAgain!: boolean;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.settings.soraCardEnabled private soraCardEnabled!: Nullable<boolean>;

  @mutation.soraCard.setWillToPassKycAgain private setWillToPassKycAgain!: (will: boolean) => void;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.getUserKycAttempt private getUserKycAttempt!: AsyncFnWithoutArgs;
  @action.soraCard.getUserIban private getUserIban!: AsyncFnWithoutArgs;
  @action.soraCard.getFees private getFees!: AsyncFnWithoutArgs;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncFnWithoutArgs;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnList!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnUpdates!: AsyncFnWithoutArgs;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates private unsubscribe!: AsyncFnWithoutArgs;
  @action.wallet.account.loginAccount private loginAccount!: (payload: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;
  @state.wallet.account.source private source!: WALLET_CONSTS.AppWallet;

  step: Nullable<Step> = null;
  getReadyPage = false;
  isRedirectFromFearless = true;

  get isUnderMaintenance(): boolean {
    return this.step === Step.Maintenance;
  }

  get showIntro(): boolean {
    return [Step.StartPage, Step.Maintenance].includes(this.step as Step);
  }

  get hasFreeAttempts() {
    return this.attemptCounter.hasFreeAttempts;
  }

  get hasTokens(): boolean {
    const accessToken = localStorage.getItem('PW-token');
    const refreshToken = localStorage.getItem('PW-refresh-token');

    if (refreshToken === 'undefined') return false;

    return !!accessToken && !!refreshToken;
  }

  openKycPage(openGetReadyPage = false): void {
    this.getReadyPage = openGetReadyPage;
    this.step = Step.KYC;
  }

  openStartPage(): void {
    this.step = Step.StartPage;
  }

  openKycResultPage(): void {
    this.step = Step.ConfirmationInfo;
  }

  openDashboard(): void {
    this.step = Step.Dashboard;
  }

  logout(): void {
    this.openStartPage();
  }

  async checkKyc(): Promise<void> {
    // wait for the config to be loaded (for soraCardEnabled)
    if (this.soraCardEnabled === undefined || this.soraCardEnabled === null) {
      await waitForSoraNetworkFromEnv();
    }
    if (!this.soraCardEnabled) {
      this.step = Step.Maintenance;
      return;
    }

    await this.getUserStatus();
    await this.getUserKycAttempt();

    if (this.currentStatus === VerificationStatus.Rejected && this.wantsToPassKycAgain && this.hasFreeAttempts) {
      this.getReadyPage = true;
      this.step = Step.KYC;
      return;
    }

    if (this.currentStatus === VerificationStatus.Accepted) {
      await this.getUserIban();

      this.step = Step.Dashboard;
      return;
    }

    if ([VerificationStatus.Pending, VerificationStatus.Rejected].includes(this.currentStatus)) {
      this.step = Step.ConfirmationInfo;
      return;
    }

    this.step = Step.StartPage;
  }

  private async handleAccountChange(to?: Route): Promise<void> {
    const address = (to ?? this.$route).query?.fearless as Nullable<string>;
    const name = (to ?? this.$route).query?.name as Nullable<string>;

    if (address && name) {
      if (api.validateAddress(address)) {
        await this.loginAccount({
          address,
          name,
          source: WALLET_CONSTS.AppWallet.FearlessWallet,
        });
      }
    }

    this.subscribeToTotalXorBalance();
  }

  async created(): Promise<void> {
    await this.withLoading(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        await Promise.all([this.subscribeOnList, this.subscribeOnUpdates].map((fn) => fn?.()));
      });
    });

    // Fearless integration
    await this.withApi(this.handleAccountChange);

    const refreshToken = localStorage.getItem('PW-refresh-token');

    if (this.source === WALLET_CONSTS.AppWallet.FearlessWallet && refreshToken) {
      (window as WindowInjectedWeb3).injectedWeb3?.['fearless-wallet']?.saveSoraCardToken?.(refreshToken);
    }
  }

  async beforeRouteLeave(to: Route, from: Route, next: NavigationGuardNext<Vue>): Promise<void> {
    this.setWillToPassKycAgain(false);
    await this.unsubscribe();
    next();
  }

  async beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<Vue>): Promise<void> {
    await this.handleAccountChange(to);
    next();
  }

  async beforeDestroy(): Promise<void> {
    await this.unsubscribeFromTotalXorBalance();
  }

  async mounted(): Promise<void> {
    await this.$nextTick();
    this.checkKyc();
    this.getFees();
  }
}
</script>

<style lang="scss">
.sora-card-wrapper {
  position: relative;
}

.el-button.neumorphic.s-primary.sora-card__btn {
  margin-top: var(--s-size-mini);

  span.text {
    font-variation-settings: 'wght' 700 !important;
    font-size: 18px;
  }
}
</style>
