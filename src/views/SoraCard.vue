<template>
  <div>
    <confirmation-info v-loading="loading" v-if="step === Step.ConfirmationInfo" />
    <sora-card-intro v-else-if="step === Step.StartPage" @confirm-apply="confirmApply" />
    <sora-card-kyc v-else-if="step === Step.KYC" @go-to-start="openStartPage" :userApplied="userApplied" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action, getter } from '@/store/decorators';
import { goTo, lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import type { VerificationStatus } from '@/types/card';

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
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, SubscriptionsMixin) {
  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.settings.soraCardEnabled soraCardEnabled!: Nullable<boolean>;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncFnWithoutArgs;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncFnWithoutArgs;

  step: Nullable<Step> = null;
  userApplied = false;

  Step = Step;

  @Watch('soraCardEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    console.info('SoraCard.vue::soraCardEnabled:', value); // For tests on PR env
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
      this.step = Step.ConfirmationInfo;
      return;
    }

    this.checkKyc();
  }

  async checkKyc(): Promise<void> {
    await this.getUserStatus();

    if (this.currentStatus) {
      this.step = Step.ConfirmationInfo;
    } else {
      this.step = Step.StartPage;
    }
  }

  created(): void {
    this.subscribeToTotalXorBalance();
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
