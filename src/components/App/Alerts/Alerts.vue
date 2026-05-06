<template>
  <div>
    <dialog-base
      v-model:visible="showAlertsPopup"
      :title="title"
      :show-back="showBack"
      :tooltip="t('alerts.alertsTooltip')"
      @back="handleBack"
    >
      <alert-list v-if="step === AlertPages.AlertList" @create="handleCreate" @edit-alert="handleEdit"></alert-list>
      <create-alert
        v-else
        @back="handleBack"
        @open-select-token="openSelectTokenDialog"
        :alert-to-edit="alertToEdit"
        @select-asset="selectAsset"
      ></create-alert>
    </dialog-base>
    <alerts-select-asset
      v-model:visible="showAlertSelectTokenDialog"
      disabled-custom
      @select="selectAsset"
    ></alerts-select-asset>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { AlertList, AlertsSelectToken, CreateAlert } from '@/app/shell/components';
import { useTranslation } from '@/composables/useTranslation';
import type { NumberedAlert } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';

enum AlertPages {
  AlertList,
  CreateAlert,
}

const DialogBase = WalletComponentDialogBase;

const settingsStore = useSettingsStore();

const { t } = useTranslation();

const step = ref(AlertPages.AlertList);
const alertToEdit = ref<Nullable<NumberedAlert>>(null);
const showAlertSelectTokenDialog = ref(false);
const pendingAsset = ref<AccountAsset | null>(null);

const showAlertsPopup = computed({
  get: () => settingsStore.alertSettingsVisibility,
  set: (flag: boolean) => settingsStore.setAlertSettingsPopup(flag),
});

const title = computed(() =>
  step.value === AlertPages.CreateAlert ? t('alerts.alertsCreateTitle') : t('alerts.alertsTitle')
);

const showBack = computed(() => step.value === AlertPages.CreateAlert);

function openSelectTokenDialog(): void {
  showAlertSelectTokenDialog.value = true;
}

function handleCreate(): void {
  alertToEdit.value = null;
  step.value = AlertPages.CreateAlert;
}

function handleEdit(alert: NumberedAlert): void {
  alertToEdit.value = alert;
  step.value = AlertPages.CreateAlert;
}

function handleBack(): void {
  step.value = AlertPages.AlertList;
}

function selectAsset(selectedAsset?: AccountAsset): void {
  if (!selectedAsset) return;
  pendingAsset.value = selectedAsset;
  showAlertSelectTokenDialog.value = false;
}
</script>
