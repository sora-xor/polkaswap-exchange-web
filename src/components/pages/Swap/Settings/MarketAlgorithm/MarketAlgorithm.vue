<template>
  <div class="market-algorithm">
    <swap-settings-header :title="t('dexSettings.marketAlgorithm')">
      <div slot="tooltip-content">
        <strong>{{ t('marketAlgorithmText') }}</strong>
        <span>{{ t('dexSettings.marketAlgorithmTooltip.main') }}</span>
      </div>
    </swap-settings-header>
    <settings-tabs :value="currentMarketAlgorithm" :tabs="marketAlgorithmTabs" @input="selectTab" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Components, MarketAlgorithms } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useSwapStore } from '@/stores/swap';
import type { TabItem } from '@/types/tabs';

import SwapSettingsHeader from './Header.vue';

const SettingsTabs = lazyComponent(Components.SettingsTabs);

const { t, te } = useTranslation();
const swapStore = useSwapStore();

const marketAlgorithm = computed(() => store.state.settings.marketAlgorithm as MarketAlgorithms);
const marketAlgorithms = computed(() => swapStore.marketAlgorithms);
const marketAlgorithmsAvailable = computed(() => swapStore.marketAlgorithmsAvailable);

const generateAlgorithmItem = (type: string) => `<span class="algorithm">${type}</span>`;

const marketAlgorithmTabs = computed<Array<TabItem>>(() =>
  marketAlgorithms.value.map((name) => {
    const contentKey = `dexSettings.marketAlgorithms.${name}`;
    const content = te(contentKey)
      ? t(`dexSettings.marketAlgorithms.${name}`, {
          smartAlgorithm: generateAlgorithmItem(MarketAlgorithms.SMART),
          tbcAlgorithm: generateAlgorithmItem(MarketAlgorithms.TBC),
          xycAlgorithm: generateAlgorithmItem(MarketAlgorithms.XYK),
        })
      : '';

    return {
      name,
      label: name,
      content,
    };
  })
);

const currentMarketAlgorithm = computed(() =>
  marketAlgorithmsAvailable.value ? marketAlgorithm.value : MarketAlgorithms.SMART
);

const selectTab = (name: MarketAlgorithms) => {
  store.commit.settings.setMarketAlgorithm(name);
};
</script>

<style lang="scss">
.market-algorithm {
  .settings-tabs.s-tabs {
    .el-tabs__header,
    .el-tabs__nav {
      width: 100%;
    }

    .el-tabs__item {
      flex: 1;
    }
  }
}
</style>
