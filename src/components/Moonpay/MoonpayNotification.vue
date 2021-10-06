<template>
  <dialog-base :visible.sync="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <div class="moonpay-notification">
      <s-icon :class="['moonpay-notification-icon', { success }]" :name="iconName" size="64" />
      <div class="moonpay-notification__title">{{ title }}</div>
      <div class="moonpay-notification__text" v-html="text" />
      <s-button class="moonpay-notification__button s-typography-button--large" @click="close">{{
        t('closeText')
      }}</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, State, Getter } from 'vuex-class';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import DialogBase from '@/components/DialogBase.vue';
import MoonpayLogo from '@/components/logo/Moonpay.vue';

import { MoonpayNotifications } from './consts';

@Component({
  components: {
    DialogBase,
    MoonpayLogo,
  },
})
export default class MoonpayNotification extends Mixins(TranslationMixin) {
  @Getter libraryTheme!: Theme;
  @State((state) => state.moonpay.notificationKey) notificationKey!: MoonpayNotifications;
  @State((state) => state.moonpay.notificationVisibility) notificationVisibility!: boolean;
  @Action('setNotificationVisibility', { namespace: 'moonpay' }) setNotificationVisibility!: (
    flag: boolean
  ) => Promise<void>;

  get visibility(): boolean {
    return this.notificationVisibility;
  }

  set visibility(flag: boolean) {
    this.setNotificationVisibility(flag);
  }

  get success(): boolean {
    return this.notificationKey === MoonpayNotifications.Success;
  }

  get iconName(): string {
    return this.success ? 'basic-check-mark-24' : 'notifications-alert-triangle-24';
  }

  get title(): string {
    if (!this.notificationKey) return '';
    return this.t(`moonpay.notifications.${this.notificationKey}.title`);
  }

  get text(): string {
    if (!this.notificationKey) return '';
    return this.t(`moonpay.notifications.${this.notificationKey}.text`);
  }

  close(): void {
    this.visibility = false;
  }
}
</script>

<style lang="scss" scoped>
.moonpay-notification {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  text-align: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-icon {
    color: var(--s-color-status-error);

    &.success {
      color: var(--s-color-theme-secondary);
    }
  }

  &__title {
    font-size: var(--s-font-size-large);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-mini);
    line-height: var(--s-line-height-small);
  }

  &__text {
    font-size: var(--s-font-size-small);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
  }

  &__button {
    width: 100%;
  }
}
</style>
