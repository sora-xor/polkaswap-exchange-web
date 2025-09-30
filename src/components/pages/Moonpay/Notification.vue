<template>
  <dialog-base :visible.sync="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <simple-notification :success="success" @submit.native.prevent="close">
      <template #title>{{ title }}</template>
      <template #text><div v-html="sanitizedText" /></template>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { Theme } from '@/consts/theme';
import { mutation, state, getter } from '@/store/decorators';
import { sanitizeHtml } from '@/utils/sanitize';

import { MoonpayNotifications } from './consts';

@Component({
  components: {
    MoonpayLogo,
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
})
export default class MoonpayNotification extends Mixins(TranslationMixin) {
  @state.moonpay.notificationKey private notificationKey!: MoonpayNotifications;
  @state.moonpay.notificationVisibility private notificationVisibility!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

  @mutation.moonpay.setNotificationVisibility private setNotificationVisibility!: (flag: boolean) => void;

  get visibility(): boolean {
    return this.notificationVisibility;
  }

  set visibility(flag: boolean) {
    this.setNotificationVisibility(flag);
  }

  get success(): boolean {
    return this.notificationKey === MoonpayNotifications.Success;
  }

  get title(): string {
    if (!this.notificationKey) return '';
    return this.t(`moonpay.notifications.${this.notificationKey}.title`);
  }

  get text(): string {
    if (!this.notificationKey) return '';
    return this.t(`moonpay.notifications.${this.notificationKey}.text`);
  }

  get sanitizedText(): string {
    return sanitizeHtml(this.text, {
      allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br'],
      allowedAttributes: {
        '*': ['class'],
        a: ['href', 'rel', 'target', 'title', 'class'],
      },
    });
  }

  close(): void {
    this.visibility = false;
  }
}
</script>
