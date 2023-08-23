<template>
  <div class="sora-card-wrapper">
    <confirmation-info v-if="step === Step.ConfirmationInfo" v-loading="loading" @confirm-apply="openKycPage" />
    <sora-card-intro v-else-if="step === Step.StartPage" @confirm-apply="openKycPage" />
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
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { Components, PageNames } from '@/consts';
import { goTo, lazyComponent } from '@/router';
import { action, state, getter, mutation } from '@/store/decorators';
import { KycStatus, UserInfo, VerificationStatus } from '@/types/card';

import type { NavigationGuardNext, Route } from 'vue-router';

enum Step {
  StartPage = 'StartPage',
  KYC = 'KYC',
  ConfirmationInfo = 'ConfirmationInfo',
  Dashboard = 'Dashboard',
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

  @state.soraCard.hasFreeAttempts private hasFreeAttempts!: boolean;
  @state.soraCard.wantsToPassKycAgain private wantsToPassKycAgain!: boolean;
  @state.soraCard.userInfo userInfo!: UserInfo;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;

  @mutation.soraCard.setKycStatus private setKycStatus!: (kycStatus: KycStatus) => void;
  @mutation.soraCard.setVerificationStatus private setVerificationStatus!: (verStatus: VerificationStatus) => void;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.getUserIban private getUserIban!: AsyncFnWithoutArgs;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncFnWithoutArgs;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncFnWithoutArgs;
  @action.wallet.account.loginAccount private loginAccount!: (payload: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;

  step: Nullable<Step> = null;
  getReadyPage = false;
  isRedirectFromFearless = true;

  @Watch('soraCardEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    if (value === false) {
      goTo(PageNames.Swap);
    }
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
    await this.getUserStatus();

    if (this.currentStatus === VerificationStatus.Rejected && this.wantsToPassKycAgain && this.hasFreeAttempts) {
      this.getReadyPage = true;
      this.step = Step.KYC;
      return;
    }

    if (this.currentStatus === VerificationStatus.Accepted) {
      await this.getUserIban();

      if (this.userInfo.iban) {
        this.step = Step.Dashboard;
        return;
      } else {
        this.step = Step.ConfirmationInfo;
      }
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

  created(): void {
    this.withApi(this.handleAccountChange);
  }

  async beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<Vue>): Promise<void> {
    await this.handleAccountChange(to);
    next();
  }

  async beforeDestroy(): Promise<void> {
    await this.unsubscribeFromTotalXorBalance();
  }

  mounted(): void {
    this.checkKyc();
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
