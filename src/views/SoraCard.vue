<template>
  <div>
    <confirmation-info v-if="step === Step.ConfirmationInfo" />
    <sora-card-intro v-else-if="step === Step.StartPage" @confirm-apply="confirmApply" />
    <sora-card-kyc v-else-if="step === Step.KYC" @go-to-start="openStartPage" :userApplied="userApplied" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action, state } from '@/store/decorators';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import { Component, Mixins } from 'vue-property-decorator';
import { CardIssueStatus } from '@/types/card';

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
  @state.soraCard.userKycStatus private userKycStatus!: CardIssueStatus;

  @action.pool.subscribeOnAccountLiquidityList private subscribeOnAccountLiquidityList!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnAccountLiquidityUpdates!: AsyncFnWithoutArgs;
  @action.soraCard.getUserKycStatus private getUserKycStatus!: AsyncFnWithoutArgs;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncFnWithoutArgs;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncFnWithoutArgs;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates private unsubscribeLPUpdates!: AsyncFnWithoutArgs;

  step: Nullable<Step> = null;
  userApplied = false;

  Step = Step;

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
    await this.getUserKycStatus();

    if (this.userKycStatus) {
      this.step = Step.ConfirmationInfo;
    } else {
      this.step = Step.StartPage;
    }
  }

  async created(): Promise<void> {
    this.setStartSubscriptions([
      this.subscribeOnAccountLiquidityList,
      this.subscribeOnAccountLiquidityUpdates,
      this.subscribeToTotalXorBalance,
    ]);
    this.setResetSubscriptions([this.unsubscribeFromTotalXorBalance, this.unsubscribeLPUpdates]);
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
$color: #ee2233;

.sora-card__loader {
  height: 619px;
  position: absolute;
  margin-top: 15px;
}

.sora-card__btn {
  margin-top: 24px;
  width: 100%;
  background-color: $color !important;

  span.text {
    font-variation-settings: 'wght' 700 !important;
    font-size: 19px;
    color: #fff;
  }
}
.is-loading {
  span.text {
    color: transparent !important;
  }
}

.sora-card__no-spam {
  text-align: center;
  color: var(--s-color-base-content-secondary);
  margin-bottom: 8px;
}

.sora-card__input-description {
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-extra-small);
  font-weight: 300;
  line-height: var(--s-line-height-base);
  padding: var(--s-basic-spacing) calc(var(--s-basic-spacing) * 1.5) calc(var(--s-basic-spacing) * 2);
}

[design-system-theme='light'] {
  .sora-card {
    &__intro-name {
      color: #ee2233 !important;
    }
  }
}

.loading-page {
  position: absolute;
  height: 618px;
  width: 470px;
  margin-top: -18px;
}
</style>
