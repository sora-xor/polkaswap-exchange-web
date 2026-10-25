<template>
  <ul class="bot-run-list" data-testid="bot-run-list">
    <li
      v-for="item in items"
      :key="item.id"
      class="bot-run"
      :class="`bot-run--${item.state}`"
      :data-testid="`bot-run-${item.id}`"
    >
      <div class="bot-run-head">
        <span class="bot-run-dot" aria-hidden="true" />
        <strong class="bot-run-name">{{ item.name }}</strong>
        <span class="bot-run-mode">{{ t(`bots.modes.${item.mode}`) }}</span>
      </div>
      <p class="bot-run-pair">
        <span>{{ item.assetIn }} / {{ item.assetOut }}</span>
        <template v-if="item.returnPercent !== null">
          <span aria-hidden="true">·</span>
          <span :data-testid="`bot-run-result-${item.id}`"
            >{{ t('bots.runs.result', { symbol: item.assetIn }) }}
            <bdi class="bot-run-number" :class="tone(item.returnPercent)">{{
              signedPercent(item.returnPercent)
            }}</bdi></span
          >
        </template>
      </p>
      <p class="bot-run-status" :data-testid="`bot-run-status-${item.id}`">
        <strong>{{ stateLabel(item) }}</strong> {{ stateDetail(item) }}
      </p>
      <form
        v-if="passwordFor === item.id"
        class="bot-run-password"
        :data-testid="`bot-run-password-${item.id}`"
        @submit.prevent="submitPassword(item)"
      >
        <label>
          <span>{{ t('bots.walletPassword') }}</span>
          <input ref="passwordInput" type="password" autocomplete="current-password" required />
        </label>
        <div class="bot-run-actions">
          <button type="submit" class="bot-run-primary" :disabled="busy">{{ t('bots.runs.continue') }}</button>
          <button type="button" @click="passwordFor = ''">{{ t('bots.goals.cancel') }}</button>
        </div>
      </form>
      <div v-else class="bot-run-actions">
        <button
          v-if="['running', 'elsewhere', 'continuing'].includes(item.state)"
          type="button"
          :disabled="busy"
          :data-testid="`bot-run-pause-${item.id}`"
          @click="emit('pause', item.id)"
        >
          {{ t('bots.pause') }}
        </button>
        <button
          v-if="item.state === 'paused' || item.state === 'password'"
          type="button"
          class="bot-run-primary"
          :disabled="busy"
          :data-testid="`bot-run-resume-${item.id}`"
          @click="resume(item)"
        >
          {{ t(item.state === 'password' ? 'bots.runs.continue' : 'bots.resume') }}
        </button>
        <button
          v-if="item.state === 'wallet'"
          type="button"
          class="bot-run-primary"
          :data-testid="`bot-run-connect-${item.id}`"
          @click="emit('connect')"
        >
          {{ t('bots.connectWallet') }}
        </button>
        <button
          v-if="item.state === 'open' || item.state === 'attention'"
          type="button"
          class="bot-run-primary"
          :data-testid="`bot-run-open-${item.id}`"
          @click="emit('open', item.id)"
        >
          {{ t('bots.runs.open') }}
        </button>
        <button type="button" :disabled="busy" :data-testid="`bot-run-stop-${item.id}`" @click="emit('stop', item.id)">
          {{ t('bots.stop') }}
        </button>
      </div>
      <p v-if="failure?.id === item.id" class="bot-run-error" role="alert">{{ t(failure.message) }}</p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import type { BotRunItem } from '../runs';

defineOptions({ name: 'BotRunList' });

/**
 * Saved bot runs with their state in plain words and the controls that apply: Pause, Resume or
 * Continue, Connect account, Open and Stop. Used by the top bar and the Bots page. It never stores
 * a password: the field is read once on submit, cleared, and passed to the `resume` handler.
 */
const props = defineProps<{
  items: BotRunItem[];
  busy?: boolean;
  failure?: { id: string; message: string } | null;
}>();
const emit = defineEmits<{
  pause: [id: string];
  resume: [id: string, password?: string];
  stop: [id: string];
  open: [id: string];
  connect: [];
}>();

const { t, language } = useTranslation();
const passwordFor = ref('');
const passwordInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null);

/** The app language as an Intl locale; unsupported or custom tags fall back to the browser default. */
const locale = computed(() => {
  const tag = (language?.value ?? '').replace('_', '-');
  try {
    return tag && Intl.DateTimeFormat.supportedLocalesOf([tag]).length ? tag : undefined;
  } catch {
    return undefined;
  }
});

