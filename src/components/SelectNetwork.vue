<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('bridge.selectNetwork')"
    class="networks"
    width="464px"
  >
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-radio
      v-model="selectedNetwork"
      v-for="network in subNetworks"
      :key="network.id"
      :label="network.id"
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
import { api } from '@soramitsu/soraneo-wallet-web'

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
  selectedNetwork = 0

  @Getter('subNetworks', { namespace: 'web3' }) subNetworks!: Array<BridgeNetwork>

  created () {
    this.selectedNetwork = api.bridge.externalNetwork || this.subNetworks[0]?.id
  }

  async selectNetwork (): Promise<void> {
    this.$emit('select', this.selectedNetwork)
    this.$emit('close')
    this.isVisible = false
  }
}
</script>

<style lang="scss">
$radio-size: 28px;
$radio-checked-size: 18px;

.networks {
  .el-dialog .el-dialog__body {
    padding-bottom: $inner-spacing-big;
  }
  .network,
  .el-radio__label {
    display: flex;
    align-items: center;
  }
  .el-radio__label {
    padding-left: $inner-spacing-small;
    width: 100%;
  }
  .el-radio.s-medium > .el-radio__input .el-radio__inner {
    height: $radio-size;
    width: $radio-size;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-theme-secondary-focused);
    border-width: 1px;
    box-shadow: var(--s-shadow-tab);
    border-radius: 50%;
  }
  .el-radio__input.is-checked .el-radio__inner::after {
    height: $radio-checked-size;
    width: $radio-checked-size;
    box-shadow: -1px -1px 1px rgba(0, 0, 0, 0.02), 1px 1px 3px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  }
}
</style>

<style lang="scss" scoped>
$network-logo-size: 49px;

.networks-info,
.network-name {
  line-height: var(--s-line-height-medium);
  letter-spacing: var(--s-letter-spacing-small);
}

.networks {
  &-info {
    margin-bottom: $inner-spacing-medium;
    color: var(--s-color-base-content-secondary);
    font-weight: 300;
  }
  .el-radio-group {
    display: block;
  }
  .network {
    margin-right: 0;
    width: 100%;
    height: auto;
    padding: $inner-spacing-small 0;
    &-name {
      font-size: var(--s-heading5-font-size);
      font-weight: 400;
    }
    + .network {
      border-top: 1px solid var(--s-color-theme-secondary-focused);
    }
    .token-logo {
      height: $network-logo-size;
      width: $network-logo-size;
    }
  }
  .token-logo {
    margin-left: auto;
  }
}
</style>
