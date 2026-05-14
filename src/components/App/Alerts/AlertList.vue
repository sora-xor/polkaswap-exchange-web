<template>
  <div>
    <s-scrollbar class="alerts-list-scrollbar" :key="scrollKey">
      <div class="alerts-list">
        <account-card v-for="(alert, index) in alerts" :key="index" class="alerts-list__item" v-button>
          <template #avatar>
            <token-logo :token-symbol="alert.token"></token-logo>
          </template>
          <template #name>
            <span class="condition">{{ getDescription(alert) }}</span>
          </template>
          <template #description>
            <span class="current-price">{{ getInfo(alert) }}</span>
          </template>
          <div class="alerts-list__type">{{ getType(alert) }}</div>
          <s-popover-panel
            :ref="(el) => setAlertMenuRef(el, index)"
            popper-class="settings-alert-popover"
            trigger="click"
            :visible-arrow="false"
          >
            <div v-button class="settings-alert-option" @click="handleEditAlert(alert, index)">
              <s-icon name="el-icon-edit"></s-icon>
              <span>{{ t('alerts.edit') }}</span>
            </div>
            <div v-button class="settings-alert-option" @click="handleDeleteAlert(index)">
              <s-icon name="el-icon-delete"></s-icon>
              <span>{{ t('alerts.delete') }}</span>
            </div>
            <template #reference>
              <s-icon class="options-icon" name="basic-more-vertical-24"></s-icon>
            </template>
          </s-popover-panel>
        </account-card>
      </div>
    </s-scrollbar>
    <s-divider v-if="alerts.length"></s-divider>
    <div v-if="showCreateAlertBtn" class="settings-alert-section">
      <s-button
        class="el-dialog__close"
        type="action"
        icon="plus-16"
        @click="handleCreateAlert"
        :aria-label="t('alerts.createBtn')"
        :disabled="loading"
      ></s-button>
      <span class="create">{{ t('alerts.createBtn') }}</span>
    </div>
    <div class="settings-alert-section">
      <s-switch v-model="topUpNotifs" :disabled="loading" @change="handleTopUpNotifs"></s-switch>
      <span>{{ t('alerts.enableSwitch') }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import { MAX_ALERTS_NUMBER, ZeroStringValue } from '@/consts';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { calcPriceChange, showMostFittingValue, toPrecision } from '@/utils';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Alert, WhitelistIdsBySymbol } from '@/lib/soraneo-wallet/src/types/common';
import WalletComponentAccountCard from '@/lib/soraneo-wallet/src/components/Account/AccountCard.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

defineOptions({
  components: {
    AccountCard: WalletComponentAccountCard,
    TokenLogo: WalletComponentTokenLogo,
  },
});

const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit-alert', payload: Alert & { position: number }): void;
}>();

const { t } = useTranslation();
const { showAppNotification } = useNotification();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const alerts = computed(() => (settingsStore.alerts as Array<Alert>) ?? []);
const allowTopUpAlert = computed(() => Boolean(settingsStore.allowTopUpAlert));
const isBrowserNotificationApiAvailable = computed(() => settingsStore.isBrowserNotificationApiAvailable);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol as WhitelistIdsBySymbol);
const getAsset = assetsStore.assetDataByAddress as (addr?: string) => AccountAsset;

const loading = ref(false);
const scrollKey = ref(0);
const topUpNotifs = ref<Nullable<boolean>>(null);
const alertMenuRefs = reactive<Record<number, any>>({});

const showCreateAlertBtn = computed(() => alerts.value.length < MAX_ALERTS_NUMBER);

function setAlertMenuRef(el: any, index: number): void {
  if (el) {
    alertMenuRefs[index] = el;
  } else {
    delete alertMenuRefs[index];
  }
}

function isNotificationsEnabledByUser(): boolean {
  if (!isBrowserNotificationApiAvailable.value) {
    showAppNotification(t('alerts.noSupportMsg'), 'error');
    return false;
  }

  switch (Notification.permission) {
    case 'denied':
      settingsStore.setBrowserNotifsPopupBlocked(true);
      return false;
    case 'default':
      settingsStore.setBrowserNotifsPopupEnabled(true);
      return false;
    default:
      return true;
  }
}

function getDescription(alert: Alert) {
  return alert.type === 'drop'
    ? t('alerts.onDropDesc', { token: alert.token, price: `$${alert.price}` })
    : t('alerts.onRaiseDesc', { token: alert.token, price: `$${alert.price}` });
}

function getInfo(alert: Alert): string | undefined {
  const desiredPrice = new FPNumber(alert.price);
  const asset = getAsset(whitelistIdsBySymbol.value[alert.token]);
  const currentPrice = FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue);
  const priceChange = calcPriceChange(desiredPrice, currentPrice);
  const priceChangeFormatted = toPrecision(priceChange, 2).toString();
  const currentPriceFormatted = showMostFittingValue(currentPrice);

  return `${priceChangeFormatted}% · ${t('alerts.currentPrice')}: $${currentPriceFormatted}`;
}

function getType(alert: Alert) {
  return alert.once ? t('alerts.once') : t('alerts.always');
}

function closeAlertMenu(index: number): void {
  alertMenuRefs[index]?.doClose?.();
}

function forceScrollUpdate(): void {
  scrollKey.value += 1;
}

function handleCreateAlert(): void {
  if (!isNotificationsEnabledByUser()) return;
  emit('create');
}

function handleDeleteAlert(position: number): void {
  settingsStore.removePriceAlert(position);
  closeAlertMenu(position);
  forceScrollUpdate();
}

function handleEditAlert(alert: Alert, position: number): void {
  emit('edit-alert', { ...alert, position });
  closeAlertMenu(position);
}

function handleTopUpNotifs(value: boolean): void {
  isNotificationsEnabledByUser();
  settingsStore.setDepositNotifications(value);
}

function getAssetFiatPrice(asset: AccountAsset | undefined): Nullable<string> {
  if (!asset) return null;
  return (walletStore.fiatPriceObject as Record<string, string> | undefined)?.[asset.address] ?? null;
}

onMounted(() => {
  if (Notification.permission !== 'granted') {
    settingsStore.setDepositNotifications(false);
  }

  topUpNotifs.value = allowTopUpAlert.value;
});

watch(
  allowTopUpAlert,
  (value) => {
    topUpNotifs.value = value;
  },
  { immediate: false }
);
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
