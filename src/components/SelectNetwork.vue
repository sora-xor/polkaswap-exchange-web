<template>
  <dialog-base :visible.sync="isVisible" :title="t('bridge.selectNetwork')" class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-radio-group v-model="selectedEvmNetworkId">
      <s-radio v-for="network in availableEvmNetworks" :key="network.id" :label="network.id" class="network">
        <span class="network-name">{{ t(`evm.${network.id}`) }}</span>
        <token-logo :token-symbol="network.nativeCurrency.symbol" />
      </s-radio>
    </s-radio-group>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { getter } from '@/store/decorators';

import { EvmNetworkId } from '@/consts/evm';
import type { EvmNetworkData } from '@/consts/evm';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class SelectNetwork extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @Prop({ default: () => null, type: Object }) readonly selectedEvmNetwork!: EvmNetworkData;
  @getter.web3.availableEvmNetworks availableEvmNetworks!: EvmNetworkData;

  get selectedEvmNetworkId(): Nullable<EvmNetworkId> {
    return this.selectedEvmNetwork?.id ?? null;
  }

  set selectedEvmNetworkId(value: Nullable<EvmNetworkId>) {
    this.$emit('change', value);
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
    justify-content: space-between;
  }
  .el-radio__label {
    padding-left: $inner-spacing-small;
    width: 100%;
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
      @include radio-title;
    }
    + .network {
      border-top: 1px solid var(--s-color-base-border-secondary);
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
