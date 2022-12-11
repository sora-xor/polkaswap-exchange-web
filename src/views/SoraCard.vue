<template>
  <div>
    <div v-loading="loading" v-if="loading" class="loading-page container"></div>
    <sora-card-intro v-if="step === Step.Intro" @confirm-apply="confirmApply" />
    <sora-card-kyc v-else-if="step === Step.KYC" @go-to-intro="openIntro" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action } from '@/store/decorators';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import { Component, Mixins } from 'vue-property-decorator';

enum Step {
  Intro = 'Intro',
  KYC = 'KYC',
}

@Component({
  components: {
    SoraCardIntro: lazyComponent(Components.SoraCardIntroPage),
    SoraCardKyc: lazyComponent(Components.SoraCardKYC),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, SubscriptionsMixin) {
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnAccountLiquidityList!: AsyncVoidFn;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnAccountLiquidityUpdates!: AsyncVoidFn;
  @action.soraCard.subscribeToTotalXorBalance private subscribeToTotalXorBalance!: AsyncVoidFn;
  @action.soraCard.unsubscribeFromTotalXorBalance private unsubscribeFromTotalXorBalance!: AsyncVoidFn;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates
  private unsubscribeAccountLiquidityListAndUpdates!: AsyncVoidFn;

  step: Step = Step.Intro;
  isUserPassedKyc = false;

  Step = Step;

  confirmApply(): void {
    this.step = Step.KYC;
  }

  openIntro(): void {
    this.step = Step.Intro;
  }

  async created(): Promise<void> {
    if (this.isUserPassedKyc) {
      this.step = Step.KYC;
    }

    this.setStartSubscriptions([
      this.subscribeOnAccountLiquidityList,
      this.subscribeOnAccountLiquidityUpdates,
      this.subscribeToTotalXorBalance,
    ]);
    this.setResetSubscriptions([this.unsubscribeFromTotalXorBalance, this.unsubscribeAccountLiquidityListAndUpdates]);
  }

  async beforeDestroy(): Promise<void> {
    await this.unsubscribeFromTotalXorBalance();
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
