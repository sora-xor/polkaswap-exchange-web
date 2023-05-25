<template>
  <div class="sora-card">
    <div class="sora-card__threshold">
      <h3 class="sora-card__threshold">{{ title }}</h3>
      <balance-indicator />
    </div>
    <div class="sora-card__options--not-enough-euro s-flex">
      <!-- <s-button
        v-for="item in buyOptions"
        class="sora-card__btn sora-card__btn--buy s-typography-button--large"
        :key="item.type"
        :type="item.button"
        :loading="btnLoading"
        @click="buyTokens(item.type)"
      >
        <span class="text">{{ t(item.text) }}</span>
      </s-button> -->
    </div>
    <!-- <x1-dialog :visible.sync="showX1Dialog" />
    <paywings-dialog :visible.sync="showPaywingsDialog" /> -->
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import type { FPNumber } from '@sora-substrate/math';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { state } from '@/store/decorators';

enum BuyButtonType {
  X1,
  Bridge,
  Paywings,
}
type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

@Component({
  components: {
    BalanceIndicator: lazyComponent(Components.BalanceIndicator),
  },
})
export default class Payment extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;

  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.X1, text: 'card.depositX1Btn', button: 'primary' },
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
    // TODO: [CARD] bring back when option becomes available & check this translation key below
    // { type: BuyButtonType.Paywings, text: 'card.buyUsingPaywings', button: 'tertiary' },
  ];

  get title(): string {
    return `You need ${this.xorToDeposit.format(3)} XOR to receive a free card`;
  }

  // get btnLoading(): boolean {
  //   if (!this.isLoggedIn) {
  //     return this.loading;
  //   }

  //   return this.loading || !this.wasEuroBalanceLoaded;
  // }

  // private openX1(): void {
  //   this.showX1Dialog = true;
  // }

  // private issueCardByPaywings(): void {
  //   this.showPaywingsDialog = true;
  // }

  // private bridgeTokens(): void {
  //   if (!this.isEuroBalanceEnough) {
  //     router.push({ name: PageNames.Bridge, params: { xorToDeposit: this.xorToDeposit.toString() } });
  //   }
  // }

  // buyTokens(type: BuyButtonType): void {
  //   switch (type) {
  //     case BuyButtonType.X1:
  //       this.openX1();
  //       break;
  //     case BuyButtonType.Bridge:
  //       this.bridgeTokens();
  //       break;
  //     case BuyButtonType.Paywings:
  //       this.issueCardByPaywings();
  //       break;
  //   }
  // }
}
</script>

<style lang="scss" scope>
.sora-card {
  &__threshold-limits {
    background: #f7f3f4;
    border-radius: 12px;
  }
  &__btn {
    width: 100%;
    &--buy {
      margin-top: var(--s-size-mini);
      .text {
        font-size: var(--s-heading4-font-size);
      }
    }
  }
}
</style>
