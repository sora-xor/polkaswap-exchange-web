<template>
  <s-tooltip :content="copyTooltip(tooltipText)" tabindex="-1" append-to-body>
    <div class="formatted-address" @click="handleCopyAddress(value, $event)">
      <template v-if="sliced">
        <span class="address" :style="{ width: firstPartWidth }">{{ value }}</span>
        ...
        <span>{{ secondPart }}</span>
      </template>
      <template v-else>
        {{ value }}
      </template>
    </div>
  </s-tooltip>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useCopyAddress } from '@/composables/useCopyAddress';
import { getTextWidth } from '@/util';

const props = withDefaults(
  defineProps<{
    value?: string;
    tooltipText?: string;
    symbols?: number | string;
    offset?: number | string;
    symbolsOffset?: number | string;
  }>(),
  {
    value: '',
    tooltipText: '',
    symbols: 12,
    offset: 0,
    symbolsOffset: 0,
  }
);

const { copyTooltip, handleCopyAddress } = useCopyAddress();

const symbolsCount = computed(() => Number(props.symbols));
const offsetValue = computed(() => Number(props.offset));
const symbolsOffsetValue = computed(() => Number(props.symbolsOffset));

const sliced = computed(() => props.value.length >= symbolsCount.value);

const count = computed(() => symbolsCount.value / 2);

const firstPartWidth = computed(() => {
  const text = props.value.slice(0, Math.round(count.value) + symbolsOffsetValue.value);
  const width = getTextWidth(text) - offsetValue.value;
  return `${width}px`;
});

const secondPart = computed(() => props.value.slice(-Math.floor(count.value) + symbolsOffsetValue.value));

defineExpose({
  handleCopyAddress,
  copyTooltip,
});
</script>

<style lang="scss" scoped>
.formatted-address {
  @include hint-text;

  display: inline-flex;
  color: inherit;
  cursor: pointer;
  letter-spacing: normal;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  .address {
    white-space: nowrap;
    overflow: hidden;
  }
}
</style>
