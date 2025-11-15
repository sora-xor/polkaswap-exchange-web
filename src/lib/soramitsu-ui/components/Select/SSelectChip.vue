<script setup lang="ts">
import { IconClose } from '@soramitsu-ui/ui/components/icons';

withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: '',
  }
);

const emit = defineEmits<(event: 'click:delete') => void>();
</script>

<template>
  <span class="s-select-chip inline-flex items-center px-6px">
    <span class="truncate">
      {{ label }}
    </span>

    <button class="flex-shrink-0 ml-4px" tabindex="-1" @click.stop="emit('click:delete')">
      <IconClose width="16" height="16" />
    </button>
  </span>
</template>

<style lang="scss">
@use '@soramitsu-ui/theme';

.s-select-chip {
  background: theme.token-as-var('sys.color.background');
}
</style>
