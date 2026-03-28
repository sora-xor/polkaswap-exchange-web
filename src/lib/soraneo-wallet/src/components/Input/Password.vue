<template>
  <s-input ref="input" v-model="query" :type="type" :placeholder="t('desktop.password.placeholder')" v-bind="$attrs">
    <template #suffix>
      <s-icon v-button :name="icon" class="eye-icon" size="18" @click="togglePasswordVisibility"></s-icon>
    </template>
  </s-input>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useInputFocus } from '../../composables/useInputFocus';
import { useWalletTranslation } from '../../composables/useWalletTranslation';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    autofocus?: boolean;
    modelValue?: string;
  }>(),
  {
    autofocus: false,
    modelValue: '',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { input } = useInputFocus(() => props.autofocus);
const { t } = useWalletTranslation();

const hidden = ref(true);

const query = computed({
  get: (): string => props.modelValue,
  set: (value: string): void => {
    emit('update:modelValue', value);
  },
});

const icon = computed(() => (hidden.value ? 'basic-eye-no-24' : 'basic-filterlist-24'));
const type = computed(() => (hidden.value ? 'password' : 'text'));

function togglePasswordVisibility(): void {
  hidden.value = !hidden.value;
}

function reset(): void {
  hidden.value = true;
}
</script>
