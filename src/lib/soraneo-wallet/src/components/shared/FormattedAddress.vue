<template>
  <s-tooltip :content="copyTooltip(tooltipText)" tabindex="-1" popper-class="formatted-address-tooltip" append-to-body>
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

:global(.formatted-address-tooltip.s-tooltip-popper.el-popover.el-popper) {
  background: transparent;
  border-radius: 10px;
  box-shadow: none;
}

:global(.formatted-address-tooltip .s-tooltip__body) {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
    rgba(49, 21, 78, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  box-shadow:
    0 16px 36px rgba(17, 0, 46, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
  color: var(--sora_sys_color_content-on-background-inverted);
  font-weight: 700;
  letter-spacing: 0;
  white-space: nowrap;
  backdrop-filter: blur(14px) saturate(1.35);
  -webkit-backdrop-filter: blur(14px) saturate(1.35);
}
</style>
