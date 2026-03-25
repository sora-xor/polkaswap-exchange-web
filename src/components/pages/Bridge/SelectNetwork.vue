<template>
  <dialog-base v-model:visible="visibility" :title="t('bridge.selectNetwork')" class="networks" custom-class="networks">
    <p class="networks-info">{{ t('bridge.networkInfo') }}</p>
    <s-scrollbar :class="['networks-scrollbar', { 'networks-scrollbar--single': networks.length <= 1 }]">
      <s-radio-group v-model="selectedNetworkTuple" class="networks-list">
        <s-radio
          v-for="{ id, value, name, disabled, info } in networks"
          :key="value"
          :label="value"
          :value="value"
          :disabled="disabled"
          class="network"
        >
          <div class="network-name">
            <span>{{ name }}</span>
            <div class="network-name-info">
              <external-link
                v-if="info?.content && info.link"
                :title="info.content"
                :href="info.content"
              ></external-link>
              <span v-else>{{ info?.content ?? '' }}</span>
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
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Store } from '@/stores/web3';

import { useNetworkFormatter } from '@/composables/useNetworkFormatter';

import type { AvailableNetwork } from '@/stores/web3';
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

const web3Store = useWeb3Store();

const visibility = computed({
  get: () => web3Store.selectNetworkDialogVisibility,
  set: (flag: boolean) => {
    web3Store.setSelectNetworkDialogVisibility(flag);
  },
});

const availableNetworks = computed(
  () =>
    (web3Store.availableNetworks as Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>>) ?? {}
);

const networkType = computed<Nullable<BridgeNetworkType>>(() => web3Store.networkType);
const networkSelected = computed<Nullable<BridgeNetworkId>>(() => web3Store.networkSelected);

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

    web3Store.selectExternalNetwork({ id, type });
    visibility.value = false;
  },
});
</script>

<style lang="scss">
$radio-size: 28px;
$radio-checked-size: 18px;

/* Legacy DialogBase implementation (element-ui dialog). */
.dialog-wrapper.networks .el-dialog .el-dialog__body {
  padding-top: $inner-spacing-big;
  padding-bottom: $inner-spacing-big;
}

.dialog-wrapper.networks .el-dialog {
  overflow: hidden;
}

.dialog-wrapper.networks .el-dialog .el-dialog__header {
  position: relative;
  padding: $inner-spacing-big;
  border-bottom: 0;
}

.dialog-wrapper.networks .el-dialog .el-dialog__headerbtn {
  top: $inner-spacing-big;
  right: $inner-spacing-big;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background-color: var(--s-color-base-border-secondary);
  box-shadow: var(--s-shadow-element-pressed);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dialog-wrapper.networks .el-dialog .el-dialog__headerbtn .el-dialog__close {
  font-size: 24px;
  line-height: 24px;
  color: var(--s-color-base-content-tertiary);
}

/* Current DialogBase implementation (s-modal + dialog-card). */
.dialog-card.networks {
  display: block;
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);
}

.dialog-card.networks .dialog-card__header {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
  border-bottom: 0 !important;
  box-shadow: none !important;
}

.dialog-card.networks .dialog-card__title,
.dialog-card.networks .dialog-card__title-text {
  color: var(--s-color-base-content-primary);
  font-size: 24px;
  font-weight: 300;
  line-height: 31.2px;
  letter-spacing: -0.96px;
}

.dialog-card.networks .dialog-card__content {
  overflow: visible;
  padding-top: $inner-spacing-mini;
  padding-bottom: $inner-spacing-big;
}

.dialog-card.networks .dialog-card__close {
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  border: 0;
  outline: none;
  box-shadow: var(--s-shadow-element-pressed);
  background-color: var(--s-color-base-border-secondary);
  color: var(--s-color-base-content-tertiary);
}

.dialog-card.networks .dialog-card__close:focus,
.dialog-card.networks .dialog-card__close:focus-visible {
  outline: none !important;
  box-shadow: var(--s-shadow-element-pressed);
}

.dialog-card.networks .dialog-card__close .s-button__icon > i {
  font-size: 24px !important;
  line-height: 24px !important;
}

