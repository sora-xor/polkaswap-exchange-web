<template>
  <s-button type="action" size="medium" @click="handleBack">
    <template #icon>
      <s-icon name="arrows-chevron-left-rounded-24"></s-icon>
    </template>
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
