<template>
  <div
    :class="['s-divider', 'el-divider', `el-divider--${direction}`]"
    role="separator"
    :aria-orientation="direction"
  >
    <slot />
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    direction?: 'horizontal' | 'vertical';
  }>(),
  {
    direction: 'horizontal',
  }
);
</script>

<style lang="scss" scoped>
.s-divider {
  box-sizing: border-box;
  flex: 0 0 auto;
  background-color: var(--s-color-base-border-secondary);
}

.el-divider--horizontal {
  width: 100%;
  height: 1px;
  margin: $inner-spacing-mini 0;
}

.el-divider--vertical {
  width: 1px;
  min-height: 1em;
  align-self: stretch;
  margin: 0 $inner-spacing-mini;
}
</style>
