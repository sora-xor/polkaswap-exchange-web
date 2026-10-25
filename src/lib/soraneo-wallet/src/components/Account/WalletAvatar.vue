<template>
  <Identicon :size="size" :theme="theme" :value="address"></Identicon>
</template>

<script lang="ts" setup>
import Identicon from '@polkadot/vue-identicon';

enum THEMES {
  POLKADOT = 'polkadot',
  SUBSTRATE = 'substrate',
  BEACHBALL = 'beachball',
}

withDefaults(
  defineProps<{
    size?: number;
    theme?: string;
    address: string;
  }>(),
  {
    size: 32,
    theme: THEMES.POLKADOT,
  }
);
</script>
