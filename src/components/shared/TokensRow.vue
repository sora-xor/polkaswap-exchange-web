<template>
  <div class="tokens-row">
    <div class="tokens-row-container">
      <token-logo
        v-for="(asset, index) in assets"
        :key="index"
        :token="asset"
        :size="size"
        :style="{ zIndex: index }"
        :class="['tokens-row__item', { border }]"
      ></token-logo>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';

import { LogoSize } from '@/consts';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  name: 'TokensRow',
  components: {
    TokenLogo: components.TokenLogo,
  },
});

withDefaults(
  defineProps<{
    assets?: Array<Asset>;
    size?: LogoSize;
    border?: boolean;
  }>(),
  {
    assets: () => [],
    size: LogoSize.LARGE,
    border: false,
  }
);
</script>

<style lang="scss" scoped>
.tokens-row {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;

  &-container {
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
  }

  &__item {
    display: block;
    border-style: solid;
    border-color: transparent;
    border-radius: 50%;
    border-width: 0px;

    &.border {
      border-color: var(--s-color-utility-surface);

      & + & {
        border-left-width: 2px;
      }
    }

    & + & {
      margin-left: -12.5%;
    }
  }
}
</style>
