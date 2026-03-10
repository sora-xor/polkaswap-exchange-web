<template>
  <div class="token-address">
    <span v-if="showName" class="token-address__name">{{ tokenName }}</span>
    <div class="token-address__value">
      (<formatted-address
        :value="tokenAddress"
        :tooltip-text="t('assets.assetId')"
        v-bind="{ ...$attrs, symbols, symbolsOffset }"
      ></formatted-address
      >)
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import FormattedAddress from './shared/FormattedAddress.vue';

const props = withDefaults(
  defineProps<{
    name?: string;
    symbol?: string;
    address?: string;
    externalAddress?: string;
    external?: boolean;
    showName?: boolean;
    symbols?: number | string;
    symbolsOffset?: number | string;
  }>(),
  {
    name: '',
    symbol: '',
    address: '',
    externalAddress: '',
    external: false,
    showName: true,
    symbols: 11,
    symbolsOffset: 2,
  }
);

const { t } = useTranslation();

const tokenName = computed(() => props.name || props.symbol);
const tokenAddress = computed(() => (props.external ? props.externalAddress : props.address));

defineExpose({
  tokenAddress,
});
</script>

<style lang="scss" scoped>
.token-address {
  @include hint-text;
  word-break: break-word;

  &__name {
    margin-right: $basic-spacing-mini;
  }

  &__value {
    display: inline-flex;
    align-items: baseline;
  }
}
</style>
