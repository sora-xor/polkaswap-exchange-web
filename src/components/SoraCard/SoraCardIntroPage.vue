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
      <div v-if="isLoggedIn" class="sora-card__info">
        <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
        <p class="sora-card__info-text">
          <span class="sora-card__info-text">{{ '$0 annual service fee' }}</span>
        </p>
      </div>
      <div v-if="wasEuroBalanceLoaded && isLoggedIn">
        <div v-if="isEuroBalanceEnough" class="sora-card__info">
          <div class="sora-card__balance-section">
            <s-icon class="sora-card__icon--checked" name="basic-check-mark-24" size="16px" />
            <div>
              <p class="sora-card__info-text">Free card issuance</p>
              <p class="sora-card__info-text-details sora-card__info-text-details--secondary">
                You hold $100 worth of XOR in your SORA Account
              </p>
              <span class="progress-bar progress-bar--complete" />
              <p class="sora-card__info-text-details">You’re getting the card for free!</p>
            </div>
          </div>
        </div>
        <balance-indicator v-else />
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
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { getter, state } from '@/store/decorators';
import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';
import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    BalanceIndicator: lazyComponent(Components.BalanceIndicator),
    TosDialog: lazyComponent(Components.ToSDialog),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  showX1Dialog = false;
  showPaywingsDialog = false;
  showListDialog = false;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }

    return 'Log in or Sign up';
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
    padding: 16px;
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
  border-radius: 16px;
  margin: 8px 0;
  background: #e8e1e1;

  &--complete {
    background: #34ad87;
  }

  &--in-progress {
    display: block;
    border-radius: 16px;
    background: #a19a9d;
    height: 4px;
    width: 0%;
  }
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

  &__btn {
    width: 100%;
  }
}
</style>
