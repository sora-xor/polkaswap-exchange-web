<template>
  <s-notifications-provider>
    <NotificationBridge></NotificationBridge>
    <slot></slot>
  </s-notifications-provider>
</template>

<script lang="ts" setup>
import { SNotificationsProvider } from '@soramitsu-ui/ui';

import NotificationBridge from './NotificationBridge';
</script>
