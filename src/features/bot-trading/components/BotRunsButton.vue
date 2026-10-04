<template>
  <div ref="root" class="bot-runs" :class="{ 'bot-runs--open': open }">
    <button
      ref="trigger"
      type="button"
      class="bot-runs-trigger"
      :class="`bot-runs-trigger--${tone}`"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="panelId"
      :aria-label="description"
      :title="description"
      data-testid="bot-runs-button"
      @click="toggle"
    >
      <span class="bot-runs-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2.5h6L17 6v10.5L15 18H9l-2-1.5V6l2-3.5Z" />
            <path d="M7 6h10M17 8.5h2.5v2.75H17M7 12H5.25v3H7" />
            <path d="M10 18v2M14 18v2M5 22v-1l4-1h6l4 1v1H5Z" />
          </g>
          <circle cx="10" cy="9.25" r="1.4" fill="currentColor" />
          <circle cx="14" cy="10.5" r="1" fill="currentColor" />
        </svg>
        <span class="bot-runs-dot" />
      </span>
      <span class="bot-runs-label" data-testid="bot-runs-label">{{ label }}</span>
      <span
        v-if="badge.count"
        class="bot-runs-badge"
        :class="`bot-runs-badge--${badge.tone}`"
        data-testid="bot-runs-badge"
        aria-hidden="true"
        >{{ badge.count }}</span
      >
    </button>
    <div
      v-if="open"
      :id="panelId"
      ref="panel"
      class="bot-runs-panel"
      role="dialog"
      tabindex="-1"
      :aria-labelledby="`${panelId}-title`"
      data-testid="bot-runs-panel"
      @keydown.esc.stop="close(true)"
    >
      <div class="bot-runs-panel-head">
        <h2 :id="`${panelId}-title`">{{ t('bots.runs.title') }}</h2>
        <button type="button" class="bot-runs-close" :aria-label="t('closeText')" @click="close(true)">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p v-if="!runs || !runs.ready.value" class="bot-runs-note" role="status">{{ t('bots.loading') }}</p>
      <template v-else>
        <p v-if="!runs.items.value.length" class="bot-runs-note">{{ t('bots.runs.none') }}</p>
        <BotRunList
          v-else
          :items="runs.items.value"
          :busy="runs.busy.value"
          :failure="runs.failure.value"
          @pause="runs.pause"
          @resume="runs.resume"
          @stop="runs.stop"
          @open="openBot"
          @connect="connect"
        />
      </template>
      <p class="bot-runs-note">{{ t('bots.runs.keepOpen') }}</p>
      <p class="bot-runs-note">{{ t('bots.runs.controls') }}</p>
      <RouterLink class="bot-runs-manage" :to="manageLocation" data-testid="bot-runs-manage" @click="close()">
        {{ t('bots.runs.manage') }} <span aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';
import { botWorkspaceLocation } from '../navigation';
import BotRunList from './BotRunList.vue';
import type { BotRuns } from '../runs';

defineOptions({ name: 'BotRunsButton' });

/**
 * Top-bar status for saved bots: how many run, and how many wait for the user. The panel lists
 * them with Pause, Resume and Stop, explains that bots run only while this tab is open, and links
 * to My Bots. The bot engine loads on mount; the app header renders this only while
 * `botRunsHint` says this browser has bots to show.
 */
const { t } = useTranslation();
const router = useRouter();
const route = useRoute();
const { connectSoraWallet } = useInternalConnect();
const panelId = `bot-runs-${useId().replace(/:/g, '')}`;
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const open = ref(false);
const runs = shallowRef<BotRuns | null>(null);
const manageLocation = botWorkspaceLocation('bots');

onMounted(async () => {
  try {
    const module = await loadAsyncImportWithRetry(() => import('../runs'));
    runs.value = module.useBotRuns();
  } catch {
    /* The panel still links to My Bots, where the page loads the engine itself. */
  }
});

const running = computed(() => runs.value?.runningCount.value ?? 0);
const waiting = computed(() => runs.value?.waitingCount.value ?? 0);
const total = computed(() => runs.value?.items.value.length ?? 0);
const ready = computed(() => Boolean(runs.value?.ready.value));

/** Running bots lead the label; bots that wait for the user add a badge, or lead when none run. */
const tone = computed(() =>
  !ready.value ? 'idle' : running.value ? (waiting.value ? 'mixed' : 'running') : waiting.value ? 'attention' : 'paused'
);
const label = computed(() => {
  if (!ready.value) return t('bots.title');
  if (running.value) return t('bots.runs.running', { count: running.value });
  if (waiting.value) return t('bots.runs.waiting', { count: waiting.value });
  return t('bots.runs.paused', { count: total.value });
});
/** The count the icon carries on phones; on wider screens it shows only the waiting bots next to a running label. */
const badge = computed(() => {
  if (!ready.value) return { count: 0, tone: 'paused' };
  if (waiting.value) return { count: waiting.value, tone: 'attention' };
  if (running.value) return { count: running.value, tone: 'running' };
  return { count: total.value, tone: 'paused' };
});
const description = computed(() =>
  ready.value && running.value && waiting.value
    ? `${label.value}. ${t('bots.runs.waiting', { count: waiting.value })}`
    : label.value
);

