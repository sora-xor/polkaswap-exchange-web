<script setup lang="ts">
import { computed } from 'vue';
import { useFormContext } from './api';

defineOptions({ name: 'SFormItem' });

const props = withDefaults(
  defineProps<{
    prop?: string;
  }>(),
  {
    prop: '',
  }
);

const form = useFormContext();

const message = computed(() => {
  const prop = props.prop;
  if (!prop || !form) return '';
  return form.errors.value[prop] ?? '';
});

const shouldShowMessage = computed(() => Boolean(form?.showMessage.value && message.value));
</script>

<template>
  <div class="s-form-item el-form-item" :class="{ 'is-error': shouldShowMessage }">
    <div class="el-form-item__content">
      <slot />
      <div v-if="shouldShowMessage" class="el-form-item__error">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.s-form-item.el-form-item {
  width: 100%;

  .el-form-item__content {
    width: 100%;
    position: relative;
  }

  .el-form-item__error {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.2;
    color: var(--s-color-status-error, #f14668);
  }
}
</style>
