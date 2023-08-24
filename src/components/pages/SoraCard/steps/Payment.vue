<template>
  <div class="sora-card sora-card-payment">
    <div class="sora-card__threshold">
      <token-logo :token="xor" :size="WALLET_CONSTS.LogoSize.LARGE" />
      <h3 class="sora-card__threshold-title">{{ title }}</h3>
      <balance-indicator />
    </div>
    <div class="sora-card__options--not-enough-euro s-flex">
      <s-button
        v-for="item in buyOptions"
        class="sora-card__btn sora-card__btn--buy s-typography-button--large"
        :key="item.type"
        :type="item.button"
        :loading="btnLoading"
        @click="buyTokens(item.type)"
      >
        <span class="text">{{ t(item.text) }}</span>
      </s-button>
    </div>
    <x1-dialog :visible.sync="showX1Dialog" />
  </div>
</template>

<script lang="ts">
import { WALLET_CONSTS, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { FPNumber } from '@sora-substrate/math';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

enum BuyButtonType {
  X1,
  Bridge,
  Paywings,
}

type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    BalanceIndicator: lazyComponent(Components.BalanceIndicator),
    X1Dialog: lazyComponent(Components.X1Dialog),
  },
})
export default class Payment extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.assets.xor xor!: Nullable<AccountAsset>;

  showX1Dialog = false;
  showPaywingsDialog = false;

  WALLET_CONSTS = WALLET_CONSTS;

  @Watch('isEuroBalanceEnough', { immediate: true })
  private handleXorDeposit(isEnough: boolean): void {
    if (isEnough) {
      this.$emit('confirm');
    }
  }

  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.X1, text: 'card.depositX1Btn', button: 'primary' },
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
  ];

  get title(): string {
    return `You need ${this.xorToDeposit.format(3)} XOR to receive a free card`;
  }

  get btnLoading(): boolean {
    if (!this.isLoggedIn) {
      return this.loading;
    }
    return this.loading || !this.wasEuroBalanceLoaded;
  }

  private openX1(): void {
    this.showX1Dialog = true;
  }

  private bridgeTokens(): void {
    if (!this.isEuroBalanceEnough) {
      router.push({ name: PageNames.Bridge, params: { xorToDeposit: this.xorToDeposit.toString() } });
    }
  }

  buyTokens(type: BuyButtonType): void {
    switch (type) {
      case BuyButtonType.X1:
        this.openX1();
        break;
      case BuyButtonType.Bridge:
        this.bridgeTokens();
        break;
    }
  }
}
</script>

<style lang="scss" scope>
.sora-card {
  &__threshold {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .logo {
      margin-top: -32px;
      margin-bottom: 24px;
    }

    &-title {
      text-transform: none;
      margin: 0 80px;
      text-align: center;
      margin-bottom: 24px;
    }
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
