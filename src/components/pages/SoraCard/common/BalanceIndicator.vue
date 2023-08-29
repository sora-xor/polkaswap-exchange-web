<template>
  <div class="sora-card__info">
    <div class="sora-card__balance-section">
      <s-icon class="sora-card__icon--closed" name="basic-close-24" size="16px" />
      <div>
        <p class="sora-card__info-text">Free card issuance</p>
        <p class="sora-card__info-text-details sora-card__info-text-details--secondary">
          If you hold, stake or provide liquidity for at least €100 worth of XOR in your SORA account
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

const hundred = 100;

@Component
export default class BalanceIndicator extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.euroBalance private euroBalance!: string;

  @Ref('progress') private readonly progressBar!: HTMLInputElement;

  @Watch('euroBalance')
  private handleEuroBalanceChange() {
    this.runProgressBarAnimation();
  }

  get balanceIndicatorAmount(): string {
    const euroBalance = FPNumber.fromNatural(this.euroBalance);
    const remaining = FPNumber.HUNDRED.sub(euroBalance);

    return `You need ${this.xorToDeposit.format(3)} more XOR (€${remaining.toFixed(2)})`;
  }

  async runProgressBarAnimation(): Promise<void> {
    if (this.progressBar) {
      const balanceInteger = Math.round(Number(this.euroBalance));
      for (let i = 0; i < balanceInteger; i = i + 0.12) {
        await delay(1);
        this.progressBar.style.setProperty('width', `${i}%`);
      }
    }
  }

  mounted(): void {
    setTimeout(this.runProgressBarAnimation, 2500);
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
