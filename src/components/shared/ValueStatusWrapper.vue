<template>
  <div :class="['value-status-wrapper', status, { badge }]">
    <s-icon
      v-if="errorIcon"
      class="value-status-wrapper-icon"
      name="notifications-alert-triangle-24"
      :size="errorIconSize"
    ></s-icon>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { DifferenceStatus, getDifferenceStatus } from '@/utils/swap';

const props = withDefaults(
  defineProps<{
    badge?: boolean;
    value?: string | number;
    errorIconSize?: string | number;
    getStatus?: (value: number) => string;
  }>(),
  {
    badge: false,
    value: '',
    errorIconSize: '12',
    getStatus: getDifferenceStatus,
  }
);

const formatted = computed(() => {
  const numericValue = Number(props.value);
  return Number.isFinite(numericValue) ? numericValue : 0;
});

const status = computed(() => props.getStatus(formatted.value));
const errorIcon = computed(() => status.value === DifferenceStatus.Error && props.badge);
</script>

<style lang="scss" scoped>
@mixin text-status($status: 'success', $property: 'color') {
  &.#{$status} {
    #{$property}: var(--s-color-status-#{$status});
  }
}

.value-status-wrapper {
  display: flex;
  flex-flow: row nowrap;
  align-items: baseline;
  gap: $inner-spacing-tiny;

  &:not(.badge) {
    @include text-status('success');
    @include text-status('warning');
    @include text-status('error');
  }

  &.badge {
    color: white;
    background-color: var(--s-color-base-content-tertiary);
    padding: 0 $inner-spacing-mini;
    border-radius: 100px;

    @include text-status('success', 'background-color');
    @include text-status('warning', 'background-color');
    @include text-status('error', 'background-color');
  }

  &-icon {
    color: white;
  }
}
</style>
