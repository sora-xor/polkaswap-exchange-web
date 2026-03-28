<template>
  <s-input
    ref="input"
    v-model="query"
    class="search-input"
    prefix="s-icon-search-16"
    v-bind="inputAttrs"
    :readonly="false"
  >
    <template #suffix>
      <s-button
        v-show="query"
        type="link"
        class="s-button--clear"
        icon="clear-X-16"
        @click="handleClearSearch"
      ></s-button>
    </template>
  </s-input>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

import { useInputFocus } from '../../composables/useInputFocus';

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
  clear: [];
}>();

const attrs = useAttrs();
const { input } = useInputFocus(() => props.autofocus);

const query = computed({
  get: (): string => props.modelValue,
  set: (value: string): void => {
    emit('update:modelValue', value);
  },
});

const inputAttrs = computed<Record<string, unknown>>(() => {
  const { readonly, readOnly, ...rest } = attrs as Record<string, unknown>;
  void readonly;
  void readOnly;
  return rest;
});

function handleClearSearch(): void {
  emit('clear');
}
</script>

<style lang="scss">
.search-input {
  position: relative;
  margin-top: 2px; // to deal with outline

  .s-button--clear {
    width: 18px;
    height: 18px;
    margin-right: -8px;
    padding: 0;
    background-color: transparent;
    border-radius: 0;
    border: none;
    &:focus {
      outline: none !important;
      i {
        @include focus-outline($inner: true, $borderRadius: 50%);
      }
    }
  }
}
</style>
