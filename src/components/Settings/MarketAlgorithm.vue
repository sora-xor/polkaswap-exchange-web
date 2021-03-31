<template>
  <div class="market-algorithm">
    <settings-header :title="t('dexSettings.marketAlgorithm')">
      <div slot="tooltip-content">
        <strong>{{ t('marketAlgorithmText') }}</strong>
        <span>{{ t('dexSettings.marketAlgorithmTooltip.main') }}</span>
      </div>
    </settings-header>
    <settings-tabs :value="marketAlgorithm" :tabs="MarketAlgorithmTabs" @click="selectTab" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'

import { lazyComponent } from '@/router'
import { Components, MarketAlgorithms } from '@/consts'

@Component({
  components: {
    SettingsHeader: lazyComponent(Components.SettingsHeader),
    SettingsTabs: lazyComponent(Components.SettingsTabs)
  }
})
export default class MarketAlgorithm extends Mixins(TranslationMixin) {
  readonly MarketAlgorithmTabs = Object.values(MarketAlgorithms).map(name => ({ name, label: name }))

  @State(state => state.settings.marketAlgorithm) marketAlgorithm!: MarketAlgorithms
  @Action('setMarketAlgorithm') setMarketAlgorithm!: (name: string) => void

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
