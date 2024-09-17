<template>
  <div class="browser-notification">
    <div class="browser-notification-dialog">
      <img src="@/assets/img/mobile/rotate_phone.svg" alt="mobile-rotate-phone" />
      <p class="notification-title">{{ t('browserNotificationDialog.rotatetitle') }}</p>
      <p class="notification-message">{{ t('browserNotificationDialog.rotateMessage') }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class AppBrowserNotifsBlockedRotatePhone extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped>
.browser-notification {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--s-color-utility-body);
  z-index: 9999;
}

.browser-notification-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.notification-title {
  margin-top: 33px;
  margin-bottom: 14px;
  font-size: 24px;
  font-weight: 600;
  color: var(--s-color-base-content-primary);
}

.notification-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--s-color-base-content-secondary);
  max-width: 200px;
}
</style>