@media (max-width: 767px) {
  .dialog-card.networks {
    max-width: 100vw;
    width: 100vw;
    margin-left: calc(#{$basic-spacing-big} * -1);
    margin-right: calc(#{$basic-spacing-big} * -1);
  }
}

.network,
.network .el-radio__label,
.network > .flex > label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.network > .flex {
  display: flex;
  align-items: center;
  width: 100%;
}

.network > .flex.space-x-2 {
  column-gap: 0;
}

.network > .flex.space-x-2 > :not([hidden]) ~ :not([hidden]) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.network .el-radio__label,
.network > .flex > label {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
}

.network .el-radio__label {
  padding-left: 12px;
}

.network > .flex > label {
  margin-left: 0;
  padding-left: 12px;
  font-size: var(--s-font-size-small);
  font-weight: 500;
  line-height: var(--s-line-height-big);
  letter-spacing: var(--s-letter-spacing-small);
}

.network,
.network .el-radio__input,
.network[data-disabled='true'] {
  &.is-disabled {
    cursor: not-allowed;
  }
}

.network .s-radio-atom {
  width: $radio-size;
  height: $radio-size;
  min-width: $radio-size;
  min-height: $radio-size;
  border-width: 1px;
  border-color: var(--s-color-base-border-primary);
  border-radius: 50%;
  background-color: #faf4f8;
  box-shadow:
    1px 1px 5px rgba(255, 255, 255, 1),
    -5px -5px 5px rgba(255, 255, 255, 0.5) inset,
    1px 1px 10px rgba(0, 0, 0, 0.1) inset;
}

.network .s-radio-atom::before {
  width: 14px;
  height: 14px;
  border: 1px solid var(--s-color-utility-surface);
}

.network[aria-checked='true'] .s-radio-atom,
.network.is-checked .s-radio-atom {
  border-color: var(--s-color-base-border-primary);
}

.network[aria-checked='true'] .s-radio-atom::before,
.network.is-checked .s-radio-atom::before {
  opacity: 1;
}

.network[aria-checked='true'] .network-name > span,
.network.is-checked .network-name > span {
  color: var(--s-color-theme-accent);
  letter-spacing: -0.28px;
}

.networks-scrollbar.el-scrollbar {
  display: block;
  overflow: hidden;
  margin-left: -$inner-spacing-big;
  margin-right: -$inner-spacing-big;
}

.networks-scrollbar.el-scrollbar > .el-scrollbar__wrap {
  margin-bottom: 0 !important;
  overflow-x: hidden;
  overflow-y: scroll;
  padding-right: 0;
}

.networks-scrollbar.el-scrollbar > .el-scrollbar__wrap,
.networks-scrollbar.el-scrollbar > .el-scrollbar__wrap > .el-scrollbar__view {
  display: flex;
  flex: 1;
  flex-flow: column nowrap;
}

.networks-scrollbar.el-scrollbar > .el-scrollbar__bar.is-vertical {
  top: 2px;
  bottom: 2px;
  right: 2px;
  width: 6px;
  height: auto;
  border-radius: 4px;
  opacity: 0;
}

.networks-scrollbar.el-scrollbar > .el-scrollbar__bar.is-vertical .el-scrollbar__thumb {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  width: 6px;
  background-color: rgb(213, 205, 208);
  border-radius: 6px;
  min-height: 0 !important;
}

.networks-scrollbar.networks-scrollbar--single.el-scrollbar > .el-scrollbar__bar.is-vertical {
  display: none;
}

.networks-scrollbar.el-scrollbar > .el-scrollbar__bar.is-horizontal {
  display: none;
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

.networks-list {
  line-height: 0;
  max-height: calc(#{$item-height} * #{$list-items});
}

.networks-info {
  margin-bottom: $inner-spacing-medium;
  color: var(--s-color-base-content-secondary);
  font-weight: 300;
}

.el-radio-group {
  display: block;
}

.network {
  position: relative;
  border-radius: 0;
  line-height: 42px;
  margin-right: 0;
  min-height: $item-height;
  padding: $inner-spacing-small $inner-spacing-big;
  font-weight: 500;
}

.network-name {
  display: flex;
  flex: 0 1 auto;
  flex-flow: column nowrap;
  align-items: normal;
  min-width: 0;
  @include radio-title;

  & > span {
    font-weight: 600;
  }

  &-info {
    font-size: var(--s-font-size-mini);
  }
}

.network-icon {
  flex: 0 0 auto;
  width: $network-logo-size;
  height: $network-logo-size;
  margin-left: $inner-spacing-small;
}
</style>
