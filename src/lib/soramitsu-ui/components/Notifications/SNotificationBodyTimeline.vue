<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import { useRafFn, useTimeoutFn } from '@vueuse/core';

const props = defineProps<{
  /**
   * 0 to disable
   */
  timeout: number;
}>();

const emit = defineEmits<(event: 'timeout') => void>();

const { timeout } = toRefs(props);

let timestamps: null | [startedAt: number, willFireAt: number] = null;
const timeoutProgress = ref(0);

const {
  start: startTimeout,
  stop: stopTimeout,
  isPending,
} = useTimeoutFn(
  () => {
    timestamps = null;
    emit('timeout');
  },
  timeout,
  { immediate: false }
);

const { pause: pauseUpdate, resume: resumeUpdate } = useRafFn(
  () => {
    if (timestamps) {
      const [begin, end] = timestamps;
      const now = performance.now();
      timeoutProgress.value = Math.max(0, Math.min(1, (now - begin) / (end - begin)));
    } else {
      timeoutProgress.value = 0;
      pauseUpdate();
    }
  },
  { immediate: false }
);

watch(
  timeout,
  (val) => {
    stopTimeout();
    timestamps = null;

    if (val) {
      const now = performance.now();
      timestamps = [now, now + val];

      startTimeout();
      resumeUpdate();
    }
  },
  { immediate: true }
);

const styleRight = computed<string>(() => `${timeoutProgress.value * 100}%`);
</script>

<template>
  <Transition name="s-notification-body-timeline__transition">
    <div v-if="isPending" class="s-notification-body-timeline" :style="{ right: styleRight }" />
  </Transition>
</template>
