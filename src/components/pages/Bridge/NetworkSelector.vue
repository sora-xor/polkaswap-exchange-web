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
import { useWeb3Store } from '@/stores/web3';

defineOptions({
  name: 'BridgeNetworkSelector',
  components: {
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
  },
});

const { t } = useTranslation();
const { selectedNetworkShortName } = useNetworkFormatter();
const web3Store = useWeb3Store();

/**
 * Opens the network selection dialog so the user can switch bridge networks.
 */
function handleChangeNetwork(): void {
  web3Store.setSelectNetworkDialogVisibility(true);
}
</script>

<style lang="scss" scoped>
.el-button--settings {
  font-size: 14px;
  font-weight: 500;
  line-height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: transparent;
  color: var(--s-color-base-content-tertiary);
  box-shadow: none;

  :deep(.s-button__icon > i) {
    color: inherit;
    opacity: 0.7;
  }
}
</style>
