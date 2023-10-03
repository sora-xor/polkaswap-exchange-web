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
    <div class="delimiter">{{ t('card.or') }}</div>
    <div class="sora-card__application-fee-disclaimer">
      <p>{{ applicationFeeText }}</p>
      <p>{{ t('card.oneTimeApplicationFee') }}</p>
      <p>{{ t('card.applicationFeeNote') }}</p>
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
import { Fees } from '@/types/card';

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
  @state.soraCard.fees fees!: Fees;

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
    return this.t('card.xorAmountNeededTitle', { value: this.xorToDeposit.format(3) });
  }

  get btnLoading(): boolean {
    if (!this.isLoggedIn) {
      return this.loading;
    }
    return this.loading || !this.wasEuroBalanceLoaded;
  }

  get applicationFee(): Nullable<string> {
    return this.fees.application;
  }

  get applicationFeeText(): string {
    return this.t('card.applicationFee', { 0: this.applicationFee });
  }

  private openX1(): void {
    this.showX1Dialog = true;
  }

  private bridgeTokens(): void {
    if (!this.isEuroBalanceEnough) {
      router.push({ name: PageNames.Bridge, params: { amount: this.xorToDeposit.toString() } });
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

<style lang="scss">
.sora-card {
  &__threshold {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .logo {
      margin-top: calc(--s-size-small * -1);
      margin-bottom: $inner-spacing-big;
    }

    &-title {
      text-transform: none;
      margin: 0 80px;
      text-align: center;
      margin-bottom: $inner-spacing-big;
    }
  }
  &__application-fee-disclaimer {
    background-color: var(--s-color-base-border-primary);
    padding: 16px;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-border-radius-mini) / 2);
    width: 100%;

    p:nth-child(1) {
      font-size: var(--s-font-size-big);
      margin-bottom: 4px;
      font-weight: 500;
    }
    p:nth-child(2) {
      font-size: var(--s-font-size-small);
      margin-bottom: 4px;
    }
    p:nth-child(3) {
      font-size: var(--s-font-size-small);
      color: #efac47;
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

  &-payment {
    .delimiter {
      display: flex;
      flex-direction: row;
      color: var(--s-color-base-content-secondary);
      text-transform: uppercase;
      margin-top: $basic-spacing;
      margin-bottom: $basic-spacing;
    }
    .delimiter::before,
    .delimiter::after {
      content: '';
      flex: 1 1;
      border-bottom: 2px solid var(--s-color-base-border-primary);
      margin: auto;
    }
    .delimiter :before {
      margin-right: $basic-spacing;
    }
    .delimiter :after {
      margin-left: $basic-spacing;
    }
  }
}
</style>
