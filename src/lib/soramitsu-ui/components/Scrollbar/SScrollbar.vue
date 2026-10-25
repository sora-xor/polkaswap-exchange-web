<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

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
const viewRef = ref<HTMLElement | null>(null);
const hasVerticalScroll = ref(false);
const hasHorizontalScroll = ref(false);
const verticalThumbStyle = ref<Record<string, string>>({});
const horizontalThumbStyle = ref<Record<string, string>>({});

const MIN_THUMB_SIZE = 40;

const toCssSize = (value: SizeValue | undefined): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

const wrapStyle = computed(() => ({
  height: toCssSize(props.height),
  maxHeight: toCssSize(props.maxHeight),
}));

function handleScroll(event: Event): void {
  updateThumbState();
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

function getMinThumbSizePercent(trackSize: number): number {
  return trackSize ? (MIN_THUMB_SIZE / trackSize) * 100 : 100;
}

function updateThumbState(): void {
  const wrap = wrapRef.value;

  if (!wrap) return;

  const { clientHeight, scrollHeight, scrollTop, clientWidth, scrollWidth, scrollLeft } = wrap;

  hasVerticalScroll.value = scrollHeight > clientHeight + 1;
  hasHorizontalScroll.value = scrollWidth > clientWidth + 1;

  if (hasVerticalScroll.value && clientHeight > 0) {
    const sizePercent = Math.max((clientHeight * 100) / scrollHeight, getMinThumbSizePercent(clientHeight));
    const movePercent = (scrollTop * 100) / clientHeight;

    verticalThumbStyle.value = {
      height: `${sizePercent}%`,
      transform: `translateY(${movePercent}%)`,
    };
  } else {
    verticalThumbStyle.value = {};
  }

  if (hasHorizontalScroll.value && clientWidth > 0) {
    const sizePercent = Math.max((clientWidth * 100) / scrollWidth, getMinThumbSizePercent(clientWidth));
    const movePercent = (scrollLeft * 100) / clientWidth;

    horizontalThumbStyle.value = {
      width: `${sizePercent}%`,
      transform: `translateX(${movePercent}%)`,
    };
  } else {
    horizontalThumbStyle.value = {};
  }
}

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  void nextTick(updateThumbState);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateThumbState);
    if (wrapRef.value) resizeObserver.observe(wrapRef.value);
    if (viewRef.value) resizeObserver.observe(viewRef.value);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateThumbState, { passive: true });
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateThumbState);
  }
});

watch([() => props.height, () => props.maxHeight, () => props.native], () => {
  void nextTick(updateThumbState);
});

defineExpose({
  wrapRef,
  setScrollTop,
  setScrollLeft,
  updateThumbState,
});
</script>

<template>
  <div class="s-scrollbar el-scrollbar" :class="{ 's-scrollbar_native': native }">
    <div ref="wrapRef" class="el-scrollbar__wrap" :style="wrapStyle" @scroll="handleScroll">
      <div ref="viewRef" class="el-scrollbar__view">
        <slot />
      </div>
    </div>

    <div v-if="!native" v-show="hasVerticalScroll" class="el-scrollbar__bar is-vertical">
      <div class="el-scrollbar__thumb" :style="verticalThumbStyle"></div>
    </div>
    <div v-if="!native" v-show="hasHorizontalScroll" class="el-scrollbar__bar is-horizontal">
      <div class="el-scrollbar__thumb" :style="horizontalThumbStyle"></div>
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
    min-height: 40px;
    will-change: transform;
  }

  > .el-scrollbar__bar.is-horizontal .el-scrollbar__thumb {
    min-width: 40px;
    height: 100%;
    will-change: transform;
  }

  &.s-scrollbar_native > .el-scrollbar__bar {
    display: none;
  }
}
</style>
