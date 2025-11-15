<template>
  <router-view v-bind="$attrs" v-on="$listeners"></router-view>
</template>

<script lang="ts" setup>
defineOptions({ name: 'StakingContainer' });
</script>
