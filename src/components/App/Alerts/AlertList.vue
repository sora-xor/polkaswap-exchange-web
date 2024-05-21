<template>
  <div>
    <s-scrollbar class="alerts-list-scrollbar" :key="scrollKey">
      <div class="alerts-list">
        <account-card v-for="(alert, index) in alerts" :key="index" class="alerts-list__item" v-button>
          <template #avatar>
            <token-logo :tokenSymbol="alert.token" />
          </template>
          <template #name>
            <span class="condition">{{ getDescription(alert) }}</span>
          </template>
          <template #description>
            <span class="current-price">{{ getInfo(alert) }}</span>
          </template>
          <div class="alerts-list__type">{{ getType(alert) }}</div>
          <el-popover
            :ref="'alertMenu' + index"
            popper-class="settings-alert-popover"
            trigger="click"
            :visible-arrow="false"
          >
            <div class="settings-alert-option" @click="handleEditAlert(alert, index)">
              <s-icon name="el-icon-edit" />
              <span>{{ t('alerts.edit') }}</span>
            </div>
            <div class="settings-alert-option" @click="handleDeleteAlert(index)">
              <s-icon name="el-icon-delete" />
              <span>{{ t('alerts.delete') }}</span>
            </div>
            <div slot="reference">
              <s-icon class="options-icon" name="basic-more-vertical-24" />
            </div>
          </el-popover>
        </account-card>
      </div>
    </s-scrollbar>
    <s-divider v-if="alerts.length" />
    <div v-if="showCreateAlertBtn" class="settings-alert-section">
      <s-button class="el-dialog__close" type="action" icon="plus-16" @click="handleCreateAlert" :disabled="loading" />
      <span class="create">{{ t('alerts.createBtn') }}</span>
    </div>
    <div class="settings-alert-section">
      <s-switch v-model="topUpNotifs" :disabled="loading" @change="handleTopUpNotifs" />
      <span>{{ t('alerts.enableSwitch') }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { ZeroStringValue } from '@/consts';
import { getter, mutation, state } from '@/store/decorators';
import { calcPriceChange, showMostFittingValue, toPrecision } from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Alert, WhitelistIdsBySymbol } from '@soramitsu/soraneo-wallet-web/lib/types/common';

