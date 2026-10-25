<template>
  <ThemeProvider>
    <NotificationProvider>
      <slot></slot>
    </NotificationProvider>
  </ThemeProvider>
</template>

<script lang="ts" setup>
import NotificationProvider from './NotificationProvider.vue';
import ThemeProvider from './ThemeProvider.vue';
</script>