function time(timestamp: number | null): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Exact percent string with the app's decimal mark and an explicit sign. */
function signedPercent(value: string): string {
  const number = new FPNumber(value);
  const sign = number.isGtZero() ? '+' : number.isLtZero() ? '-' : '';
  return `${sign}${number.abs().toLocaleString(2, true)}%`;
}
const tone = (value: string) => {
  const number = new FPNumber(value);
  return number.isGtZero() ? 'up' : number.isLtZero() ? 'down' : '';
};

function stateLabel(item: BotRunItem): string {
  switch (item.state) {
    case 'running':
      return t('bots.status.running');
    case 'elsewhere':
      return t('bots.runs.state.elsewhere');
    case 'continuing':
      return t('bots.runs.state.continuing');
    case 'paused':
      return t('bots.runs.state.pausedByYou');
    case 'attention':
      return t('bots.status.attention');
    default:
      return t('bots.status.paused');
  }
}

function stateDetail(item: BotRunItem): string {
  const until = time(item.endsAt);
  switch (item.state) {
    case 'running':
    case 'elsewhere':
      return t('bots.runs.detail.until', { time: until });
    case 'continuing':
      return t('bots.runs.detail.continuing', { time: until });
    case 'password':
      return t('bots.runs.detail.password', { time: until });
    case 'wallet':
      return t('bots.runs.detail.wallet', { account: shortAccount(item.account), time: until });
    case 'open':
      return t('bots.runs.detail.open');
    case 'paused':
      return t('bots.runs.detail.paused', { time: until });
    case 'attention':
      return t('bots.runs.detail.attention');
    default:
      return '';
  }
}

const shortAccount = (account: string) =>
  account.length > 12 ? `${account.slice(0, 6)}…${account.slice(-4)}` : account;

/** Live bots of the built-in wallet ask for the password first; everything else resumes directly. */
async function resume(item: BotRunItem): Promise<void> {
  if (item.needsPassword) {
    passwordFor.value = item.id;
    await nextTick();
    inputElement()?.focus();
    return;
  }
  emit('resume', item.id);
}

function inputElement(): HTMLInputElement | null {
  const value = passwordInput.value;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function submitPassword(item: BotRunItem): void {
  const input = inputElement();
  const password = input?.value ?? '';
  if (input) input.value = '';
  if (!password || props.busy) return;
  passwordFor.value = '';
  emit('resume', item.id, password);
}
</script>

<style scoped lang="scss">
.bot-run-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bot-run {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--s-color-base-background);
  box-shadow:
    inset 2px 2px 6px var(--s-shadow-color-dark),
    inset -2px -2px 6px var(--s-shadow-color-light-dark);
  color: var(--s-color-base-content-primary);
  font-size: 13px;
  line-height: 1.45;
}
.bot-run-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.bot-run-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.bot-run-mode {
  flex: 0 0 auto;
  margin-inline-start: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--s-color-base-content-secondary);
  background: var(--s-color-utility-surface);
}
.bot-run-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--s-color-base-content-tertiary, #a19a9d);
}
.bot-run--running .bot-run-dot,
.bot-run--elsewhere .bot-run-dot,
.bot-run--continuing .bot-run-dot {
  background: var(--s-color-status-success, #34ad87);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--s-color-status-success, #34ad87) 22%, transparent);
}
.bot-run--password .bot-run-dot,
.bot-run--wallet .bot-run-dot,
.bot-run--open .bot-run-dot,
.bot-run--attention .bot-run-dot {
  background: var(--s-color-status-warning, #eba332);
}
.bot-run-pair,
.bot-run-status {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  margin: 0;
  color: var(--s-color-base-content-secondary);
}
.bot-run-status strong {
  color: var(--s-color-base-content-primary);
}
.bot-run-number {
  direction: ltr;
  unicode-bidi: isolate;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  /* The same colours as the ready-made bot results on the Bots page. */
  &.up {
    color: var(--s-color-action-text, #ab0555);
  }
  &.down {
    color: color-mix(in srgb, var(--s-color-status-info, #479aef) 60%, var(--s-color-base-content-primary));
  }
}
.bot-run-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
  button {
    min-height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    color: var(--s-color-base-content-primary);
    background: var(--s-color-utility-surface);
    box-shadow:
      2px 2px 6px var(--s-shadow-color-dark),
      -2px -2px 6px var(--s-shadow-color-light-dark);
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .bot-run-primary {
    color: var(--s-color-on-action, #fff);
    background: var(--s-color-action-fill, #bf065f);
    box-shadow: none;
  }
}
.bot-run-password {
  display: grid;
  gap: 8px;
  label {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--s-color-base-content-secondary);
  }
  input {
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--s-color-base-border-secondary, rgba(0, 0, 0, 0.12));
    border-radius: 10px;
    font: inherit;
    color: var(--s-color-base-content-primary);
    background: var(--s-color-utility-surface);
  }
}
.bot-run-error {
  margin: 0;
  font-size: 12px;
  color: var(--s-color-status-error-text, #ab0555);
}
</style>
