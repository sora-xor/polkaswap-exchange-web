<script setup lang="ts">
import { computed, ref } from 'vue';

type SizeValue = string | number;

defineOptions({ name: 'SScrollbar' });

const props = withDefaults(
  defineProps<{
    height?: SizeValue;
    maxHeight?: SizeValue;
    native?: boolean;
  }>(),
  {
    height: undefined,
    maxHeight: undefined,
    native: false,
  }
);

const emit = defineEmits<{
  (event: 'scroll', value: Event): void;
}>();

const wrapRef = ref<HTMLElement | null>(null);

const toCssSize = (value: SizeValue | undefined): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

const wrapStyle = computed(() => ({
  height: toCssSize(props.height),
  maxHeight: toCssSize(props.maxHeight),
}));

function handleScroll(event: Event): void {
  emit('scroll', event);
}

function setScrollTop(value: number): void {
  if (wrapRef.value) {
    wrapRef.value.scrollTop = value;
  }
}

function setScrollLeft(value: number): void {
  if (wrapRef.value) {
    wrapRef.value.scrollLeft = value;
  }
}

defineExpose({
  wrapRef,
  setScrollTop,
  setScrollLeft,
});
</script>

<template>
  <div class="s-scrollbar el-scrollbar" :class="{ 's-scrollbar_native': native }">
    <div ref="wrapRef" class="el-scrollbar__wrap" :style="wrapStyle" @scroll="handleScroll">
      <div class="el-scrollbar__view">
        <slot />
      </div>
    </div>

    <div v-if="!native" class="el-scrollbar__bar is-vertical">
      <div class="el-scrollbar__thumb"></div>
    </div>
    <div v-if="!native" class="el-scrollbar__bar is-horizontal">
      <div class="el-scrollbar__thumb"></div>
    </div>
  </div>
</template>

<style lang="scss">
.s-scrollbar.el-scrollbar {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;

  > .el-scrollbar__wrap {
    overflow: auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
  }

  > .el-scrollbar__wrap,
  > .el-scrollbar__wrap > .el-scrollbar__view {
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
  }

  > .el-scrollbar__bar {
    position: absolute;
    z-index: 1;
    opacity: 0.3;
    transition: opacity 160ms ease;
  }

  &:hover > .el-scrollbar__bar {
    opacity: 0.85;
  }

  > .el-scrollbar__bar .el-scrollbar__thumb {
    border-radius: 6px;
    background: var(--s-color-base-content-tertiary, rgba(0, 0, 0, 0.2));
  }

  > .el-scrollbar__bar.is-vertical {
    top: 4px;
    right: 2px;
    width: 6px;
    height: calc(100% - 8px);
  }

  > .el-scrollbar__bar.is-horizontal {
    left: 4px;
    bottom: 2px;
    width: calc(100% - 8px);
    height: 6px;
  }

  > .el-scrollbar__bar.is-vertical .el-scrollbar__thumb {
    width: 100%;
    height: 40px;
  }

  > .el-scrollbar__bar.is-horizontal .el-scrollbar__thumb {
    width: 40px;
    height: 100%;
  }

  &.s-scrollbar_native > .el-scrollbar__bar {
    display: none;
  }
}
</style>
