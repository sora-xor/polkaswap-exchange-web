<template>
  <s-input
    ref="input"
    v-model="query"
    :class="['search-input', { 'search-input--with-right': $slots.right }]"
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
        :aria-label="t('resetText')"
        @click="handleClearSearch"
      ></s-button>
    </template>
    <template v-if="$slots.right" #right>
      <slot name="right"></slot>
    </template>
  </s-input>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

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
const { input, focus } = useInputFocus(() => props.autofocus);
const { t } = useTranslation();

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

// Dialogs reopen this component after it has already mounted, so parent
// focus helpers need access to the wrapped design-system input.
defineExpose({
  focus,
});
</script>

<style lang="scss">
.search-input {
  display: flex;
  position: relative;
  margin-top: 2px; // to deal with outline
  min-height: var(--s-size-big);
  padding: 8px 16px;
  border: 0 solid var(--s-color-base-border-primary);
  border-radius: var(--s-border-radius-small);
  background-color: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);

  @include focus-outline($focusWithin: true, $withOffset: true);

  .s-input__content {
    position: relative;
    width: 100%;
    min-height: 21px;
    margin: auto 0;
    padding: 0;
    gap: 0;
    border: 0 none var(--s-color-base-content-primary);
  }

  .s-input__input {
    display: block;
    position: relative;
    width: 100%;
    border: 0 none var(--s-color-base-content-primary);
  }

  .s-input__prefix,
  .s-input__suffix {
    position: absolute;
    top: 50%;
    display: flex;
    align-items: center;
    transform: translateY(-50%);
  }

  .s-input__prefix {
    left: 0;
    color: var(--s-color-base-content-secondary);
  }

  .s-input__suffix {
    right: 0;
  }

  .el-input__inner {
    height: 21px;
    padding: 0 26px;
    line-height: 21px;
  }

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

  &--with-right {
    .s-input__suffix {
      position: static;
      transform: none;
    }

    .s-button--clear {
      margin-right: 0;
    }
  }
}
</style>
