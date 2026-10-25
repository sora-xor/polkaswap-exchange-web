<template>
  <div ref="scrollbar" class="scrollbar" @mousedown="clickTrackHandler">
    <div ref="thumb" class="thumb" :style="style" @mousedown="clickThumbHandler"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const bar = {
  offset: 'offsetHeight',
  scroll: 'scrollTop',
  scrollSize: 'scrollHeight',
  size: 'height',
  key: 'vertical',
  axis: 'Y',
  client: 'clientY',
  direction: 'top',
};

const props = withDefaults(
  defineProps<{
    move?: number;
    scrollHeight?: number;
    size?: number;
  }>(),
  {
    move: 0,
    scrollHeight: 0,
    size: 0,
  }
);

const emit = defineEmits<{
  (event: 'change', value: number): void;
}>();

const scrollbar = ref<HTMLDivElement | null>(null);
const thumb = ref<HTMLDivElement | null>(null);

const cursorDown = ref(false);
const barAxisValue = ref(0);

const style = computed(() => ({
  transform: `translate${bar.axis}(${props.move}%)`,
  height: props.size < 100 ? `${props.size}%` : '',
}));

function startDrag(e: Event): void {
  e.stopImmediatePropagation?.();
  cursorDown.value = true;

  document.addEventListener('mousemove', mouseMoveDocumentHandler);
  document.addEventListener('mouseup', mouseUpDocumentHandler);
  document.onselectstart = () => false;
}

function clickThumbHandler(e: MouseEvent): void {
  if (e.ctrlKey || e.button === 2) return;

  startDrag(e);
  const target = e.currentTarget as HTMLElement;
  const offset = target[bar.offset as 'offsetHeight'];
  const diff = e[bar.client as 'clientY'] - target.getBoundingClientRect()[bar.direction as 'top'];
  barAxisValue.value = offset - diff;
}

function clickTrackHandler(e: MouseEvent): void {
  const target = e.currentTarget as HTMLElement;
  const offset = Math.abs(target.getBoundingClientRect()[bar.direction as 'top'] - e[bar.client as 'clientY']);
  const thumbHalf = (thumb.value?.[bar.offset as 'offsetHeight'] ?? 0) / 2;
  const trackSize = target[bar.offset as 'offsetHeight'];
  if (!trackSize) return;

  const thumbPositionPercentage = ((offset - thumbHalf) * 100) / trackSize;
  const scrollTop = (thumbPositionPercentage * props.scrollHeight) / 100;

  emit('change', scrollTop);
}

function mouseMoveDocumentHandler(e: MouseEvent): void {
  if (!cursorDown.value) return;

  const prevPage = barAxisValue.value;
  if (!prevPage) return;

  const scrollbarEl = scrollbar.value;
  const thumbEl = thumb.value;
  if (!scrollbarEl || !thumbEl) return;

  const offset = (scrollbarEl.getBoundingClientRect()[bar.direction as 'top'] - e[bar.client as 'clientY']) * -1;
  const thumbClickPosition = thumbEl[bar.offset as 'offsetHeight'] - prevPage;
  const scrollbarSize = scrollbarEl[bar.offset as 'offsetHeight'];
  if (!scrollbarSize) return;

  const thumbPositionPercentage = ((offset - thumbClickPosition) * 100) / scrollbarSize;
  const scrollTop = (thumbPositionPercentage * props.scrollHeight) / 100;

  emit('change', scrollTop);
}

function mouseUpDocumentHandler(): void {
  cursorDown.value = false;
  barAxisValue.value = 0;
  document.removeEventListener('mousemove', mouseMoveDocumentHandler);
  document.removeEventListener('mouseup', mouseUpDocumentHandler);
  document.onselectstart = null;
}

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', mouseUpDocumentHandler);
  document.removeEventListener('mousemove', mouseMoveDocumentHandler);
  document.onselectstart = null;
});

defineExpose({
  scrollbar,
  thumb,
  clickThumbHandler,
  clickTrackHandler,
  startDrag,
  mouseMoveDocumentHandler,
  mouseUpDocumentHandler,
});
</script>

<style lang="scss" scoped>
.scrollbar {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 6px;

  .thumb {
    width: 100%;
    background: var(--s-color-base-content-tertiary);
    border-radius: 6px;
    cursor: pointer;
  }
}
</style>
