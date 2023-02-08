<template>
  <div class="container sora-card">
    <s-image src="card/sora-card.png" lazy fit="cover" draggable="false" class="unselectable sora-card__image" />
    <div class="sora-card__intro">
      <h3 class="sora-card__intro-title">Get SORA Card</h3>
      <span class="sora-card__intro-info">
        Top up SORA Card with fiat or crypto and pay online, in-store or withdraw in ATM. Get Euro IBAN account and
        Mastercard Debit Card.
      </span>
    </div>
    <div v-if="isLoggedIn" class="sora-card__balance-indicator">
      <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
      <p class="sora-card__balance-indicator-text">
        <span class="sora-card__balance-indicator-text--bold">€0</span> annual re-issuance fee
      </p>
    </div>
    <div v-if="isPriceCalculated && isLoggedIn" class="sora-card__balance-indicator">
      <s-icon :class="getIconClass()" name="basic-check-mark-24" size="16px" />
      <p class="sora-card__balance-indicator-text">
        <span class="sora-card__balance-indicator-text--bold">{{ balanceIndicatorAmount }}</span> of XOR in your account
        for free start
      </p>
    </div>
    <div class="sora-card__options">
      <div v-if="isEuroBalanceEnough || !isLoggedIn" class="sora-card__options--enough-euro">
        <s-button
          type="primary"
          class="sora-card__btn s-typography-button--large"
          :loading="btnLoading"
          @click="handleConfirm"
        >
          <span class="text"> {{ buttonText }}</span>
        </s-button>
      </div>
      <div class="sora-card__options--not-enough-euro" v-else>
        <s-button
          type="primary"
          class="sora-card__btn sora-card__btn--fiat-buy s-typography-button--large"
          :loading="btnLoading"
          @click="openX1"
        >
          <span class="text">BUY XOR WITH FIAT</span>
        </s-button>
        <s-button class="sora-card__btn--bridge s-typography-button--large" :loading="btnLoading" @click="bridgeTokens">
          <span class="text">BRIDGE TOKENS</span>
        </s-button>
        <!-- TODO: bring back when option becomes available<p class="line">OR</p>
        <s-button
          type="tertiary"
          class="sora-card__btn--fiat-issuance s-typography-button--large"
          :loading="btnLoading"
          @click="issueCardByPaywings"
        >
          <span class="text">ISSUE CARD FOR €12</span>
        </s-button> -->
      </div>
    </div>
    <span v-if="isLoggedIn" @click="loginUser" class="sora-card__user-applied">I've already applied</span>
    <x1-dialog :visible.sync="showX1Dialog" />
    <paywings-dialog :visible.sync="showPaywingsDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { getter, state } from '@/store/decorators';
import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { delay } from '@/utils';
import { clearTokensFromSessionStorage } from '@/utils/card';
import TranslationMixin from '../mixins/TranslationMixin';

@Component({
  components: {
    X1Dialog: lazyComponent(Components.X1Dialog),
    PaywingsDialog: lazyComponent(Components.PaywingsDialog),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  isPriceCalculated = false;
  showX1Dialog = false;
  showPaywingsDialog = false;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }

    return 'GET SORA CARD FOR FREE';
  }

  get balanceIndicatorAmount(): string {
    const euroBalance = parseInt(this.euroBalance, 10);
    return `€${this.isEuroBalanceEnough ? '100' : euroBalance}/100`;
  }

  getIconClass(): string {
    if (this.isEuroBalanceEnough) {
      return 'sora-card__icon--checked';
    }
    return '';
  }

  get btnLoading(): boolean {
    return this.loading || !this.isPriceCalculated;
  }

  openX1(): void {
    this.showX1Dialog = true;
  }

  bridgeTokens(): void {
    if (!this.isEuroBalanceEnough) {
      router.push({ name: PageNames.Bridge, params: { xorToDeposit: this.xorToDeposit.toString() } });
    }
  }

  issueCardByPaywings(): void {
    this.showPaywingsDialog = true;
  }

  handleConfirm(): void {
    if (!this.isLoggedIn) {
      router.push({ name: PageNames.Wallet });
      return;
    }

    this.$emit('confirm-apply');
  }

  loginUser(): void {
    clearTokensFromSessionStorage();
    const userApplied = true;
    this.$emit('confirm-apply', userApplied);
  }

  async priceLoading(): Promise<void> {
    this.isPriceCalculated = false;
    // TODO: write logic to do actual check for price calculations
    await delay(700); // don't allow user do too preliminary click before its balance calculated
    this.isPriceCalculated = true;
  }

  mounted(): void {
    this.priceLoading();
  }
}
</script>

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
    &--fiat-buy,
    &--bridge {
      width: 48%;
      .text {
        font-size: var(--s-heading4-font-size);
      }
    }
    &--fiat-issuance {
      width: 100%;
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
