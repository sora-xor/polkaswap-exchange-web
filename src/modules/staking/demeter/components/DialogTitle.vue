<template>
  <s-row v-if="poolAsset" flex align="middle">
    <pair-token-logo
      v-if="isFarm && baseAsset"
      key="pair"
      :first-token="baseAsset"
      :second-token="poolAsset"
      class="dialog-title-logo"
    ></pair-token-logo>
    <token-logo v-else key="token" :token="poolAsset" class="dialog-title-logo"></token-logo>
    <span class="dialog-title-text">
      <template v-if="isFarm">{{ baseAsset.symbol }}-</template>{{ poolAsset.symbol }}
    </span>
  </s-row>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed } from 'vue';

import { Components } from '@/consts';
import type { DemeterAsset } from '@/modules/staking/demeter/types';
import { lazyComponent } from '@/router';

const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
const TokenLogo = components.TokenLogo;

const props = withDefaults(
  defineProps<{
    baseAsset?: DemeterAsset | null;
    poolAsset?: DemeterAsset | null;
    isFarm?: boolean;
  }>(),
  {
    baseAsset: null,
    poolAsset: null,
    isFarm: false,
  }
);

const baseAsset = computed(() => props.baseAsset);
const poolAsset = computed(() => props.poolAsset);
const isFarm = computed(() => props.isFarm);
</script>

<style lang="scss" scoped>
.dialog-title {
  &-text {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }
  &-logo {
    margin-right: $inner-spacing-mini;
  }
}
</style>
