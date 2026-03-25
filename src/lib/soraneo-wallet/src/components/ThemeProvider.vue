<template>
  <div class="sora-theme-provider" :data-theme="currentTheme">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { Theme } from '@/consts';
import { useWalletStore } from '@/stores/wallet';

const walletStore = useWalletStore();

const currentTheme = computed<Theme>(() => {
  return walletStore.libraryTheme ?? Theme.Light;
});
</script>

<style scoped>
.sora-theme-provider {
  display: contents;
}
</style>
