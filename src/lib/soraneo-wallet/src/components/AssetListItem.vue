<template>
  <div
    v-button="withTabindex"
    :class="[
      's-flex',
      'asset',
      { 'asset--with-fiat': withFiat },
      { 'asset--selected': selected },
      { 'asset--pinned': pinned },
    ]"
    v-bind="$attrs"
    :tabindex="withTabindex ? 0 : -1"
  >
    <token-logo
      v-button
      :size="defaultLogoSize"
      :token="asset"
      :with-clickable-logo="withClickableLogo"
      @click="handleIconClick"
    ></token-logo>
    <div class="asset-description s-flex">
      <slot name="value" v-bind="asset">
        <div class="asset-symbol">{{ asset.symbol }}</div>
      </slot>
      <token-address
        :name="asset.name"
        :symbol="asset.symbol"
        :address="asset.address"
        class="asset-info"
      ></token-address>
      <slot name="append" v-bind="asset"></slot>
    </div>
    <slot v-bind="asset"></slot>
    <div v-if="selectable" class="check">
      <s-icon name="basic-check-mark-24" size="12px"></s-icon>
    </div>
    <div v-if="pinnable" class="pin" @click="pin">
      <pin-icon :is-pinned="pinned"></pin-icon>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { LogoSize } from '@/consts';

import NftTokenLogo from './NftTokenLogo.vue';
import PinIcon from './PinIcon.vue';
import TokenAddress from './TokenAddress.vue';
import TokenLogo from './TokenLogo.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(
  defineProps<{
    asset: Asset;
    withClickableLogo?: boolean;
    selected?: boolean;
    selectable?: boolean;
    pinnable?: boolean;
    pinned?: boolean;
    withFiat?: boolean;
    withTabindex?: boolean;
  }>(),
  {
    withClickableLogo: false,
    selected: false,
    selectable: false,
    pinnable: true,
    pinned: false,
    withFiat: false,
    withTabindex: false,
  }
);

const emit = defineEmits<{
  (event: 'show-details', asset: Asset): void;
  (event: 'pin', asset: Asset): void;
}>();

const defaultLogoSize = LogoSize.BIG;

const handleIconClick = (event: Event) => {
  if (!props.withClickableLogo) {
    return;
  }

  event.stopImmediatePropagation();
  emit('show-details', props.asset);
};

const pin = (event: Event) => {
  event.stopPropagation();
  emit('pin', props.asset);
};

defineExpose({ handleIconClick, pin });
</script>

<style lang="scss">
.asset-description {
  .formatted-amount__container {
    width: 100%;
  }
}
</style>

<style lang="scss" scoped>
.asset {
  align-items: center;
  height: var(--s-asset-item-height);
  position: relative;
  width: 100%;

  &--with-fiat {
    height: var(--s-asset-item-height--fiat);
  }

  &-description {
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    line-height: var(--s-line-height-big);
    word-break: break-word;
    padding: 0 var(--s-basic-spacing);
    width: 30%;
  }

  &-symbol {
    font-size: var(--s-font-size-big);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-extra-small);
    word-break: break-word;
  }
  .check {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--s-color-base-content-secondary);
    border-radius: 50%;
    transition:
      opacity 150ms,
      border-color 150ms,
      background-color 150ms;
    i {
      color: white;
    }
  }
  &--selected .check {
    background: var(--s-color-theme-accent);
    border: 1px solid transparent;
  }
  &:not(&--selected) .check i {
    opacity: 0;
  }
  &:not(:hover):not(&--selected) .check {
    opacity: 0;
  }
  .pin {
    display: flex;
    justify-content: center;
    align-items: center;
    svg {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
