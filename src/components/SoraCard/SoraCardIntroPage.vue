<template>
  <div class="container sora-card">
    <s-image src="card/sora-card.png" lazy fit="cover" draggable="false" class="unselectable sora-card__image" />
    <div class="sora-card__intro">
      <h3 class="sora-card__intro-title">{{ t('card.getSoraCardTitle') }}</h3>
      <span class="sora-card__intro-info">
        {{ t('card.getSoraCardDesc') }}
      </span>
    </div>
    <div v-if="isLoggedIn" class="sora-card__balance-indicator">
      <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
      <p class="sora-card__balance-indicator-text">
        <span class="sora-card__balance-indicator-text--bold">{{ t('card.reIssuanceFee') }}</span>
      </p>
    </div>
    <div v-if="wasEuroBalanceLoaded && isLoggedIn" class="sora-card__balance-indicator">
      <s-icon :class="getIconClass()" name="basic-check-mark-24" size="16px" />
      <p class="sora-card__balance-indicator-text" v-html="freeStartUsingDesc" />
    </div>
    <div class="sora-card__options" v-loading="isLoggedIn && !wasEuroBalanceLoaded">
      <div v-if="isEuroBalanceEnough || !isLoggedIn" class="sora-card__options--enough-euro">
        <s-button
          type="primary"
          class="sora-card__btn s-typography-button--large"
          :loading="btnLoading"
          @click="handleConfirm"
        >
          <span class="text"> {{ t(buttonText) }}</span>
        </s-button>
      </div>
      <div v-else class="sora-card__options--not-enough-euro s-flex">
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
    </div>
    <span v-if="isLoggedIn" @click="loginUser" class="sora-card__user-applied">{{ t('card.alreadyAppliedTip') }}</span>
    <x1-dialog :visible.sync="showX1Dialog" />
    <paywings-dialog :visible.sync="showPaywingsDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { getter, state } from '@/store/decorators';
import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { clearTokensFromLocalStorage } from '@/utils/card';
import TranslationMixin from '@/components/mixins/TranslationMixin';

enum BuyButtonType {
  X1,
  Bridge,
  Paywings,
}
type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };
const hundred = '100';

@Component({
  components: {
    X1Dialog: lazyComponent(Components.X1Dialog),
    PaywingsDialog: lazyComponent(Components.PaywingsDialog),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.X1, text: 'card.depositX1Btn', button: 'primary' },
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
    // TODO: [CARD] bring back when option becomes available & check this translation key below
    // { type: BuyButtonType.Paywings, text: 'card.buyUsingPaywings', button: 'tertiary' },
  ];

  @state.soraCard.euroBalance private euroBalance!: string;
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showX1Dialog = false;
  showPaywingsDialog = false;

  get freeStartUsingDesc(): string {
    if (!this.euroBalance) {
      return '';
    }
    return this.t('card.freeStartDesc', { value: this.balanceIndicatorAmount });
  }

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    return 'card.getSoraCardBtn';
  }

  get balanceIndicatorAmount(): string {
    const euroBalance = parseInt(this.euroBalance, 10);
    return `<span class="sora-card__balance-indicator-text--bold">€${
      this.isEuroBalanceEnough ? hundred : euroBalance
    }/${hundred}</span>`;
  }

  getIconClass(): string {
    if (this.isEuroBalanceEnough) {
      return 'sora-card__icon--checked';
    }
    return '';
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

  private issueCardByPaywings(): void {
    this.showPaywingsDialog = true;
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
      case BuyButtonType.Paywings:
        this.issueCardByPaywings();
        break;
    }
  }

  handleConfirm(): void {
    if (!this.isLoggedIn) {
      router.push({ name: PageNames.Wallet });
      return;
    }

    this.$emit('confirm-apply');
  }

  loginUser(): void {
    clearTokensFromLocalStorage();
    const userApplied = true;
    this.$emit('confirm-apply', userApplied);
  }
}
</script>

<style lang="scss">
.sora-card__options {
  .el-loading-mask {
    padding: 0px 20px 20px;
    margin: 0 -20px -20px;
    background-color: var(--s-color-utility-surface);
    .el-loading-spinner {
      margin-left: calc(50% - var(--s-size-medium) + 10px / 2);
    }
  }
}

.sora-card__balance-indicator-text--bold {
  font-weight: 600;
}
</style>

<style lang="scss" scoped>
.sora-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 520px;
  margin-top: 30px;

  &__intro {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &-title {
      width: 85%;
      text-align: center;
      font-weight: 600;
      margin-top: var(--s-size-mini);
      font-size: 28px;
    }

    &-info {
      margin-top: $basic-spacing;
      margin-bottom: 20px;
      font-weight: 300;
      line-height: 19px;
      width: 90%;
      text-align: center;
      padding-inline: 10px;
    }
  }

  &__options {
    width: 100%;
  }

  &__user-applied {
    margin-top: 24px;
    color: var(--s-color-base-content-secondary);
    padding-bottom: calc(var(--s-basic-spacing) / 2);
    border-bottom: 1px solid var(--s-color-base-content-secondary);
    &:hover {
      cursor: pointer;
    }
  }

  &__image {
    margin-top: -56px;
    height: 311px;
  }

  &__balance-indicator {
    background-color: var(--s-color-base-border-primary);
    padding: calc(var(--s-basic-spacing) / 2) var(--s-basic-spacing);
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-basic-spacing) / 2);
    &-text {
      display: inline-block;
      font-size: var(--s-font-size-small);
      &--bold {
        font-weight: 600;
      }
    }

    .s-icon-basic-check-mark-24 {
      margin-right: var(--s-basic-spacing);
      color: var(--s-color-base-content-tertiary);
    }

    .sora-card__icon--checked {
      color: var(--s-color-theme-accent);
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

.line {
  width: 100%;
  display: flex;
  margin-top: var(--s-basic-spacing);
  margin-bottom: var(--s-basic-spacing);
  flex-direction: row;
  text-transform: uppercase;
  color: var(--s-color-base-content-secondary);
}

.line::before,
.line::after {
  content: '';
  flex: 1 1;
  border-bottom: 2px solid var(--s-color-base-border-primary);
  margin: auto;
  margin-left: 10px;
  margin-right: 10px;
}
</style>
