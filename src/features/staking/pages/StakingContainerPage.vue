<template>
  <router-view v-bind="$attrs"></router-view>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'StakingContainerPage',
  inheritAttrs: false,
});
</script>
