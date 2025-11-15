<script setup lang="ts">
import { validateHorizontalPlacement, validateVerticalPlacement } from './util';
import type { ToastsApi } from './api';
import { TOASTS_API_KEY } from './api';
import { forceInject } from '@soramitsu-ui/ui/util';
import type { PropType } from 'vue';
import type { ToastsDisplayPlacementVertical, ToastsDisplayPlacementHorizontal } from './types';

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
});

const api = forceInject<ToastsApi>(props.apiKey);

// no need in entering height transition due to stack nature of toasts
function leave(element: HTMLElement) {
  const height = getComputedStyle(element).height;

  element.style.height = height;

  getComputedStyle(element).height;

  requestAnimationFrame(() => {
    element.style.height = '0';
  });
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
