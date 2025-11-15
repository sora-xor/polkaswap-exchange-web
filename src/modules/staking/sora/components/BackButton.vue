<template>
  <s-button type="action" size="medium" @click="handleBack">
    <s-icon name="arrows-chevron-left-rounded-24"></s-icon>
  </s-button>
</template>

<script setup lang="ts">
import router from '@/router';

import { StakingPageNames } from '../../consts';

const props = defineProps<{
  page?: StakingPageNames;
}>();

const emit = defineEmits<{
  (event: 'back'): void;
}>();

const handleBack = () => {
  if (props.page) {
    router.push({ name: props.page });
  }
  emit('back');
};
</script>
