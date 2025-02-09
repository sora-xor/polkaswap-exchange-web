<template>
  <swap-status-action-badge>
    <template #value>
      {{ selectedNetworkShortName }}
    </template>
    <template #action>
      <s-button
        class="el-button--settings"
        type="action"
        icon="basic-settings-24"
        size="small"
        alternative
        :tooltip="t('bridge.selectNetwork')"
        tooltip-placement="bottom-end"
        @click="handleChangeNetwork"
      />
    </template>
  </swap-status-action-badge>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { mutation } from '@/store/decorators';

@Component({
  components: {
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
  },
})
export default class BridgeNetworkSelector extends Mixins(NetworkFormatterMixin) {
  @mutation.web3.setSelectNetworkDialogVisibility private setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  handleChangeNetwork(): void {
    this.setSelectNetworkDialogVisibility(true);
  }
}
</script>
