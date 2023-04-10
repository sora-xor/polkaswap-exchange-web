<template>
  <div>
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
        <el-popover popper-class="settings-alert-popover" trigger="click" :visible-arrow="false">
          <div class="settings-alert-option" @click="handleEditAlert(alert, index)">
            <s-icon name="el-icon-edit" />
            <span>Edit alert</span>
          </div>
          <div class="settings-alert-option" @click="handleDeleteAlert(index)">
            <s-icon name="el-icon-delete" />
            <span>Delete alert</span>
          </div>
          <div slot="reference">
            <s-icon class="options-icon" name="basic-more-vertical-24" />
          </div>
        </el-popover>
      </account-card>
      <div v-if="alerts.length" class="line" />
    </div>
    <div v-if="showCreateAlertBtn" class="settings-alert-section">
      <s-button class="el-dialog__close" type="action" icon="plus-16" @click="handleCreateAlert" />
      <span class="create">Create new price alert</span>
    </div>
    <div class="settings-alert-section">
      <s-switch v-model="topUpNotifs" :disabled="loading" @change="handleTopUpNotifs"></s-switch>
      <span>{{ 'Enable incoming asset deposit notifications' }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { getter, mutation, state } from '@/store/decorators';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import type { Alert } from '@/types/alert';
import { WhitelistIdsBySymbol } from '@soramitsu/soraneo-wallet-web/lib/types/common';
import { AccountAsset } from '@sora-substrate/util/build/assets/types';
import { FPNumber } from '@sora-substrate/math';
import { MAX_ALERTS_NUMBER } from '@/consts';

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
  @state.wallet.settings.allowTopUpAlert allowTopUpAlert!: boolean;
  @state.settings.isBrowserNotificationApiAvailable isBrowserNotificationApiAvailable!: boolean;

  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WhitelistIdsBySymbol;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => AccountAsset;

  @mutation.wallet.settings.removePriceAlert removePriceAlert!: (position: number) => void;
  @mutation.wallet.settings.setDepositNotifications private setDepositNotifications!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupEnabled private setBrowserNotifsPopupEnabled!: (flag: boolean) => void;
  @mutation.settings.setBrowserNotifsPopupBlocked private setBrowserNotifsPopupBlocked!: (flag: boolean) => void;

  topUpNotifs: Nullable<boolean> = null;

  get showCreateAlertBtn(): boolean {
    return this.alerts.length < MAX_ALERTS_NUMBER;
  }

  isNotificationsEnabledByUser(): boolean {
    if (this.isBrowserNotificationApiAvailable) {
      if (Notification.permission === 'denied') {
        this.setBrowserNotifsPopupBlocked(true);
        return false;
      } else if (Notification.permission === 'default') {
        this.setBrowserNotifsPopupEnabled(true);
        return false;
      }
      return true;
    } else {
      this.showAppNotification("Notifications aren't supported by your browser", 'error');
      return false;
    }
  }

  getDescription(alert: Alert) {
    if (alert.type === 'onDrop') return `${alert.token} drops below ${alert.price}`;
    return `${alert.token} raises above ${alert.price}`;
  }

  getInfo(alert: Alert) {
    const asset = this.getAsset(this.whitelistIdsBySymbol[alert.token]);
    const value = this.getFiatAmount('1', asset);
    if (!value) return;
    const [integer, decimal = '00'] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);
    const deltaPercent = this.getDeltaPercent(29, 34);
    return `${deltaPercent}% · current price: $${integer}.${decimal.substring(0, 2)}`;
  }

  getDeltaPercent(currentPrice, desiredPrice): string {
    return '20.3';
  }

  handleCreateAlert(): void {
    if (!this.isNotificationsEnabledByUser()) return;
    this.$emit('create');
  }

  handleDeleteAlert(position: number): void {
    this.removePriceAlert(position);
  }

  handleEditAlert(alert: Alert, position: number): void {
    this.$emit('edit-alert', { ...alert, position });
  }

  handleTopUpNotifs(value): void {
    this.isNotificationsEnabledByUser();
    this.setDepositNotifications(value);
  }

  mounted(): void {
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
</style>

<style lang="scss" scoped>
.alerts-list {
  &__item {
    margin-bottom: $inner-spacing-mini;
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
    font-size: $basic-spacing;
    line-height: 150%;
    letter-spacing: -0.02em;

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

.line {
  width: 100%;
  height: 1px;
  margin: $basic-spacing 0;
  background-color: var(--s-color-base-content-tertiary);
}
</style>
