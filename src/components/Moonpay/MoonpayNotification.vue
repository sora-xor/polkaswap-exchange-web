<template>
  <div class="moonpay-notification">
    <s-icon :class="['moonpay-notification-icon', { success }]" :name="iconName" size="64" />
    <div class="moonpay-notification__title">{{ title }}</div>
    <div class="moonpay-notification__text">{{ text }}</div>
    <s-button class="moonpay-notification__button s-typography-button--large" @click="onClick">OK</s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { MoonpayNotifications } from './consts'

@Component
export default class MoonpayNotification extends Mixins(TranslationMixin) {
  @Prop({ default: MoonpayNotifications.Success, type: String }) readonly notification!: MoonpayNotifications
  @Prop({ default: () => {}, type: Function }) readonly onClick!: () => void

  get success (): boolean {
    return this.notification === MoonpayNotifications.Success
  }

  get iconName (): string {
    return this.success ? 'basic-check-mark-24' : 'notifications-alert-triangle-24'
  }

  get title (): string {
    return this.t(`moonpay.notifications.${this.notification}.title`)
  }

  get text (): string {
    return this.t(`moonpay.notifications.${this.notification}.text`)
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
