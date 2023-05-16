<template>
  <div class="sora-card-intro">
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
          <span class="sora-card__balance-indicator-text--bold">{{ '$0 annual service fee' }}</span>
        </p>
      </div>
      <div v-if="wasEuroBalanceLoaded && isLoggedIn" class="sora-card__balance-indicator">
        <s-icon :class="getIconClass()" name="basic-check-mark-24" size="16px" />
        <p class="sora-card__balance-indicator-text">Free card issuance</p>
        <p>You hold $100 worth of XOR in your SORA Account</p>
      </div>
      <div class="sora-card__options" v-loading="isLoggedIn && !wasEuroBalanceLoaded">
        <s-button
          type="primary"
          class="sora-card__btn s-typography-button--large"
          :loading="btnLoading"
          @click="handleClick"
        >
          <span class="text"> {{ 'Log in or Sign up' }}</span>
        </s-button>
      </div>
    </div>
    <div class="sora-card__unsupported-countries-disclaimer">
      {{ t('card.unsupportedCountriesDisclaimer') }}
      <span class="sora-card__unsupported-countries-disclaimer--link" @click="openList">{{
        t('card.unsupportedCountriesLink')
      }}</span>
    </div>
    <tos-dialog :visible.sync="showListDialog" :title="t('card.unsupportedCountries')" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { getter, state } from '@/store/decorators';
import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { clearPayWingsKeysFromLocalStorage, clearTokensFromLocalStorage } from '@/utils/card';
import TranslationMixin from '@/components/mixins/TranslationMixin';

const hundred = '100';

@Component({
  components: {
    X1Dialog: lazyComponent(Components.X1Dialog),
    PaywingsDialog: lazyComponent(Components.PaywingsDialog),
    TosDialog: lazyComponent(Components.ToSDialog),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showX1Dialog = false;
  showPaywingsDialog = false;
  showListDialog = false;

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

    return false;
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

  openList(): void {
    this.showListDialog = true;
  }

  handleClick(): void {
    if (!this.isLoggedIn) {
      router.push({ name: PageNames.Wallet });
      return;
    }

    this.$emit('confirm-apply');
  }

  mounted(): void {
    clearPayWingsKeysFromLocalStorage();
  }
}
</script>

<style lang="scss">
.sora-card__options {
  .el-loading-mask {
    padding: 0px 20px 20px;
    margin: 0 -20px -2px;
    background-color: var(--s-color-utility-surface);
    .el-loading-spinner {
      margin-left: calc(50% - var(--s-size-medium) + 10px / 2);
    }
  }
}

.sora-card__balance-indicator-text--bold {
  font-size: 24px;
}
</style>

<style lang="scss" scoped>
.sora-card-intro {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sora-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 520px;

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

  &__unsupported-countries-disclaimer {
    position: absolute;
    color: var(--s-color-base-content-secondary);
    text-align: center;
    font-size: 16px;
    bottom: -70px;
    width: 24%;
    line-height: 24px;
    &--link {
      border-bottom: 1px solid;
      &:hover {
        cursor: pointer;
      }
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
    width: 100%;
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
      color: var(--s-color-status-success);
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
