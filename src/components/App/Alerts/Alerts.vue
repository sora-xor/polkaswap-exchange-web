<template>
  <div>
    <dialog-base
      :title="title"
      :visible.sync="showAlertsPopup"
      :show-back="showBack"
      @back="handleBack"
      :tooltip="t('alerts.alertsTooltip')"
    >
      <alert-list v-if="step === AlertPages.AlertList" @create="handleCreate" @edit-alert="handleEdit" />
      <create-alert
        v-else-if="step === AlertPages.CreateAlert"
        @back="handleBack"
        @open-select-token="openSelectTokenDialog"
        :alert-to-edit="alertToEdit"
      />
    </dialog-base>
    <alerts-select-asset :visible.sync="showAlertSelectTokenDialog" disabled-custom @select="selectAsset" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import { Components, NumberedAlert } from '@/consts';
import { lazyComponent } from '@/router';
import { mutation, state } from '@/store/decorators';

enum AlertPages {
  AlertList,
  CreateAlert,
}

@Component({
  components: {
    DialogBase: components.DialogBase,
    AlertList: lazyComponent(Components.AlertList),
    CreateAlert: lazyComponent(Components.CreateAlert),
    AlertsSelectAsset: lazyComponent(Components.SelectToken),
  },
})
export default class Alerts extends Mixins(mixins.TransactionMixin) {
  @state.settings.alertSettingsVisibility private alertSettingsVisibility!: boolean;

  @mutation.settings.setAlertSettingsPopup private setAlertSettingsPopup!: (flag: boolean) => void;

  alertToEdit: Nullable<NumberedAlert> = null;
  showAlertSelectTokenDialog = false;

  step = AlertPages.AlertList;

  readonly AlertPages = AlertPages;

  get showAlertsPopup(): boolean {
    return this.alertSettingsVisibility;
  }

  set showAlertsPopup(value) {
    this.setAlertSettingsPopup(value);
  }

  get title(): string {
    if (this.step === AlertPages.CreateAlert) return this.t('alerts.alertsCreateTitle');
    return this.t('alerts.alertsTitle');
  }

  get showBack(): boolean {
    return this.step === AlertPages.CreateAlert;
  }

  openSelectTokenDialog() {
    this.showAlertSelectTokenDialog = true;
  }

  handleCreate(): void {
    this.alertToEdit = null;
    this.step = AlertPages.CreateAlert;
  }

  handleEdit(alert: NumberedAlert): void {
    this.alertToEdit = alert;
    this.step = AlertPages.CreateAlert;
  }

  handleBack(): void {
    this.step = AlertPages.AlertList;
  }

  selectAsset(selectedAsset?: AccountAsset): void {
    // disallow XSTUSD asset to choose in asset list
    if (!selectedAsset) return;
    this.$root.$emit('selectAlertAsset', selectedAsset);
  }
}
</script>
