<template>
  <dialog-base :visible.sync="visibility" :title="t('bridge.selectNetwork')" class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-radio-group v-model="selectedNetworkTuple">
      <s-radio
        v-for="{ id, value, name, disabled, info } in networks"
        :key="value"
        :label="value"
        :disabled="disabled"
        class="network"
      >
        <div class="network-name">
          <span>{{ name }}</span>
          <div v-if="info" class="network-name-info">
            <external-link v-if="info.link" :title="info.content" :href="info.content" />
            <span v-else>{{ info.content }}</span>
          </div>
        </div>
        <i :class="['network-icon', `network-icon--${getNetworkIcon(id)}`]" />
      </s-radio>
    </s-radio-group>
  </dialog-base>
</template>

<script lang="ts">
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import { action, mutation, state } from '@/store/decorators';
import type { AvailableNetwork } from '@/store/web3/types';

import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

type NetworkItem = {
  id: BridgeNetworkId;
  value: string;
  name: string;
  disabled: boolean;
  info: {
    content: string;
    link: boolean;
  };
};

const DELIMETER = '-';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    ExternalLink: components.ExternalLink,
  },
})
export default class BridgeSelectNetwork extends Mixins(NetworkFormatterMixin) {
  @state.web3.networkType private networkType!: Nullable<BridgeNetworkType>;
  @state.web3.networkSelected private networkSelected!: Nullable<BridgeNetworkId>;
  @state.web3.selectNetworkDialogVisibility private selectNetworkDialogVisibility!: boolean;

  @mutation.web3.setSelectNetworkDialogVisibility private setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  @action.web3.selectExternalNetwork selectExternalNetwork!: (network: {
    id: BridgeNetworkId;
    type: BridgeNetworkType;
  }) => void;

  get visibility(): boolean {
    return this.selectNetworkDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectNetworkDialogVisibility(flag);
  }

  get networks(): NetworkItem[] {
    return Object.entries(this.availableNetworks)
      .map(([type, record]) => {
        const networks = Object.values(record) as AvailableNetwork[];

        return networks.reduce<NetworkItem[]>((buffer, { disabled, data: { id, name } }) => {
          let content = '';
          let link = false;

          if (id === SubNetwork.Polkadot) {
            content = 'https://parachains.info/details/sora_polkadot';
            link = true;
          } else if (disabled) {
            content = this.t('comingSoonText');
          }

          buffer.push({
            id,
            value: `${type}-${id}`,
            name,
            disabled,
            info: {
              content,
              link,
            },
          });

          return buffer;
        }, []);
      })
      .flat(1)
      .sort((a, b) => {
        return +a.disabled - +b.disabled;
      });
  }

  get selectedNetworkTuple(): string {
    return [this.networkType, this.networkSelected].join(DELIMETER);
  }

  set selectedNetworkTuple(value: string) {
    const [networkType, networkSelected] = value.split(DELIMETER);

    const type = networkType as BridgeNetworkType;
    const id = type === BridgeNetworkType.Sub ? (networkSelected as SubNetwork) : Number(networkSelected);

    this.selectExternalNetwork({ id, type });
    this.visibility = false;
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
      display: flex;
      flex-flow: column nowrap;
      @include radio-title;

      &-info {
        font-size: var(--s-font-size-mini);
      }
    }
    &-icon {
      height: $network-logo-size;
      width: $network-logo-size;
      margin-left: $inner-spacing-small;
    }
  }
}
</style>
