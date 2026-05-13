<template>
  <div class="progress-circle">
    <svg :width="svgSize" :height="svgSize">
      <circle
        class="progress-circle__background"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
      ></circle>
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
      ></circle>
    </svg>
    <token-logo
      v-if="tokenImage"
      class="progress-circle__image"
      :token="imageSrc"
      :width="imageSize"
      :height="imageSize"
    ></token-logo>
    <img
      v-else
      class="progress-circle__image"
      :src="imageSrc"
      :alt="imageName"
      :width="imageSize"
      :height="imageSize"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { getImageSrc, isTokenImage } from '@/consts/pointSystem';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

/**
 * Displays a circular progress bar with the token or badge icon used in the points dashboard.
 */
defineOptions({
  name: 'ProgressCard',
  components: {
    TokenLogo: WalletComponentTokenLogo,
  },
});

const props = defineProps<{
  imageName: string;
  progressPercentage: number;
}>();

const { imageName } = toRefs(props);

const svgSize = 72;
const strokeWidth = 3;
const imageSize = 27;
const center = svgSize / 2;

const radius = computed(() => (svgSize - strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const progressDashOffset = computed(() => circumference.value * (1 - props.progressPercentage / 100));
const tokenImage = computed(() => isTokenImage(imageName.value));
const imageSrc = computed(() => getImageSrc(imageName.value));
</script>

<style lang="scss" scoped>
.progress-circle {
  position: relative;
  width: calc($inner-spacing-big * 3);
  height: calc($inner-spacing-big * 3);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);

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
    opacity: 0.18;
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
