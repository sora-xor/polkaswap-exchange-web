<template>
  <get-ts-page purpose="xor" />
</template>

<script setup lang="ts">
import GetTsPage from './GetTsPage.vue';

/** General XOR acquisition ends in the receiving wallet; TONSWAP is a separate optional journey. */
defineOptions({ name: 'BuyXorPage' });
</script>
