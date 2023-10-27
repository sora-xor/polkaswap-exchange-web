<template>
  <div class="sora-card__info">
    <div class="sora-card__balance-section">
      <s-icon class="sora-card__icon--closed" name="basic-close-24" size="16px" />
      <div>
        <p class="sora-card__info-text">{{ t('card.freeCardIssuance') }}</p>
        <p class="sora-card__info-text-details sora-card__info-text-details--secondary">
          {{ t('card.holdNotSufficientXor') }}
        </p>
        <span class="progress-bar">
          <span class="progress-bar--in-progress" ref="progress" />
        </span>
        <span class="sora-card__balance-indicator">{{ balanceIndicatorAmount }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import { delay } from '@/utils';

@Component
export default class BalanceIndicator extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.euroBalance private euroBalance!: string;

  @Ref('progress') private readonly progressBar!: Nullable<HTMLInputElement>;

  @Watch('euroBalance')
  private handleEuroBalanceChange() {
    this.runProgressBarAnimation();
  }

  get balanceIndicatorAmount(): string {
    const euroBalance = FPNumber.fromNatural(this.euroBalance);
    const remaining = FPNumber.HUNDRED.sub(euroBalance);

    return this.t('card.xorAmountNeeded', { xor: this.xorToDeposit.format(3), euro: remaining.toFixed(2) });
  }

  async runProgressBarAnimation(): Promise<void> {
    if (!this.progressBar) return;

    const balanceInteger = Math.round(Number(this.euroBalance));
    for (let i = 0; i < balanceInteger; i = i + 0.12) {
      await delay(1);
      this.progressBar?.style?.setProperty?.('width', `${i}%`);
    }
  }

  mounted(): void {
    this.$nextTick().then(() => {
      setTimeout(this.runProgressBarAnimation, 2_500);
    });
  }
}
</script>

<style lang="scss" scoped>
.sora-card {
  &__balance-indicator {
    color: #479aef;
    font-size: 18px;
    line-height: 24px;
  }
}
.sora-card__icon {
  &--closed {
    margin-right: var(--s-basic-spacing);
    color: var(--s-color-base-content-secondary);
  }
}
</style>
