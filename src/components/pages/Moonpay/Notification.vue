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
import { components } from '@wallet';
import { computed } from 'vue';

import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { useTranslation } from '@/composables/useTranslation';
import { sanitizeHtml } from '@/utils/sanitize';
import store from '@/store';
import { resolveLibraryTheme } from '@/utils/resolveLibraryTheme';

import { MoonpayNotifications } from './consts';

import type { Theme } from '@/consts/theme';

defineOptions({
  components: {
    MoonpayLogo,
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
});

const { t } = useTranslation();

const visibility = computed({
  get: () => Boolean(store.state.moonpay.notificationVisibility),
  set: (flag: boolean) => {
    store.commit.moonpay.setNotificationVisibility(flag);
  },
});

const notificationKey = computed(() => store.state.moonpay.notificationKey as MoonpayNotifications | '');
const libraryTheme = computed(() => resolveLibraryTheme(store) as Theme);

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
