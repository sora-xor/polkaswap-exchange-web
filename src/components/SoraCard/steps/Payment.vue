<template>
  <div class="sora-card">
    <div class="sora-card__threshold">
      <h3 class="sora-card__threshold">You need 4.16 XOR to receive a free card</h3>
      <div class="sora-card__threshold-limits">
        <p>Free card issuance</p>
        <p>If you hold, stake or provide liquidity for at least €100 worth of XOR in your SORA account</p>
      </div>
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

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

enum BuyButtonType {
  X1,
  Bridge,
  Paywings,
}
type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

@Component
export default class Payment extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.X1, text: 'card.depositX1Btn', button: 'primary' },
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
    // TODO: [CARD] bring back when option becomes available & check this translation key below
    // { type: BuyButtonType.Paywings, text: 'card.buyUsingPaywings', button: 'tertiary' },
  ];

  // get btnLoading(): boolean {
  //   if (!this.isLoggedIn) {
  //     return this.loading;
  //   }

  //   return this.loading || !this.wasEuroBalanceLoaded;
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
