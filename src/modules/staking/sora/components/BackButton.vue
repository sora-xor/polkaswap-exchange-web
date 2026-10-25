<template>
  <s-button class="back-button" type="action" size="medium" :aria-label="t('backText')" @click="handleBack">
    <template #icon>
      <s-icon name="arrows-chevron-left-rounded-24" size="24"></s-icon>
    </template>
  </s-button>
</template>

<script setup lang="ts">
import router from '@/router';
import { useTranslation } from '@/composables/useTranslation';

import { StakingPageNames } from '../../consts';

const props = defineProps<{
  page?: StakingPageNames;
}>();

const emit = defineEmits<{
  (event: 'back'): void;
}>();
const { t } = useTranslation();

const handleBack = () => {
  if (props.page) {
    router.push({ name: props.page });
  }
  emit('back');
};
</script>

<style lang="scss">
button.el-button.back-button.neumorphic.s-action {
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  border: 0;
  border-radius: 50%;
  background-color: var(--s-color-base-border-primary);
  box-shadow: var(--s-shadow-element-pressed);
  color: var(--s-color-base-content-tertiary);
}

button.el-button.back-button.neumorphic.s-action .s-icon {
  display: inline-block;
  font-size: 24px !important;
  line-height: 24px !important;
  color: var(--s-color-base-content-tertiary) !important;
}

button.el-button.back-button.neumorphic.s-action .s-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  line-height: 24px;
}
</style>
