<template>
  <dialog-base :visible.sync="visibility" :title="t('bridge.selectNetwork')" class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-radio-group v-model="selectedNetworkTuple">
      <s-radio
        v-for="{ id, value, name, disabled } in networks"
        :key="value"
        :label="value"
        :disabled="disabled"
        class="network"
      >
        <span class="network-name">{{ name }}</span>
        <i :class="['network-icon', `network-icon--${getNetworkIcon(id)}`]" />
      </s-radio>
    </s-radio-group>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';

import { action, getter, mutation, state } from '@/store/decorators';
import type { NetworkData } from '@/types/bridge';

const DELIMETER = '-';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
})
export default class BridgeSelectNetwork extends Mixins(NetworkFormatterMixin) {
  @state.web3.networkType private networkType!: Nullable<BridgeNetworkType>;
  @state.web3.networkSelected private networkSelected!: Nullable<BridgeNetworkId>;
  @state.web3.selectNetworkDialogVisibility selectNetworkDialogVisibility!: boolean;

  @getter.web3.availableNetworks availableNetworks!: Record<
    BridgeNetworkType,
    { disabled: boolean; data: NetworkData }[]
  >;

  @mutation.web3.setNetworkType private setNetworkType!: (networkType: BridgeNetworkType) => void;
  @mutation.web3.setSelectNetworkDialogVisibility private setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  @action.web3.selectExternalNetwork selectExternalNetwork!: (networkId: BridgeNetworkId) => void;

  get visibility(): boolean {
    return this.selectNetworkDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectNetworkDialogVisibility(flag);
  }

  get networks(): { id: BridgeNetworkId; value: string; name: string; disabled: boolean }[] {
    return Object.entries(this.availableNetworks)
      .map(([type, networks]) => {
        return networks.map(({ disabled, data: { id, name } }) => {
          const networkName = type === BridgeNetworkType.EvmLegacy ? `${name} (${this.t('hashiBridgeText')})` : name;

          return {
            id,
            value: `${type}-${id}`,
            name: networkName,
            disabled,
          };
        });
      })
      .flat(1);
  }

  get selectedNetworkTuple(): string {
    return [this.networkType, this.networkSelected].join(DELIMETER);
  }

  set selectedNetworkTuple(value: string) {
    const [networkType, networkSelected] = value.split(DELIMETER);
    const networkFormatted =
      networkType === BridgeNetworkType.Sub ? (networkSelected as BridgeNetworkId) : Number(networkSelected);
    this.setNetworkType(networkType as BridgeNetworkType);
    this.selectExternalNetwork(networkFormatted);
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
$network-logo-size: 48px;
$network-logo-font-size: 24px;

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
    &-icon {
      height: $network-logo-size;
      width: $network-logo-size;
    }
  }
}
</style>
