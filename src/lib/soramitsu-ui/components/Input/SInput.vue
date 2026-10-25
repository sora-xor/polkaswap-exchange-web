<script setup lang="ts">
import { computed, useAttrs, ref, watch } from 'vue';

defineOptions({
  name: 'SInput',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    value?: string | number | null;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    prefix?: string;
    suffix?: string;
    maxlength?: number | string;
    minlength?: number | string;
    tabindex?: number | string;
    autocomplete?: string;
    clearable?: boolean;
  }>(),
  {
    modelValue: undefined,
    value: undefined,
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    prefix: '',
    suffix: '',
    maxlength: undefined,
    minlength: undefined,
    tabindex: undefined,
    autocomplete: undefined,
    clearable: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'change', value: string): void;
  (event: 'focus', value: FocusEvent): void;
  (event: 'blur', value: FocusEvent): void;
}>();

const attrs = useAttrs();
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const internalValue = ref('');

const hasModelValue = computed(() => props.modelValue !== undefined);

const controlledValue = computed(() => {
  const source = hasModelValue.value ? props.modelValue : props.value;
  return source === null || source === undefined ? '' : String(source);
});

watch(
  controlledValue,
  (value) => {
    internalValue.value = value;
  },
  { immediate: true }
);

const isTextarea = computed(() => props.type === 'textarea');

const normalizedIconClass = (icon: string): string => {
  if (!icon) return '';
  if (icon.includes(' ')) return icon;
  if (icon.startsWith('s-icon-') || icon.startsWith('el-icon-')) return icon;
  return `s-icon-${icon}`;
};

const rootClasses = computed(() => [
  's-input',
  attrs.class,
  {
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    's-input-textarea': isTextarea.value,
  },
]);

const rootStyle = computed(() => attrs.style);

const passThroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

function updateValue(value: string): void {
  internalValue.value = value;
  emit('update:modelValue', value);
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  updateValue(target.value);
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  emit('change', target.value);
}

function clearValue(): void {
  if (props.disabled || props.readonly) return;
  updateValue('');
}

function focus(): void {
  inputRef.value?.focus();
}

function blur(): void {
  inputRef.value?.blur();
}

defineExpose({
  focus,
  blur,
  inputRef,
});
</script>

<template>
  <div :class="rootClasses" :style="rootStyle">
    <div class="s-input__content">
      <span v-if="$slots.left" class="s-input__left">
        <slot name="left" />
      </span>

      <span v-if="$slots.prefix || prefix" class="s-input__prefix el-input__prefix">
        <slot name="prefix">
          <i :class="normalizedIconClass(prefix)" />
        </slot>
      </span>

      <div class="s-input__input" :class="isTextarea ? 'el-textarea' : 'el-input'">
        <textarea
          v-if="isTextarea"
          ref="inputRef"
          :value="internalValue"
          class="el-textarea__inner"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="props.readonly"
          :maxlength="maxlength"
          :minlength="minlength"
          :tabindex="tabindex"
          :autocomplete="autocomplete"
          v-bind="passThroughAttrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        />
        <input
          v-else
          ref="inputRef"
          :value="internalValue"
          class="el-input__inner"
          :type="type"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="props.readonly"
          :maxlength="maxlength"
          :minlength="minlength"
          :tabindex="tabindex"
          :autocomplete="autocomplete"
          v-bind="passThroughAttrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        />
      </div>

      <span v-if="$slots.suffix || suffix" class="s-input__suffix el-input__suffix">
        <slot name="suffix">
          <i :class="normalizedIconClass(suffix)" />
        </slot>
      </span>

      <button
        v-if="clearable && internalValue"
        class="s-input__clear"
        type="button"
        :disabled="disabled || props.readonly"
        @click="clearValue"
      >
        x
      </button>

      <span v-if="$slots.right || $slots.default" class="s-input__right">
        <slot name="right">
          <slot />
        </slot>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
.s-input {
  width: 100%;
  border-radius: var(--s-border-radius-small, 16px);
  background-color: var(--s-color-utility-body, #f3f1f4);
  box-shadow:
    inset 1px 1px 2px rgba(255, 255, 255, 0.9),
    inset -1px -1px 2px rgba(174, 174, 192, 0.2);
  color: var(--s-color-base-content-primary);

  &.is-disabled {
    opacity: 0.6;
    cursor: default;
  }

  .s-input__content {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: var(--s-size-small, 40px);
    padding: 0 12px;
  }

  .s-input__input {
    flex: 1;
    min-width: 0;
  }

  .el-input__inner,
  .el-textarea__inner {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: inherit;
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-base);
    padding: 0;
  }

  .el-textarea__inner {
    min-height: 80px;
    resize: vertical;
    padding: 8px 0;
  }

  .el-input__inner::placeholder,
  .el-textarea__inner::placeholder {
    color: var(--s-color-base-content-tertiary);
  }

  .s-input__prefix,
  .s-input__suffix,
  .s-input__left,
  .s-input__right {
    display: inline-flex;
    align-items: center;
    color: var(--s-color-base-content-tertiary);
    flex-shrink: 0;
  }

  .s-input__clear {
    border: 0;
    background: transparent;
    padding: 0;
    color: var(--s-color-base-content-tertiary);
    cursor: pointer;
  }
}
</style>
