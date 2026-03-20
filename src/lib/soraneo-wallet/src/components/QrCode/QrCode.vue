<template>
  <div ref="container" class="qr-code" :style="{ width: `${size}px`, height: `${size}px` }"></div>
</template>

<script lang="ts">
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import { EncodeHintType, QRCodeDecoderErrorCorrectionLevel } from '@zxing/library';
import { defineComponent } from 'vue';

const writer = new BrowserQRCodeSvgWriter();
const hints = new Map();
hints.set(EncodeHintType.ERROR_CORRECTION, QRCodeDecoderErrorCorrectionLevel.Q);

export default defineComponent({
  props: {
    value: {
      default: '',
      type: String,
    },
    size: {
      default: 260,
      type: Number,
    },
  },
  data() {
    return {
      element: null as Nullable<SVGSVGElement>,
    };
  },
  watch: {
    value(this: any): void {
      this.rerender();
    },
  },
  mounted(this: any): void {
    this.renderCode();
  },
  methods: {
    rerender(this: any): void {
      this.renderCode();
    },
    clearContainer(this: any): void {
      const container = (this.$refs as Record<string, any>).container as HTMLDivElement | undefined;

      if (container?.firstChild) {
        container.firstChild.remove();
      }
    },
    renderCode(this: any): void {
      const container = (this.$refs as Record<string, any>).container as HTMLDivElement | undefined;

      if (!container) return;

      this.clearContainer();
      this.element = writer.write(this.value, this.size, this.size, hints);
      container.appendChild(this.element);
    },
  },
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
