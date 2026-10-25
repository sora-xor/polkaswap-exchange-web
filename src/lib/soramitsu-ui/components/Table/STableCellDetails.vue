<script setup lang="ts">
import { IconArrowsChevronRightXs24 } from '@soramitsu-ui/ui/components/icons';
</script>

<template>
  <button class="s-table-cell-details w-full h-full flex flex-col justify-center cursor-pointer">
    <IconArrowsChevronRightXs24 class="s-table-cell-details__icon self-center" />
  </button>
</template>

<style lang="scss">
@use '@soramitsu-ui/theme';

.s-table-cell-details {
  &:hover {
    background: theme.token-as-var('sys.color.background-hover');
  }

  &__icon {
    color: theme.token-as-var('sys.color.content-quaternary');
    fill: currentColor;
  }

  &:hover &__icon {
    color: theme.token-as-var('sys.color.content-secondary');
  }
}
</style>
