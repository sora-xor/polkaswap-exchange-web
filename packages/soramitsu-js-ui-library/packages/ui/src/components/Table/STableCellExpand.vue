<script setup lang="ts">
import { IconArrowsChevronDownRounded24 } from '@/components/icons'

const props = withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  {
    active: false,
  },
)
</script>

<template>
  <button class="s-table-cell-expand h-full flex flex-col justify-center cursor-pointer px-16px">
    <IconArrowsChevronDownRounded24
      class="s-table-cell-expand__icon"
      :class="{ 's-table-cell-expand__icon_active': active }"
      data-testid="table-expanded-icon"
    />
  </button>
</template>

<style lang="scss">
@use '@/theme';

.s-table-cell-expand {
  &__icon {
    fill: currentColor;
    transition: 0.15s ease-in-out transform;

    &_active {
      transform: rotateZ(180deg);
    }
  }
}
</style>
