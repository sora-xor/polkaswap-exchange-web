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
    <img class="progress-circle__image" :src="imageSrc" :alt="imageName" :width="imageSize" :height="imageSize" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class ProgressCard extends Vue {
  @Prop({ required: true, type: String })
  readonly imageName!: string;

  @Prop({ required: true, type: Number })
  readonly progressPercentage!: number;

  get svgSize(): number {
    return 72;
  }

  get strokeWidth(): number {
    return 3;
  }

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

  get imageSrc(): string {
    return require(`@/assets/img/points/${this.imageName}.svg`);
  }

  get imageSize(): number {
    return 27;
  }
}
</script>

<style lang="scss" scoped>
.progress-circle {
  position: relative;
  width: 72px;
  height: 72px;
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
  }
}
</style>
