<template>
  <div class="notification-enabling-pointer">
    <div class="notification-enabling-pointer__instructions">
      <div class="notification-enabling-pointer__text">{{ t('browserNotificationDialog.pointer') }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class NotificationEnablingPage extends Mixins(TranslationMixin) {}
</script>

<style lang="scss">
.notification-enabling-pointer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  position: absolute;

  top: 0;
  left: 0;
  z-index: 90;
  width: 100%;
  height: 100%;
  background-color: #000;
  opacity: 0.8;
  z-index: 300;

  &__instructions {
    display: flex;
    position: relative;
  }

  &__text {
    position: relative;
    color: #fff;
    font-size: 19px;
  }

  &__text::before {
    content: '';
    background: url('~@/assets/img/browser-notification/arrow.png') no-repeat;
    width: 100%;
    height: 300px;
    position: absolute;
    top: -275px;
    left: -275px;
  }
}
</style>
