<template>
  <div class="notification-enabling-pointer">
    <div class="wrapper">
      <img src="@/assets/img/browser-notification/arrow.png?inline" class="notification-enabling-pointer__arrow" />
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
.wrapper {
  display: flex;
  position: relative;
}
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
  filter: alpha(opacity=60);
  opacity: 0.6;
  z-index: 300;

  &__text {
    color: #fff;
    font-size: 18px;
  }

  &__arrow {
    position: absolute;
    top: -275px;
    left: -80%;
  }
}
</style>
