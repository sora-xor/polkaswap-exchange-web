<template>
  <div>
    <confirmation-info v-if="step === Step.ConfirmationInfo" v-loading="loading" @confirm-apply="openStartPage" />
    <sora-card-intro v-else-if="step === Step.StartPage" @confirm-apply="confirmApply" />
    <sora-card-kyc
      v-else-if="step === Step.KYC"
      :userApplied="userApplied"
      :openKycForm="openKycForm"
      @go-to-start="openStartPage"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, mixins, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import type { NavigationGuardNext, Route } from 'vue-router';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action, state, getter, mutation } from '@/store/decorators';
import { goTo, lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { KycStatus, VerificationStatus } from '@/types/card';

enum Step {
  StartPage = 'StartPage',
  KYC = 'KYC',
  ConfirmationInfo = 'ConfirmationInfo',
}

@Component({
  components: {
    SoraCardIntro: lazyComponent(Components.SoraCardIntroPage),
    SoraCardKyc: lazyComponent(Components.SoraCardKYC),
    ConfirmationInfo: lazyComponent(Components.ConfirmationInfo),
  },
})
export default class SoraCard extends Mixins(mixins.LoadingMixin, SubscriptionsMixin) {
  readonly Step = Step;

  @state.soraCard.hasFreeAttempts private hasFreeAttempts!: boolean;
  @state.soraCard.wantsToPassKycAgain private wantsToPassKycAgain!: boolean;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;

  @mutation.soraCard.setKycStatus private setKycStatus!: (kycStatus: KycStatus) => void;
  @mutation.soraCard.setVerificationStatus private setVerificationStatus!: (verStatus: VerificationStatus) => void;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncFnWithoutArgs;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncFnWithoutArgs;
  @action.wallet.account.loginAccount private loginAccount!: (payload: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;

  step: Nullable<Step> = null;
  userApplied = false;
  openKycForm = false;

  @Watch('soraCardEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  }

  confirmApply(userApplied: boolean): void {
    this.userApplied = userApplied;
    this.step = Step.KYC;
  }

  openStartPage(withoutCheck: boolean): void {
    if (withoutCheck) {
      this.setKycStatus(KycStatus.Completed);
      this.setVerificationStatus(VerificationStatus.Pending);
      this.step = Step.ConfirmationInfo;
      return;
    }

    this.checkKyc();
  }

  get hasTokens(): boolean {
    const accessToken = localStorage.getItem('PW-token');
    const refreshToken = localStorage.getItem('PW-refresh-token');

    if (refreshToken === 'undefined') return false;

    return !!accessToken && !!refreshToken;
  }

  async checkKyc(): Promise<void> {
    await this.getUserStatus();

    if (this.currentStatus === VerificationStatus.Rejected && this.wantsToPassKycAgain && this.hasFreeAttempts) {
      this.openKycForm = true;
      this.step = Step.KYC;
      return;
    }

    if (this.currentStatus) {
      this.step = Step.ConfirmationInfo;
      return;
    }

    if (this.hasTokens) {
      this.openKycForm = true;
      this.step = Step.KYC;
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
.el-button.neumorphic.s-primary.sora-card__btn {
  margin-top: var(--s-size-mini);

  span.text {
    font-variation-settings: 'wght' 700 !important;
    font-size: 19px;
  }
}
</style>
