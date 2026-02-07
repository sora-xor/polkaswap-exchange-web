<template>
  <account-settings-option
    v-model="model"
    :disabled="disabled"
    :title="t('accountSettings.signature.title')"
    :hint="t('accountSettings.hint')"
    :with-hint="withHint"
  >
    <slot></slot>
    <div v-if="disabled || model" class="save-password-duration">
      <template v-if="passwordResetDate">
        <div class="save-password-duration-saved">
          <span class="save-password-duration-title">{{ t('accountSettings.disabled') }}:</span>
          <span> {{ passwordResetDate }}</span>
        </div>
      </template>
      <template v-else>
        <span class="save-password-duration-title">{{ t('accountSettings.disable') }}:</span>
        <s-tabs v-model="passwordTimeoutModel" type="rounded" class="save-password-durations">
          <s-tab
            v-for="duration in durations"
            :key="duration"
            :label="duration"
            :name="duration"
            :disabled="disabled"
          ></s-tab>
        </s-tabs>
      </template>
    </div>
  </account-settings-option>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { PassphraseTimeout, PassphraseTimeoutDuration, DefaultPassphraseTimeout } from '@/consts';
import { requireLegacyStore } from '@/utils/legacy-store';

import AccountSettingsOption from './Option.vue';

dayjs.extend(relativeTime);

const props = withDefaults(
  defineProps<{
    withHint?: boolean;
    disabled?: boolean;
  }>(),
  {
    withHint: false,
    disabled: false,
  }
);

const store = requireLegacyStore();

const { t, dayjsLocale } = useTranslation();

const durations = PassphraseTimeout;

const timestamp = ref<number | null>(null);
const timer = ref<ReturnType<typeof setInterval> | null>(null);

const updateTimestamp = () => {
  timestamp.value = Date.now();
};

const resetTimer = () => {
  if (timer.value) {
    clearInterval(timer.value);
  }
  timer.value = null;
  timestamp.value = null;
};

const createTimer = () => {
  resetTimer();
  updateTimestamp();
  timer.value = setInterval(updateTimestamp, 1000);
};

onMounted(() => {
  createTimer();
});

onUnmounted(() => {
  resetTimer();
});

const model = computed({
  get: () => store.state.wallet.transactions.isSignTxDialogDisabled,
  set: (value: boolean) => {
    store.commit.wallet.transactions.setSignTxDialogDisabled(value);

    if (!value) {
      store.dispatch.wallet.account.resetAccountPassphrase(store.state.wallet.account.address);
    }
  },
});

const passwordTimeoutModel = computed<PassphraseTimeout>({
  get: () => {
    const currentTimeout = store.state.wallet.account.accountPasswordTimeout;
    const key = (Object.keys(PassphraseTimeoutDuration) as PassphraseTimeout[]).find(
      (durationKey) => PassphraseTimeoutDuration[durationKey] === currentTimeout
    );

    return key ?? PassphraseTimeout.FIFTEEN_MINUTES;
  },
  set: (name) => {
    const duration = PassphraseTimeoutDuration[name] ?? DefaultPassphraseTimeout;
    store.commit.wallet.account.setPasswordTimeout(duration);
  },
});

const passwordResetDate = computed<Nullable<string>>(() => {
  const accountTimestamp = store.state.wallet.account.accountPasswordTimestamp[store.state.wallet.account.address];

  if (!accountTimestamp || !timestamp.value) {
    return null;
  }

  const diff = accountTimestamp + store.state.wallet.account.accountPasswordTimeout - timestamp.value;

  return dayjs.duration(diff).locale(dayjsLocale.value).humanize();
});

defineExpose({
  model,
  passwordTimeoutModel,
  durations,
});
</script>

<style lang="scss">
$telegram-web-app-width: 500px;

.save-password-durations {
  .el-tabs__header {
    margin-bottom: 0;
  }

  &.s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    text-transform: initial;

    &.is-disabled {
      cursor: not-allowed;
    }
  }

  // override s-tabs arrows
  .el-icon-arrow-left,
  .el-icon-arrow-right {
    display: block;
    margin-top: 10px;
  }

  &.s-tabs.s-rounded .el-tabs__header {
    @media screen and (max-width: $telegram-web-app-width) {
      display: flex;
      justify-content: center;
      align-items: center;
      width: auto;

      .el-tabs__nav-wrap .el-tabs__item.is-active {
        box-shadow: 0 0 2px 1px var(--s-shadow-color-dark);
      }
    }
  }

  .el-tabs__nav-scroll {
    @media screen and (max-width: $telegram-web-app-width) {
      width: 260px;
    }
  }
}
</style>

<style lang="scss" scoped>
.save-password-duration {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-small;

  &-title {
    font-size: var(--s-font-size-extra-small);
    font-weight: 700;
    text-transform: uppercase;
  }

  &-saved {
    display: flex;
    flex-flow: row wrap;
    align-items: baseline;
    gap: $basic-spacing;
  }
}
</style>
