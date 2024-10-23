<template>
  <div class="container sora-card">
    <s-image src="card/sora-card.png" lazy fit="cover" draggable="false" class="unselectable sora-card__image" />

    <template v-if="maintenance">
      <div class="sora-card__intro">
        <h3 class="sora-card__intro-title maintenance">{{ MaintenanceTitle }}</h3>
      </div>
      <div class="sora-card__info maintenance-desc">
        <div class="sora-card__info-text">
          <h4 class="sora-card__info-text">{{ MaintenanceDesc }}</h4>
          <div class="maintenance-desc__links">
            <a :href="MaintenanceStoreLinks.AppStore" target="_blank" rel="nofollow noopener" tabindex="-1">
              <s-button class="logo logo__app-store">App Store</s-button>
            </a>
            <a :href="MaintenanceStoreLinks.GooglePlay" target="_blank" rel="nofollow noopener" tabindex="-1">
              <s-button class="logo logo__google-play">Google Play</s-button>
            </a>
          </div>
        </div>
        <div class="maintenance-desc__mobile">
          <img src="@/assets/img/mobile/sora-app-left.png" alt="mobile-left" class="left-image" />
          <img src="@/assets/img/mobile/qr-code.svg?inline" alt="qr-code" class="qr-code" />
          <img src="@/assets/img/mobile/sora-app-right.png" alt="mobile-right" class="right-image" />
        </div>
      </div>
    </template>

    <template v-else>
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
        <span v-button class="sora-card__unsupported-countries-disclaimer--link" @click="openList">{{
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
    </template>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { Components, StoreLinks } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

enum BuyButtonType {
  Bridge,
}
type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

@Component({
  components: {
    TosDialog: lazyComponent(Components.ToSDialog),
    BalanceIndicator: lazyComponent(Components.BalanceIndicator),
  },
})
export default class SoraCardIntroPage extends Mixins(mixins.LoadingMixin, InternalConnectMixin) {
  readonly MaintenanceStoreLinks = StoreLinks;
  readonly MaintenanceTitle = 'Web applications are under maintenance';
  readonly MaintenanceDesc = 'SORA Card is currently available in the SORA Wallet. Download to apply.';
  readonly buyOptions: Array<BuyButton> = [
    { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'secondary' },
  ];

  @Prop({ type: Boolean, default: false }) maintenance!: boolean;

  @state.soraCard.wasEuroBalanceLoaded wasEuroBalanceLoaded!: boolean;

  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;

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
      this.connectSoraWallet();
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
    border-radius: calc(var(--s-border-radius-mini) / 2);
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
  position: relative;
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
    display: inline-block;
    position: absolute;
    background: var(--s-color-status-info);
    width: 0;
    height: 100%;
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

      &.maintenance {
        text-transform: none;
      }
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

.maintenance-desc {
  display: flex;
  flex-direction: row;
  box-shadow: var(--s-shadow-dialog);

  h4 {
    font-weight: bold;
  }

  &__links {
    margin-top: $basic-spacing;
  }

  @include mobile-app-logos;

  .logo {
    margin-bottom: $inner-spacing-mini;
  }

  &__mobile {
    display: flex;
    position: relative;
    .qr-code {
      width: 165px;
      height: 165px;
      position: absolute;
      left: 24px;
      border-radius: 8%;
      z-index: 1;
    }
    .left-image {
      height: 152px;
      width: 95px;
      opacity: 0.6;
    }
    .right-image {
      height: 136px;
      width: 78px;
      margin-top: 16px;
      opacity: 0.6;
    }
  }
}
</style>
