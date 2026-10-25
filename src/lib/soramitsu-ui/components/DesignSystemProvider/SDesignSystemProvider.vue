<script setup lang="ts">
defineOptions({ name: 'SDesignSystemProvider' });

withDefaults(
  defineProps<{
    value?: string;
  }>(),
  {
    value: '',
  }
);
</script>

<template>
  <div class="s-design-system-provider" :data-design-system="value">
    <slot />
  </div>
</template>

<style lang="scss">
.s-design-system-provider {
  min-height: 100%;
}
</style>
