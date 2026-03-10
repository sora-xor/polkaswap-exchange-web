<script setup lang="ts">
defineOptions({
  name: 'STab',
});

withDefaults(
  defineProps<{
    disabled?: boolean;
    label?: string;
    name: string;
  }>(),
  {
    disabled: false,
    label: '',
  }
);
</script>

<template>
  <div hidden aria-hidden="true">
    <slot>{{ label }}</slot>
  </div>
</template>
