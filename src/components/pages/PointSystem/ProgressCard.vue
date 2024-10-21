<template>
  <div class="progress-circle">
    <svg :width="svgSize" :height="svgSize">
      <circle class="progress-circle__background" :cx="center" :cy="center" :r="radius" :stroke-width="strokeWidth" />
      <circle
        class="progress-circle__bar"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="progressDashOffset"
        stroke-linecap="round"
        :transform="'rotate(-90 ' + center + ' ' + center + ')'"
      />
    </svg>
    <token-logo
      v-if="isTokenImage"
      class="progress-circle__image"
      :token="getImageSrc(imageName)"
      :width="imageSize"
      :height="imageSize"
    />
    <img
      v-else
      class="progress-circle__image"
      :src="getImageSrc(imageName)"
      :alt="imageName"
      :width="imageSize"
      :height="imageSize"
    />
  </div>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Prop, Vue } from 'vue-property-decorator';

import { getImageSrc, isTokenImage } from '@/consts/pointSystem';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class ProgressCard extends Vue {
  private svgSize = 72;
  private strokeWidth = 3;
  private imageSize = 27;

  @Prop({ required: true, type: String })
  readonly imageName!: string;

  @Prop({ required: true, type: Number })
  readonly progressPercentage!: number;

  get center(): number {
    return this.svgSize / 2;
  }

  get radius(): number {
    return (this.svgSize - this.strokeWidth) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get progressDashOffset(): number {
    return this.circumference * (1 - this.progressPercentage / 100);
  }

  getImageSrc(imageName: string): any {
    return getImageSrc(imageName);
  }

  get isTokenImage(): boolean {
    return isTokenImage(this.imageName);
  }
}
</script>

<style lang="scss" scoped>
.progress-circle {
  position: relative;
  width: calc($inner-spacing-big * 3);
  height: calc($inner-spacing-big * 3);
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    position: absolute;
    top: 0;
    left: 0;
  }

  &__background,
  &__bar {
    fill: none;
    stroke-width: 3;
  }

  &__background {
    stroke: var(--s-color-status-info);
    opacity: 0.2;
  }

  &__bar {
    stroke: var(--s-color-status-info);
    stroke-width: 3px;
    transition: stroke-dashoffset 0.35s;
  }

  &__image {
    z-index: 1;
    width: $footer-height;
    height: $footer-height;
  }
}
</style>
