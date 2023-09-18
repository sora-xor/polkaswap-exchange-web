<template>
  <div class="container sora-card">
    <s-image src="card/sora-card.png" lazy fit="cover" draggable="false" class="unselectable sora-card__image" />
    <div class="sora-card__intro">
      <h3 class="sora-card__intro-title">{{ t('card.getSoraCardTitle') }}</h3>
      <span class="sora-card__intro-info">
        {{ t('card.getSoraCardDesc') }}
      </span>
    </div>
    <div v-if="isLoggedIn" class="sora-card__info">
      <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
      <p class="sora-card__info-text">
        <span class="sora-card__info-text">{{ t('card.reIssuanceFee') }}</span>
      </p>
    </div>
    <div v-if="wasEuroBalanceLoaded && isLoggedIn" class="sora-card__balance-indicator">
      <div v-if="isEuroBalanceEnough" class="sora-card__info">
        <div class="sora-card__balance-section">
          <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
          <div>
            <p class="sora-card__info-text">{{ t('card.freeCardIssuance') }}</p>
            <p class="sora-card__info-text-details sora-card__info-text-details--secondary">
              {{ t('card.holdSufficientXor') }}
            </p>
            <span class="progress-bar progress-bar--complete" />
            <p class="sora-card__info-text-details">{{ t('card.gettingCardForFree') }}</p>
          </div>
        </div>
      </div>
      <balance-indicator v-else />
    </div>
    <div class="sora-card__unsupported-countries-disclaimer">
      {{ t('card.unsupportedCountriesDisclaimer') }}
      <span class="sora-card__unsupported-countries-disclaimer--link" @click="openList">{{
        t('card.unsupportedCountriesLink')
      }}</span>
    </div>
    <div class="sora-card__options" v-loading="isLoggedIn && !wasEuroBalanceLoaded">
      <s-button
        type="primary"
        class="sora-card__btn s-typography-button--large"
        :loading="btnLoading"
        @click="handleClick"
      >
        <span class="text"> {{ buttonText }}</span>
      </s-button>
    </div>

    <tos-dialog :visible.sync="showListDialog" :title="t('card.unsupportedCountries')" />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames, Components } from '@/consts';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

enum BuyButtonType {
  X1,
  Bridge,
}
type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

const hundred = '100';

@Component({
  components: {
    X1Dialog: lazyComponent(Components.X1Dialog),
    TosDialog: lazyComponent(Components.ToSDialog),
    BalanceIndicator: lazyComponent(Components.BalanceIndicator),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.X1, text: 'card.depositX1Btn', button: 'primary' },
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
  ];

  @state.soraCard.euroBalance private euroBalance!: string;
  @state.soraCard.xorToDeposit private xorToDeposit!: FPNumber;
  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showListDialog = false;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }

    return this.t('card.loginBtn');
  }

  get btnLoading(): boolean {
    if (!this.isLoggedIn) {
      return this.loading;
    }

    return false;
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
  width: 100%;
  .el-loading-mask {
    padding: 0px 20px 20px;
    margin: 0 -20px -2px;
    background-color: var(--s-color-utility-surface);
    .el-loading-spinner {
      margin-left: calc(50% - var(--s-size-medium) + 10px / 2);
    }
  }
}

.sora-card {
  &__balance-section {
    display: flex;
    flex-direction: row;
  }
  &__info {
    background-color: var(--s-color-base-border-primary);
    padding: $basic-spacing;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-basic-spacing) / 2);
    width: 100%;
    &-text {
      display: inline-block;
      font-size: var(--s-font-size-big);
      &-details {
        margin-top: 4px;
        width: 91%;
        line-height: 150%;
        font-size: var(--s-font-size-big);
      }
      &-details--secondary {
        color: var(--s-color-base-content-secondary);
      }
      &--bold {
        font-weight: 600;
      }
    }
    .sora-card__icon {
      &--checked {
        margin-right: var(--s-basic-spacing);
        color: var(--s-color-status-success);
      }
      &--closed {
        margin-right: var(--s-basic-spacing);
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}
.progress-bar {
  display: block;
  width: 96%;
  height: 4px;
  border-radius: 2px;
  margin: $inner-spacing-mini 0;
  background: #e8e1e1;
  &--complete {
    background: var(--s-color-status-success);
  }
  &--in-progress {
    background: var(--s-color-brand-day);
    width: 0%;
  }
}
</style>

<style lang="scss" scoped>
.sora-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 520px;

  &__info {
    background-color: var(--s-color-base-border-primary);
    padding: $basic-spacing;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-basic-spacing) / 2);
    width: 100%;
    &-text {
      display: inline-block;
      font-size: var(--s-font-size-big);
      &-details {
        margin-top: 4px;
        width: 91%;
        line-height: 150%;
        font-size: var(--s-font-size-big);
      }
      &-details--secondary {
        color: var(--s-color-base-content-secondary);
      }
      &--bold {
        font-weight: 600;
      }
    }
  }

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

  &__unsupported-countries-disclaimer {
    color: var(--s-color-base-content-secondary);
    text-align: center;
    margin-top: var(--s-size-mini);
    width: 75%;
    &--link {
      border-bottom: 1px solid var(--s-color-theme-accent);
      color: var(--s-color-theme-accent);
      &:hover {
        cursor: pointer;
      }
    }
  }

  &__image {
    margin-top: -48px;
    height: 262px;
  }

  &__btn {
    width: 100%;
  }
}
</style>
