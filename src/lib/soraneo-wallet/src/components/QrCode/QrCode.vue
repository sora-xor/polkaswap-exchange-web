<template>
  <div ref="container" class="qr-code" :style="{ width: `${size}px`, height: `${size}px` }"></div>
</template>

<script setup lang="ts">
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import { EncodeHintType, QRCodeDecoderErrorCorrectionLevel } from '@zxing/library';
import { onMounted, ref, watch } from 'vue';

const writer = new BrowserQRCodeSvgWriter();
const hints = new Map();
hints.set(EncodeHintType.ERROR_CORRECTION, QRCodeDecoderErrorCorrectionLevel.Q);

const props = withDefaults(
  defineProps<{
    value?: string;
    size?: number;
  }>(),
  {
    value: '',
    size: 260,
  }
);

const container = ref<HTMLDivElement>();
const element = ref<Nullable<SVGSVGElement>>(null);

function clearContainer(): void {
  if (container.value?.firstChild) {
    container.value.firstChild.remove();
  }
}

function renderCode(): void {
  if (!container.value) return;

  clearContainer();
  element.value = writer.write(props.value, props.size, props.size, hints);
  container.value.appendChild(element.value);
}

function rerender(): void {
  renderCode();
}

watch(() => props.value, rerender);

onMounted(() => {
  renderCode();
});
</script>

<style lang="scss" scoped>
$qr-background-color: #f7f3f4;

.qr-code {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $qr-background-color;
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-element-pressed);
}
</style>
