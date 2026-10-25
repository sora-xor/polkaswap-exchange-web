<template>
  <price-chart-widget v-bind="$attrs" :base-asset="selectedToken" is-available class="token-price-chart">
    <template v-if="!predefinedToken" #title>
      <token-select-button
        :icon="selectTokenIcon"
        :token="selectedToken"
        :tabindex="tokenTabIndex"
        @click.stop="handleSelectToken"
      ></token-select-button>
      <select-token
        disabled-custom
        v-model:visible="showSelectTokenDialog"
        :asset="selectedToken"
        @select="onTokenSelect"
      ></select-token>
    </template>
  </price-chart-widget>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';
import { useWidgetTokenSelect } from '@/composables/useWidgetTokenSelect';
import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';
import PriceChartWidget from '@/components/shared/Widget/PriceChart.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

const props = withDefaults(
  defineProps<{
    predefinedToken?: Nullable<Asset>;
    defaultAsset?: Asset;
    parentLoading?: (() => boolean | undefined) | undefined;
    loading?: (() => boolean | undefined) | undefined;
  }>(),
  {
    predefinedToken: null,
    defaultAsset: undefined,
    parentLoading: undefined,
    loading: undefined,
  }
);

const predefinedToken = computed(() => props.predefinedToken);

const {
  selectedToken,
  selectTokenIcon,
  tokenTabIndex,
  showSelectTokenDialog,
  handleSelectToken,
  changeToken,
  closeTokenDialog,
} = useWidgetTokenSelect({
  defaultAsset: props.defaultAsset,
  predefinedToken,
  parentLoading: props.parentLoading,
  loading: props.loading,
});

const onTokenSelect = (asset: Asset) => {
  changeToken(asset);
  closeTokenDialog();
};
</script>
