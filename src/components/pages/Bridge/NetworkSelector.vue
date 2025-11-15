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
        :tooltip="t('bridge.selectNetwork')"
        tooltip-placement="bottom-end"
        @click="handleChangeNetwork"
      ></s-button>
    </template>
  </swap-status-action-badge>
</template>

<script lang="ts" setup>
import { useTranslation } from '@/composables/useTranslation';
import { useNetworkFormatter } from '@/composables/useNetworkFormatter';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';

defineOptions({
  name: 'BridgeNetworkSelector',
  components: {
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
  },
});

const { t } = useTranslation();
const { selectedNetworkShortName } = useNetworkFormatter();

/**
 * Opens the network selection dialog so the user can switch bridge networks.
 */
function handleChangeNetwork(): void {
  store.commit.web3.setSelectNetworkDialogVisibility(true);
}
</script>
