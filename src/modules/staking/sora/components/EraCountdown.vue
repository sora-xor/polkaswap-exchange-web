<template>
  <span>{{ days }}D {{ hours }}H {{ minutes }}M {{ translationLabel }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';

const props = defineProps<{
  translationKey?: string;
  targetEra?: number;
}>();

const { t } = useI18n();
const { activeEra, activeEraStart } = useSoraStaking();

const days = ref(0);
const hours = ref(0);
const minutes = ref(0);

let interval: ReturnType<typeof setInterval> | null = null;

const translationLabel = computed(() => (props.translationKey ? t(props.translationKey) : ''));

const calculateCountdown = () => {
  if (!activeEra.value || !activeEraStart.value || !props.targetEra) {
    days.value = 0;
    hours.value = 0;
    minutes.value = 0;
    return;
  }

  const erasToTarget = props.targetEra - activeEra.value;
  if (erasToTarget <= 0) {
    days.value = 0;
    hours.value = 0;
    minutes.value = 0;
    return;
  }

  const start = new Date(activeEraStart.value);
  const targetDateTime = new Date(start.getTime() + erasToTarget * 6 * 3600000);
  const diff = targetDateTime.getTime() - Date.now();

  if (diff <= 0) {
    days.value = 0;
    hours.value = 0;
    minutes.value = 0;
    return;
  }

  days.value = Math.floor(diff / (1000 * 60 * 60 * 24));
  hours.value = Math.floor((diff / (1000 * 60 * 60)) % 24);
  minutes.value = Math.floor((diff / (1000 * 60)) % 60);
};

watch([() => props.targetEra, activeEra, activeEraStart], calculateCountdown, { immediate: true });

onMounted(() => {
  if (!interval) {
    interval = setInterval(calculateCountdown, 10_000);
  }
});

onBeforeUnmount(() => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
});

defineExpose({
  days,
  hours,
  minutes,
  translationLabel,
});
</script>
