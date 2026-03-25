<template>
  <dialog-base v-model:visible="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme"></moonpay-logo>
    </template>
    <simple-notification :success="success" @submit.prevent="close">
      <template #title>{{ title }}</template>
      <template #text>
        <div v-html="sanitizedText"></div>
      </template>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { useTranslation } from '@/composables/useTranslation';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';
import { sanitizeHtml } from '@/utils/sanitize';

import { MoonpayNotifications } from './consts';

defineOptions({
  components: {
    MoonpayLogo,
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
});

const { t } = useTranslation();
const moonpayStore = useMoonpayStore();
const settingsStore = useSettingsStore();

const visibility = computed({
  get: () => Boolean(moonpayStore.notificationVisibility),
  set: (flag: boolean) => {
    moonpayStore.setNotificationVisibility(flag);
  },
});

const notificationKey = computed(() => moonpayStore.notificationKey as MoonpayNotifications | '');
const libraryTheme = computed(() => settingsStore.libraryTheme);

const success = computed(() => notificationKey.value === MoonpayNotifications.Success);

const title = computed(() => {
  if (!notificationKey.value) return '';
  return t(`moonpay.notifications.${notificationKey.value}.title`);
});

const text = computed(() => {
  if (!notificationKey.value) return '';
  return t(`moonpay.notifications.${notificationKey.value}.text`);
});

const sanitizedText = computed(() =>
  sanitizeHtml(text.value, {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title', 'class'],
    },
  })
);

const close = () => {
  visibility.value = false;
};
</script>