@Component({
  components: {
    AccountCard: components.AccountCard,
    TokenLogo: components.TokenLogo,
  },
})
export default class AlertList extends Mixins(
  mixins.TranslationMixin,
  mixins.LoadingMixin,
  mixins.NotificationMixin,
  mixins.FormattedAmountMixin
) {
  @state.wallet.settings.alerts alerts!: Array<Alert>;
  @state.wallet.settings.allowTopUpAlert private allowTopUpAlert!: boolean;
  @state.settings.isBrowserNotificationApiAvailable private isBrowserNotificationApiAvailable!: boolean;

  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WhitelistIdsBySymbol;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => AccountAsset;

  @mutation.wallet.settings.removePriceAlert private removePriceAlert!: (position: number) => void;
  @mutation.wallet.settings.setDepositNotifications private setDepositNotifications!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupEnabled private setBrowserNotifsPopupEnabled!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupBlocked private setBrowserNotifsPopupBlocked!: (flag: boolean) => void;
  /** This key is needed for force re-rendering of the scrollbar component while getting rid of alerts */
  scrollKey = 0;
  topUpNotifs: Nullable<boolean> = null;

  get showCreateAlertBtn(): boolean {
    return this.alerts.length < WALLET_CONSTS.MAX_ALERTS_NUMBER;
  }

  isNotificationsEnabledByUser(): boolean {
    if (!this.isBrowserNotificationApiAvailable) {
      this.showAppNotification(this.t('alerts.noSupportMsg'), 'error');
      return false;
    }

    switch (Notification.permission) {
      case 'denied':
        this.setBrowserNotifsPopupBlocked(true);
        return false;
      case 'default':
        this.setBrowserNotifsPopupEnabled(true);
        return false;
      default:
        return true;
    }
  }

  getDescription(alert: Alert) {
    return alert.type === 'drop'
      ? this.t('alerts.onDropDesc', { token: alert.token, price: `$${alert.price}` })
      : this.t('alerts.onRaiseDesc', { token: alert.token, price: `$${alert.price}` });
  }

  getInfo(alert: Alert): string | undefined {
    const desiredPrice = new FPNumber(alert.price);
    const asset = this.getAsset(this.whitelistIdsBySymbol[alert.token]);
    const currentPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(asset) ?? ZeroStringValue);
    const priceChange = calcPriceChange(desiredPrice, currentPrice);
    const priceChangeFormatted = toPrecision(priceChange, 2).toString();
    const currentPriceFormatted = showMostFittingValue(currentPrice);

    return `${priceChangeFormatted}% · ${this.t('alerts.currentPrice')}: $${currentPriceFormatted}`;
  }

  /** Re-center dialog programmatically (need to simplify it). Components lazy loading might break it */
  private async recenterDialog(): Promise<void> {
    await this.$nextTick();
    const sDialog: any = this.$parent?.$parent;
    sDialog?.computeTop?.();
  }

  /** Force close menu if it wasn't closed */
  private forceCloseAlertMenu(index: number): void {
    this.$refs['alertMenu' + index]?.[0]?.doClose?.();
  }

  getType(alert: Alert) {
    return alert.once ? this.t('alerts.once') : this.t('alerts.always');
  }

  handleCreateAlert(): void {
    if (!this.isNotificationsEnabledByUser()) return;
    this.$emit('create');
  }

  private scrollForceUpdate(): void {
    this.scrollKey++;
  }

  handleDeleteAlert(position: number): void {
    this.removePriceAlert(position);
    this.forceCloseAlertMenu(position);
    this.recenterDialog();
    this.scrollForceUpdate();
  }

  handleEditAlert(alert: Alert, position: number): void {
    this.$emit('edit-alert', { ...alert, position });
    this.forceCloseAlertMenu(position);
  }

  handleTopUpNotifs(value: boolean): void {
    this.isNotificationsEnabledByUser();
    this.setDepositNotifications(value);
  }

  mounted(): void {
    this.recenterDialog();

    if (Notification.permission !== 'granted') {
      this.setDepositNotifications(false);
    }

    this.topUpNotifs = this.allowTopUpAlert;
  }
}
</script>

<style lang="scss">
.settings-alert-popover {
  background-color: var(--s-color-utility-body);
  border-radius: $basic-spacing;
  color: var(--s-color-base-content-primary);
  border: none;
  padding: $basic-spacing $inner-spacing-mini $basic-spacing $basic-spacing;
  font-size: var(--s-font-size-small);
}
.alerts-list-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$item-height: 66px;
$list-items: 5;
.alerts-list {
  max-height: calc(#{$item-height} * #{$list-items} + 16px);

  &__item {
    margin: 0 $inner-spacing-big $inner-spacing-mini;
  }

  &__type {
    border-radius: calc(var(--s-border-radius-mini) / 2);
    padding: $inner-spacing-mini;
    background-color: var(--s-color-utility-surface);
    color: var(--s-color-base-content-secondary);
    &:hover {
      cursor: default;
    }
  }
  span.condition {
    font-weight: 400;
  }

  span.current-price {
    color: var(--s-color-status-info);
  }

  .options-icon {
    color: var(--s-color-base-content-tertiary);
    &:hover {
      cursor: pointer;
    }
  }
}

.settings-alert {
  &-section {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 calc(var(--s-basic-spacing) * 1.5);
    margin-bottom: $basic-spacing;

    span {
      margin-left: calc(var(--s-basic-spacing) * 1.5);
      font-size: var(--s-font-size-medium);
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
    }

    span.create {
      font-weight: 450;
    }
  }

  &-option {
    font-weight: 300;
    font-size: var(--s-font-size-medium);
    line-height: 150%;
    letter-spacing: var(--s-letter-spacing-small);

    span {
      margin-left: $inner-spacing-mini;
    }

    &:hover {
      cursor: pointer;
    }

    &:hover i {
      cursor: pointer;
      color: var(--s-color-base-content-primary);
    }

    i {
      color: var(--s-color-base-content-secondary);
    }
  }
}
</style>
