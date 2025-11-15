<template>
  <dialog-base v-model:visible="visibility" :title="t('bridge.selectNetwork')" class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-scrollbar class="networks-scrollbar">
      <s-radio-group v-model="selectedNetworkTuple" class="networks-list">
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
              <external-link v-if="info.link" :title="info.content" :href="info.content"></external-link>
              <span v-else>{{ info.content }}</span>
            </div>
          </div>
          <i :class="['network-icon', `network-icon--${getNetworkIcon(id)}`]"></i>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
  </dialog-base>
</template>

<script lang="ts" setup>
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { components } from '@wallet';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';

import { useNetworkFormatter } from '@/composables/useNetworkFormatter';

import type { AvailableNetwork } from '@/store/web3/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

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

const DELIMITER = '-';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    ExternalLink: components.ExternalLink,
    TokenLogo: components.TokenLogo,
    SRadioGroup: components.SRadioGroup,
    SRadio: components.SRadio,
    SScrollbar: components.SScrollbar,
  },
});

const { t } = useTranslation();
const { getNetworkIcon } = useNetworkFormatter();

const visibility = computed({
  get: () => Boolean(store.state.web3.selectNetworkDialogVisibility),
  set: (flag: boolean) => {
    store.commit.web3.setSelectNetworkDialogVisibility(flag);
  },
});

const availableNetworks = computed(
  () =>
    (store.getters.web3.availableNetworks as Record<
      BridgeNetworkType,
      Partial<Record<BridgeNetworkId, AvailableNetwork>>
    >) ?? {}
);

const networkType = computed<Nullable<BridgeNetworkType>>(() => store.state.web3.networkType);
const networkSelected = computed<Nullable<BridgeNetworkId>>(() => store.state.web3.networkSelected);

const networks = computed<NetworkItem[]>(() =>
  Object.entries(availableNetworks.value)
    .map(([type, record]) => {
      const items = Object.values(record ?? {}) as AvailableNetwork[];

      return items.reduce<NetworkItem[]>((buffer, { disabled, data: { id, name } }) => {
        const content = disabled ? t('comingSoonText') : '';

        buffer.push({
          id,
          value: `${type}${DELIMITER}${id}`,
          name,
          disabled,
          info: {
            content,
            link: false,
          },
        });

        return buffer;
      }, []);
    })
    .flat()
    .sort((a, b) => Number(a.disabled) - Number(b.disabled))
);

const selectedNetworkTuple = computed({
  get: () => {
    if (networkType.value == null || networkSelected.value == null) return '';
    return `${networkType.value}${DELIMITER}${networkSelected.value}`;
  },
  set: (value: string) => {
    const [typeRaw, idRaw] = value.split(DELIMITER);

    if (!typeRaw || !idRaw) return;

    const type = typeRaw as BridgeNetworkType;
    const id = type === BridgeNetworkType.Sub ? (idRaw as SubNetwork) : (Number(idRaw) as BridgeNetworkId);

    store.dispatch.web3.selectExternalNetwork({ id, type });
    visibility.value = false;
  },
});
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
  .network,
  .el-radio__input {
    &.is-disabled {
      cursor: not-allowed;
    }
  }
}

.networks-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$network-logo-size: 48px;
$network-logo-font-size: 24px;
$item-height: 72px;
$list-items: 7;

.networks-info,
.network-name {
  line-height: var(--s-line-height-medium);
}

.networks {
  &-list {
    max-height: calc(#{$item-height} * #{$list-items});
  }
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
    height: auto;
    padding: $inner-spacing-small $inner-spacing-big;
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
