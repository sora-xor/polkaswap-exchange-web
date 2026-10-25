<template>
  <div
    class="review-expiry"
    :class="{ 'is-expired': expired, 'is-soon': remainingSeconds <= 10 }"
    :aria-label="label"
    data-testid="discovery-review-expiry"
  >
    <span class="review-expiry-indicator" aria-hidden="true" />
    <div class="review-expiry-copy">
      <span class="review-expiry-label">{{ label }}</span>
      <strong v-if="expired" data-testid="discovery-review-expired">{{ expiredLabel }}</strong>
      <strong
        v-else
        role="timer"
        aria-live="off"
        :aria-label="`${label}: ${timeLabel}`"
        data-testid="discovery-review-timer"
        >{{ timeLabel }}</strong
      >
      <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
    </div>
    <button type="button" :disabled="disabled" data-testid="discovery-review-refresh" @click="emit('refresh')">
      {{ refreshLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

defineOptions({ name: 'DiscoveryReviewExpiry' });

const props = withDefaults(
  defineProps<{
    expiresAt: number;
    label: string;
    expiredLabel: string;
    refreshLabel: string;
    disabled?: boolean;
  }>(),
  { disabled: false }
);
const emit = defineEmits<{ refresh: [] }>();

const now = ref(Date.now());
const announcement = ref('');
const remainingSeconds = computed(() =>
  Number.isSafeInteger(props.expiresAt) ? Math.max(0, Math.ceil((props.expiresAt - now.value) / 1000)) : 0
);
const expired = computed(() => remainingSeconds.value === 0);
const timeLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
let timer: ReturnType<typeof setTimeout> | undefined;

/** Schedule from the absolute expiry so a delayed or suspended tab never extends the review. */
function scheduleTick(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  const remaining = props.expiresAt - Date.now();
  if (!Number.isSafeInteger(props.expiresAt) || remaining <= 0) return;
  timer = setTimeout(
    () => {
      now.value = Date.now();
      scheduleTick();
    },
    Math.min(remaining, remaining % 1000 || 1000)
  );
}

/** Only announce a threshold or expiry, never every second of the visible timer. */
watch(remainingSeconds, (current, previous) => {
  if (current === 0) announcement.value = props.expiredLabel;
  else if ((previous > 30 && current <= 30) || (previous > 10 && current <= 10)) {
    announcement.value = `${props.label}: ${timeLabel.value}`;
  }
});
watch(
  () => props.expiresAt,
  () => {
    now.value = Date.now();
    announcement.value = expired.value ? props.expiredLabel : '';
    scheduleTick();
  }
);

/** A foreground return immediately reconciles the timer after browser suspension. */
function syncOnVisibility(): void {
  if (document.visibilityState !== 'visible') return;
  now.value = Date.now();
  scheduleTick();
}

onMounted(() => {
  now.value = Date.now();
  if (expired.value) announcement.value = props.expiredLabel;
  scheduleTick();
  document.addEventListener('visibilitychange', syncOnVisibility);
});
onUnmounted(() => {
  if (timer) clearTimeout(timer);
  document.removeEventListener('visibilitychange', syncOnVisibility);
});
</script>

<style scoped lang="scss">
.review-expiry {
  --expiry-accent: var(--bot-accent, var(--s-color-action-text));
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 13px 14px;
  border-radius: 16px;
  color: var(--s-color-base-content-primary);
  background: var(--bot-recess, var(--s-color-base-background));
  box-shadow: var(--bot-shadow-inset, inset 2px 2px 5px var(--s-shadow-color-dark));
  font-variant-numeric: tabular-nums;
}
.review-expiry.is-soon {
  --expiry-accent: var(--s-color-status-warning-text);
}
.review-expiry.is-expired {
  --expiry-accent: var(--s-color-status-error-text);
}
.review-expiry-indicator {
  flex: 0 0 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--expiry-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--expiry-accent) 13%, transparent);
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
}
.review-expiry-copy {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.review-expiry-label {
  color: var(--bot-muted, var(--s-color-base-content-secondary));
  font-size: 12px;
  line-height: 1.4;
}
.review-expiry-copy strong {
  color: var(--expiry-accent);
  font-size: 15px;
  font-weight: 750;
  line-height: 1.3;
  white-space: nowrap;
}
.review-expiry button {
  min-height: 44px;
  padding: 7px 12px;
  border: 0;
  border-radius: 11px;
  color: var(--s-color-base-content-primary);
  background: var(--bot-surface, var(--s-color-utility-surface));
  box-shadow: var(--bot-shadow-raised, 2px 2px 5px var(--s-shadow-color-dark));
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}
.review-expiry button:hover:not(:disabled) {
  transform: translateY(-1px);
}
.review-expiry button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--bot-shadow-inset, inset 2px 2px 5px var(--s-shadow-color-dark));
}
.review-expiry button:focus-visible {
  outline: 2px solid var(--expiry-accent);
  outline-offset: 3px;
}
.review-expiry button:disabled {
  cursor: default;
  opacity: 0.6;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
@media (max-width: 520px) {
  .review-expiry {
    flex-wrap: wrap;
  }
  .review-expiry button {
    flex-basis: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .review-expiry-indicator,
  .review-expiry button {
    transition: none;
  }
}
</style>