function onPointerDown(event: PointerEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close();
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown, true));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true));
watch(
  () => route.fullPath,
  () => close()
);

async function toggle(): Promise<void> {
  if (open.value) {
    close();
    return;
  }
  open.value = true;
  void runs.value?.check();
  await nextTick();
  panel.value?.focus();
}

function close(returnFocus = false): void {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) trigger.value?.focus();
}

function openBot(id: string): void {
  close();
  void router.push(botWorkspaceLocation('bots', { botId: id }));
}

function connect(): void {
  close();
  void connectSoraWallet();
}
</script>

<style scoped lang="scss">
.bot-runs {
  position: relative;
  flex: 0 0 auto;
}
.bot-runs-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px 0 10px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--s-color-base-content-primary);
  background: var(--s-color-utility-body);
  box-shadow:
    1px 1px 5px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    -1px -1px 5px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  cursor: pointer;
  &:hover {
    color: var(--s-color-theme-accent);
  }
}
.bot-runs--open .bot-runs-trigger {
  box-shadow:
    inset 2px 2px 5px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -2px -2px 5px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
}
.bot-runs-icon {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--s-color-base-content-secondary);
  svg {
    width: 24px;
    height: 24px;
  }
}
.bot-runs-dot {
  position: absolute;
  inset-block-start: -1px;
  inset-inline-end: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid var(--s-color-utility-body);
  background: var(--s-color-base-content-tertiary, #a19a9d);
}
.bot-runs-trigger--running .bot-runs-dot,
.bot-runs-trigger--mixed .bot-runs-dot {
  background: var(--s-color-status-success, #34ad87);
}
.bot-runs-trigger--attention .bot-runs-dot {
  background: var(--s-color-status-warning, #eba332);
}
@media (prefers-reduced-motion: no-preference) {
  .bot-runs-trigger--running .bot-runs-dot,
  .bot-runs-trigger--mixed .bot-runs-dot {
    animation: bot-runs-pulse 2s ease-in-out infinite;
  }
}
@keyframes bot-runs-pulse {
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--s-color-status-success, #34ad87) 25%, transparent);
  }
}
.bot-runs-badge {
  display: none;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--s-color-on-action, #fff);
  background: var(--s-color-base-content-tertiary, #a19a9d);
  &--attention {
    background: var(--s-color-status-warning, #eba332);
  }
  &--running {
    background: var(--s-color-status-success, #34ad87);
  }
}
/* With a running label, the badge adds the bots that wait for the user. */
.bot-runs-trigger--mixed .bot-runs-badge {
  display: inline-grid;
}

.bot-runs-panel {
  position: absolute;
  inset-block-start: calc(100% + 10px);
  inset-inline-end: 0;
  z-index: 1000;
  display: grid;
  gap: 12px;
  width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 96px);
  overflow: auto;
  padding: 16px;
  border-radius: 20px;
  color: var(--s-color-base-content-primary);
  background: var(--s-color-utility-surface);
  box-shadow: 0 18px 48px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.18));
  text-align: start;
  white-space: normal;
  /* Focus moves here so screen readers announce the panel; its controls keep the app's focus ring. */
  &:focus,
  &:focus-visible {
    outline: none !important;
  }
}
.bot-runs-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
  }
}
.bot-runs-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
  color: var(--s-color-base-content-secondary);
  background: var(--s-color-base-background);
  cursor: pointer;
}
.bot-runs-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--s-color-base-content-secondary);
}
.bot-runs-manage {
  justify-self: start;
  font-size: 13px;
  font-weight: 700;
  color: var(--s-color-action-text, #ab0555);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

/* Phones: the top bar has room for an icon and a count only. */
@include large-mobile(true) {
  .bot-runs-trigger {
    width: 42px;
    padding: 0;
    justify-content: center;
    gap: 0;
  }
  .bot-runs-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .bot-runs-badge {
    position: absolute;
    inset-block-start: -4px;
    inset-inline-end: -4px;
    display: inline-grid;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    font-size: 10px;
  }
  .bot-runs-dot {
    display: none;
  }
  .bot-runs-panel {
    position: fixed;
    inset-block-start: 72px;
    inset-inline: 16px;
    width: auto;
  }
}
</style>
