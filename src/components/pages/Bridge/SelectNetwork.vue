<template>
  <dialog-base :visible.sync="visibility" :title="t('bridge.selectNetwork')" class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <div v-for="(networks, type) in availableNetworks" :key="type">
      <div>{{ type }}</div>
      <s-radio-group v-model="selectedNetworkTuple">
        <s-radio
          v-for="network in networks"
          :key="`${type}-${network.id}`"
          :label="`${type}-${network.id}`"
          class="network"
        >
          <span class="network-name">{{ network.name }}</span>
          <token-logo :token-symbol="network.nativeCurrency.symbol" />
        </s-radio>
      </s-radio-group>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { action, getter, mutation, state } from '@/store/decorators';

import type { BridgeType, EvmNetworkData } from '@/consts/evm';

const DELIMETER = '-';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class BridgeSelectNetwork extends Mixins(TranslationMixin) {
  @state.web3.networkType private networkType!: Nullable<BridgeType>;
  @state.web3.evmNetworkSelected private evmNetworkSelected!: Nullable<EvmNetwork>;
  @state.web3.selectNetworkDialogVisibility selectNetworkDialogVisibility!: boolean;

  @getter.web3.availableNetworks availableNetworks!: EvmNetworkData;

  @mutation.web3.setNetworkType private setNetworkType!: (networkType: BridgeType) => void;
  @mutation.web3.setSelectNetworkDialogVisibility private setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  @action.web3.selectEvmNetwork selectEvmNetwork!: (networkId: EvmNetwork) => void;

  get visibility(): boolean {
    return this.selectNetworkDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectNetworkDialogVisibility(flag);
  }

  get selectedNetworkTuple(): string {
    return [this.networkType, this.evmNetworkSelected].join(DELIMETER);
  }

  set selectedNetworkTuple(value: string) {
    const [networkType, evmNetworkSelected] = value.split(DELIMETER);

    this.setNetworkType(networkType as BridgeType);
    this.selectEvmNetwork(Number(evmNetworkSelected));
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
