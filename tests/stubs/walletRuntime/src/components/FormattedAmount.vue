<template>
  <span class="formatted-amount-stub" :data-value="value" :data-weight="fontWeightRate">
    <slot />
  </span>
</template>

<script lang="ts" setup>
defineProps<{
  value?: string | number;
  fontWeightRate?: string;
}>();
</script>
