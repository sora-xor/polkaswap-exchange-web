<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    percent?: number
    lineHeight?: number
  }>(),
  {
    percent: 0,
    lineHeight: 2,
  },
)

const activeBarWidth = computed(() => {
  return props.percent < 0 ? 0 : props.percent > 100 ? `100%` : `${props.percent}%`
})

const borderRadius = computed(() => {
  return `${Number(props.lineHeight) / 2}px`
})

const progressBarHeight = computed(() => {
  return `${props.lineHeight}px`
})
</script>

<template>
  <div class="s-progress-bar">
    <div class="s-progress-bar__active-bar" />
  </div>
</template>

<style lang="scss">
@use '@/theme';
$active-bar-width: v-bind(activeBarWidth);
$progress-bar-height: v-bind(progressBarHeight);
$progress-bar-border-radius: v-bind(borderRadius);

.s-progress-bar {
  height: $progress-bar-height;
  width: 100%;
  background: theme.token-as-var('sys.color.border-secondary');
  border-radius: $progress-bar-border-radius;

  &__active-bar {
    height: 100%;
    border-radius: $progress-bar-border-radius;
    background: linear-gradient(90deg, theme.token-as-var('sys.color.primary') $active-bar-width, transparent 0%);
  }
}
</style>
