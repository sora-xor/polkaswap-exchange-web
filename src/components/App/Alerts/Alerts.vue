<template>
  <div>
    <dialog-base
      :title="title"
      :visible.sync="isVisible"
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
    <alerts-select-asset :visible.sync="showAlertSelectTokenDialog" :disabled-custom="true" @select="selectAsset" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';

import { Components, NumberedAlert } from '@/consts';
import { lazyComponent } from '@/router';

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
export default class Alerts extends Mixins(mixins.DialogMixin, mixins.TransactionMixin) {
  alertToEdit: Nullable<NumberedAlert> = null;
  showAlertSelectTokenDialog = false;

  step = AlertPages.AlertList;

  AlertPages = AlertPages;

  get title(): string {
    if (this.step === AlertPages.CreateAlert) return this.t('alerts.alertsCreateTitle');
    return this.t('alerts.alertsTitle');
  }

  get showBack(): boolean {
    if (this.step === AlertPages.CreateAlert) return true;
    return false;
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

  selectAsset(selectedAsset?): void {
    // TODO: disallow XSTUSD asset to choose in asset list
    if (!selectedAsset) return;
    this.$root.$emit('selectAlertAsset', selectedAsset);
  }
}
</script>
