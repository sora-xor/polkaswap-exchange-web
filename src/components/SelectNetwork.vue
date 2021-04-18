<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('bridge.selectNetwork')"
    class="networks"
  >
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-radio
      v-model="selectedNetwork"
      v-for="network in subNetworks"
      :key="network.id"
      :label="network.name"
      class="network"
      @change="selectNetwork"
    >
      <span class="network-name">{{ t(`bridge.${network.name}`) }}</span>
      <token-logo :tokenSymbol="network.symbol" />
    </s-radio>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components, BridgeNetwork } from '@/consts'
import { lazyComponent } from '@/router'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectNetwork extends Mixins(TranslationMixin, DialogMixin) {
  selectedNetwork = ''

  @Getter('subNetworks', { namespace: 'web3' }) subNetworks!: Array<BridgeNetwork>
  @Getter('currentSubNetwork', { namespace: 'web3' }) currentSubNetwork!: BridgeNetwork | null

  created () {
    this.selectedNetwork = this.currentSubNetwork?.name || (this.subNetworks && this.subNetworks.length) ? this.subNetworks[0]?.name : ''
  }

  async selectNetwork (): Promise<void> {
    this.$emit('select', this.subNetworks.find(item => item.name === this.selectedNetwork))
    this.$emit('close')
    this.isVisible = false
  }
}
</script>

<style lang="scss">
.networks {
  .network,
  .el-radio__label {
    display: flex;
    align-items: center;
  }
  .el-radio__label {
    width: 100%;
  }
}
</style>

<style lang="scss" scoped>
.networks {
  &-info {
    margin-bottom: $inner-spacing-mini;
    margin-top: $inner-spacing-mini;
    color: var(--s-color-base-content-secondary);
  }
  .el-radio-group {
    display: block;
  }
  .network {
    margin-right: 0;
    width: 100%;
    height: auto;
    padding: $inner-spacing-mini $inner-spacing-mini $inner-spacing-mini 0;
    + .network {
      border-top: 1px solid var(--s-color-base-border-primary);
    }
  }
  .token-logo {
    margin-left: auto;
  }
}
</style>
