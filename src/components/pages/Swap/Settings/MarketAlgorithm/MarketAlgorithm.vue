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

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, MarketAlgorithms } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, mutation } from '@/store/decorators';
import type { TabItem } from '@/types/tabs';

import SwapSettingsHeader from './Header.vue';

@Component({
  components: {
    SwapSettingsHeader,
    SettingsTabs: lazyComponent(Components.SettingsTabs),
  },
})
export default class SwapMarketAlgorithm extends Mixins(TranslationMixin) {
  @state.settings.marketAlgorithm marketAlgorithm!: MarketAlgorithms;
  @getter.swap.marketAlgorithms private marketAlgorithms!: Array<MarketAlgorithms>;
  @getter.swap.marketAlgorithmsAvailable marketAlgorithmsAvailable!: boolean;
  @mutation.settings.setMarketAlgorithm private setMarketAlgorithm!: (name: MarketAlgorithms) => void;

  get marketAlgorithmTabs(): Array<TabItem> {
    return this.marketAlgorithms.map((name) => ({
      name,
      label: name,
      content: this.t(`dexSettings.marketAlgorithms.${name}`, {
        smartAlgorithm: this.generateAlgorithmItem(MarketAlgorithms.SMART),
        tbcAlgorithm: this.generateAlgorithmItem(MarketAlgorithms.TBC),
        xycAlgorithm: this.generateAlgorithmItem(MarketAlgorithms.XYK),
      }),
    }));
  }

  get currentMarketAlgorithm(): MarketAlgorithms {
    return this.marketAlgorithmsAvailable ? this.marketAlgorithm : MarketAlgorithms.SMART;
  }

  private generateAlgorithmItem(type: string): string {
    return `<span class="algorithm">${type}</span>`;
  }

  selectTab(name: MarketAlgorithms): void {
    this.setMarketAlgorithm(name);
  }
}
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
