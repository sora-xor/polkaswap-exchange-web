<script setup lang="ts">
import { validateHorizontalPlacement, validateVerticalPlacement } from './util'
import type { ToastsApi } from './api'
import { TOASTS_API_KEY } from './api'
import { forceInject } from '@/util'
import type { PropType } from 'vue'
import type { ToastsDisplayPlacementVertical, ToastsDisplayPlacementHorizontal } from './types'

const props = defineProps({
  vertical: {
    type: String as PropType<ToastsDisplayPlacementVertical>,
    default: 'bottom',
    validate: validateVerticalPlacement,
  },
  horizontal: {
    type: String as PropType<ToastsDisplayPlacementHorizontal>,
    default: 'left',
    validate: validateHorizontalPlacement,
  },
  absolute: Boolean,
  /**
   * Where to teleport it
   */
  to: {
    type: String,
    default: 'body',
  },
  apiKey: {
    type: [String, Symbol],
    default: TOASTS_API_KEY,
  },
})

const api = forceInject<ToastsApi>(props.apiKey)

// no need in entering height transition due to stack nature of toasts
function leave(element: HTMLElement) {
  const height = getComputedStyle(element).height

  element.style.height = height

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  getComputedStyle(element).height

  requestAnimationFrame(() => {
    element.style.height = '0'
  })
}
</script>

<template>
  <Teleport :to="to" :disabled="!to">
    <div
      class="s-toasts-display"
      data-testid="root"
      :data-placement-v="vertical"
      :data-placement-h="horizontal"
      :data-absolute="absolute"
    >
      <div class="s-toasts-display__stack" data-testid="list">
        <TransitionGroup name="s-toasts-display__grow-transition" @leave="leave as any">
          <div v-for="[key, toast] in api.toasts" :key="key" class="s-toasts-display__item">
            <div class="s-toasts-display__item-spacer" />
            <component :is="toast.slot" />
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss">
.s-toasts-display {
  @apply px-4 pointer-events-none inset-0 flex;

  &[data-absolute='true'] {
    @apply absolute;
  }

  &:not([data-absolute='true']) {
    @apply fixed;
  }

  &__stack {
    @apply flex flex-col;
  }

  @mixin vertical($placement) {
    &[data-placement-v='#{$placement}'] {
      @content;
    }
  }

  @mixin horizontal($placement) {
    &[data-placement-h='#{$placement}'] {
      @content;
    }
  }

  @mixin vertical-stack($placement) {
    &[data-placement-v='#{$placement}'] &__stack {
      @content;
    }
  }

  @mixin horizontal-stack($placement) {
    &[data-placement-h='#{$placement}'] &__stack {
      @content;
    }
  }

  @include vertical('top') {
    @apply items-start;
  }

  @include vertical('bottom') {
    @apply items-end pb-4;
  }

  @include vertical-stack('bottom') {
    @apply flex-col-reverse;
  }

  @include horizontal('left') {
    @apply justify-start;
  }

  @include horizontal('center') {
    @apply justify-center;
  }

  @include horizontal('right') {
    @apply justify-end;
  }

  @include horizontal-stack('left') {
    @apply items-start;
  }

  @include horizontal-stack('right') {
    @apply items-end;
  }

  @include horizontal-stack('center') {
    @apply items-center;
  }

  &__item {
    // hardware acceleration for expand transition
    will-change: height;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;

    &-spacer {
      @apply h-4;
    }

    & > * {
      @apply pointer-events-auto;
    }
  }

  &__grow-transition {
    $scale: 0.75;
    $transform-scale: scale($scale, $scale * $scale);
    $ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    $ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    $dur-height: 0.35s;
    $dur-transform: 0.25s;

    &-leave-active {
      transition:
        height $dur-height $dur-transform $ease-out-quart,
        opacity $dur-transform $ease-in-out;
    }

    &-enter-active {
      transition:
        opacity $dur-transform $ease-out-quart,
        transform $dur-transform $ease-out-quart;
    }

    &-enter-from {
      transform: $transform-scale;
      opacity: 0;
    }

    &-leave-to {
      opacity: 0;
      height: 0;
    }
  }
}
</style>
