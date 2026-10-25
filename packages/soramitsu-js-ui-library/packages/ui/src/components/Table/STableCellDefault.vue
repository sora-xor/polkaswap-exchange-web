<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tooltip?: string
  }>(),
  {
    tooltip: '',
  },
)
</script>

<template>
  <div class="s-table-cell-default h-full flex flex-col justify-center px-16px" :title="tooltip">
    <div class="s-table-cell-default__content" :class="{ 's-table-cell-default__content_has-tooltip': tooltip }">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-table-cell-default {
  &__content {
    box-sizing: border-box;
    overflow: hidden;
    white-space: normal;
    word-break: break-all;

    &_has-tooltip {
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
