<template>
  <div class="market-algorithm">
    <settings-header :title="t('dexSettings.marketAlgorithm')">
      <div slot="tooltip-content">
        <strong>{{ t('marketAlgorithmText') }}</strong>
        <span>{{ t('dexSettings.marketAlgorithmTooltip.main') }}</span>
      </div>
    </settings-header>
    <settings-tabs :value="marketAlgorithm" :tabs="marketAlgorithmTabs" @click="selectTab" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State } from 'vuex-class'
import { LiquiditySourceTypes } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

import { lazyComponent } from '@/router'
import { Components, MarketAlgorithms, LiquiditySourceForMarketAlgorithm } from '@/consts'
import { TabItem } from '@/types/tabs'

@Component({
  components: {
    SettingsHeader: lazyComponent(Components.SettingsHeader),
    SettingsTabs: lazyComponent(Components.SettingsTabs)
  }
})
export default class MarketAlgorithm extends Mixins(TranslationMixin) {
  @State(state => state.settings.marketAlgorithm) marketAlgorithm!: MarketAlgorithms
  @State(state => state.swap.pairLiquiditySources) liquiditySources!: Array<LiquiditySourceTypes>
  @Action('setMarketAlgorithm') setMarketAlgorithm!: (name: string) => Promise<void>

  get marketAlgorithms (): Array<MarketAlgorithms> {
    const items = Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>

    return items.filter((marketAlgorithm) => {
      const liquiditySource = LiquiditySourceForMarketAlgorithm[marketAlgorithm]

      return marketAlgorithm === MarketAlgorithms.SMART || this.liquiditySources.includes(liquiditySource)
    })
  }

  get marketAlgorithmTabs (): Array<TabItem> {
    return this.marketAlgorithms.map(name => ({ name, label: name, content: this.t(`dexSettings.marketAlgorithms.${name}`) }))
  }

  selectTab ({ name }): void {
    this.setMarketAlgorithm(name)
  }
}
</script>

<style lang="scss">
.market-algorithm {
  .settings-tabs.s-tabs {
    .el-tabs__header, .el-tabs__nav {
      width: 100%;
    }

    .el-tabs__item {
      flex: 1
    }
  }
}
</style>
