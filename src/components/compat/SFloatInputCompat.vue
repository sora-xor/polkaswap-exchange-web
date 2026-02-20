<script setup lang="ts">
import {
  Comment,
  Fragment,
  computed,
  defineComponent,
  ref,
  useAttrs,
  useSlots,
  watch,
  type PropType,
  type VNode,
} from 'vue';

type Delimiters = {
  decimal?: string;
  decimalSeparator?: string;
  thousands?: string;
  thousand?: string;
  thousandSeparator?: string;
  groupSeparator?: string;
};

defineOptions({
  name: 'SFloatInput',
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
    size?: 'mini' | 'small' | 'medium' | 'big' | string;
    decimals?: number | string;
    max?: number | string;
    min?: number | string;
    maxlength?: number | string;
    minlength?: number | string;
    tabindex?: number | string;
    autocomplete?: string;
    hasLocaleString?: boolean;
    delimiters?: Delimiters | null;
  }>(),
  {
    modelValue: undefined,
    value: undefined,
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    size: 'medium',
    decimals: undefined,
    max: undefined,
    min: undefined,
    maxlength: undefined,
    minlength: undefined,
    tabindex: undefined,
    autocomplete: undefined,
    hasLocaleString: false,
    delimiters: null,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'update:value', value: string): void;
  (event: 'input', value: string): void;
  (event: 'change', value: string): void;
  (event: 'focus', value: FocusEvent): void;
  (event: 'blur', value: FocusEvent): void;
  (event: 'keydown', value: KeyboardEvent): void;
  (event: 'keyup', value: KeyboardEvent): void;
  (event: 'keypress', value: KeyboardEvent): void;
}>();

const attrs = useAttrs();
const slots = useSlots();

const inputElementRef = ref<HTMLInputElement | null>(null);
const internalValue = ref('');
const focused = ref(false);

const LegacyNode = defineComponent({
  name: 'LegacyNode',
  props: {
    node: {
      type: Object as PropType<VNode>,
      required: true,
    },
  },
  setup(props) {
    return () => props.node;
  },
});

const sourceValue = computed(() => {
  const source = props.modelValue !== undefined ? props.modelValue : props.value;
  if (source === null || source === undefined) return '';
  return String(source);
});

watch(
  sourceValue,
  (next) => {
    internalValue.value = next;
  },
  { immediate: true }
);

const classes = computed(() => [
  's-input',
  's-input-type',
  's-float-input',
  'neumorphic',
  `s-input--${props.size}`,
  {
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    's-focused': focused.value,
  },
]);

const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);

const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

type SlotMap = {
  top: VNode[];
  right: VNode[];
  left: VNode[];
  bottom: VNode[];
  default: VNode[];
};

const legacySlots = computed<SlotMap>(() => {
  const map: SlotMap = {
    top: [],
    right: [],
    left: [],
    bottom: [],
    default: [],
  };

  const appendNode = (node: VNode): void => {
    if (!node || node.type === Comment) return;

    if (node.type === Fragment && Array.isArray(node.children)) {
      for (const child of node.children as VNode[]) {
        appendNode(child);
      }
      return;
    }

    const props = (node.props ?? {}) as Record<string, unknown>;
    const slotName = props.slot;

    if (slotName === 'top' || slotName === 'right' || slotName === 'left' || slotName === 'bottom') {
      map[slotName].push(node);
      return;
    }

    map.default.push(node);
  };

  for (const node of slots.default?.() ?? []) {
    appendNode(node);
  }

  return map;
});

const hasTopContent = computed(() => Boolean(slots.top) || legacySlots.value.top.length > 0);
const hasBottomContent = computed(() => Boolean(slots.bottom) || legacySlots.value.bottom.length > 0);
const hasLeftContent = computed(() => Boolean(slots.left) || legacySlots.value.left.length > 0);
const hasRightContent = computed(
  () =>
    Boolean(slots.right || slots.default) || legacySlots.value.right.length > 0 || legacySlots.value.default.length > 0
);

const usesNumericModel = computed(
  () => props.type === 'number' || props.hasLocaleString || props.decimals !== undefined
);
const effectivePlaceholder = computed(() => props.placeholder || (usesNumericModel.value ? '0.0' : ''));

const toFinite = (value: string | number | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveSeparators = () => {
  const delimiters = props.delimiters ?? {};

  return {
    decimal: delimiters.decimalSeparator ?? delimiters.decimal ?? '.',
    thousand:
      delimiters.groupSeparator ?? delimiters.thousandSeparator ?? delimiters.thousand ?? delimiters.thousands ?? ',',
  };
};

const sanitizeNumeric = (value: string): string => {
  const { decimal, thousand } = resolveSeparators();
  let next = value;

  if (thousand) {
    next = next.split(thousand).join('');
  }

  if (decimal && decimal !== '.') {
    next = next.split(decimal).join('.');
  }

  next = next.replace(/\s+/g, '');
  next = next.replace(/[^0-9.+-]/g, '');

  const hasNegative = next.startsWith('-');
  next = next.replace(/[-+]/g, '');
  if (hasNegative) next = `-${next}`;

  const dotIndex = next.indexOf('.');
  if (dotIndex !== -1) {
    next = `${next.slice(0, dotIndex + 1)}${next.slice(dotIndex + 1).replace(/\./g, '')}`;
  }

  if (next.startsWith('.')) {
    next = `0${next}`;
  }
  if (next.startsWith('-.')) {
    next = `-0${next.slice(1)}`;
  }

  const parsedDecimals = Number(props.decimals);
  if (Number.isInteger(parsedDecimals) && parsedDecimals >= 0 && next.includes('.')) {
    const [integerPart, fractionPart = ''] = next.split('.');
    next = `${integerPart}.${fractionPart.slice(0, parsedDecimals)}`;
  }

  if (next === '-' || next === '') return next;

  const numeric = toFinite(next);
  if (numeric === null) return next;

  const min = toFinite(props.min);
  const max = toFinite(props.max);

  if (min !== null && numeric < min) return String(min);
  if (max !== null && numeric > max) return String(max);

  return next;
};

const normalizeValue = (value: string): string => (usesNumericModel.value ? sanitizeNumeric(value) : value);

const emitValue = (value: string): void => {
  internalValue.value = value;
  emit('update:modelValue', value);
  emit('update:value', value);
  emit('input', value);
};

const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emitValue(normalizeValue(target.value));
};

const handleChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emit('change', normalizeValue(target.value));
};

const handleFocus = (event: FocusEvent): void => {
  focused.value = true;
  emit('focus', event);
};

const handleBlur = (event: FocusEvent): void => {
  focused.value = false;
  const normalized = normalizeValue(internalValue.value);
  if (normalized !== internalValue.value) {
    emitValue(normalized);
  }
  emit('blur', event);
};

const focus = (): void => {
  inputElementRef.value?.focus();
};

const blur = (): void => {
  inputElementRef.value?.blur();
};

defineExpose({
  focus,
  blur,
  inputElementRef,
  inputComponent: {
    focus,
    blur,
  },
});
</script>

<template>
  <div :class="[classes, rootClass]" :style="rootStyle">
    <div v-if="hasTopContent" class="s-input__top">
      <slot v-if="$slots.top" name="top" />
      <LegacyNode v-else v-for="(node, index) in legacySlots.top" :key="`top-${index}`" :node="node" />
    </div>

    <div class="s-input__content">
      <span v-if="hasLeftContent" class="s-input__left">
        <slot v-if="$slots.left" name="left" />
        <LegacyNode v-else v-for="(node, index) in legacySlots.left" :key="`left-${index}`" :node="node" />
      </span>

      <div class="s-input__input el-input">
        <input
          ref="inputElementRef"
          class="el-input__inner"
          :type="type"
          :value="internalValue"
          :placeholder="effectivePlaceholder"
          :disabled="disabled"
          :readonly="readonly"
          :max="max"
          :min="min"
          :maxlength="maxlength"
          :minlength="minlength"
          :tabindex="tabindex"
          :autocomplete="autocomplete"
          v-bind="inputAttrs"
          @input="handleInput"
          @change="handleChange"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="emit('keydown', $event)"
          @keyup="emit('keyup', $event)"
          @keypress="emit('keypress', $event)"
        />
      </div>

      <span v-if="hasRightContent" class="s-input__right">
        <slot v-if="$slots.right" name="right" />
        <template v-else-if="legacySlots.right.length">
          <LegacyNode v-for="(node, index) in legacySlots.right" :key="`right-${index}`" :node="node" />
        </template>
        <slot v-else-if="$slots.default" />
        <template v-else>
          <LegacyNode v-for="(node, index) in legacySlots.default" :key="`default-${index}`" :node="node" />
        </template>
      </span>
    </div>

    <div v-if="hasBottomContent" class="s-input__bottom">
      <slot v-if="$slots.bottom" name="bottom" />
      <LegacyNode v-else v-for="(node, index) in legacySlots.bottom" :key="`bottom-${index}`" :node="node" />
    </div>
  </div>
</template>

<style lang="scss">
.s-float-input.s-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $basic-spacing;
  padding: $inner-spacing-mini $inner-spacing-medium;
  border-radius: var(--s-border-radius-small);
  background-color: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);

  &.s-input--mini {
    min-height: var(--s-size-small);
    padding: $basic-spacing #{$inner-spacing-small};
  }

  &.s-input--small {
    min-height: var(--s-size-small);
  }

  &.s-input--medium {
    min-height: var(--s-size-medium);
  }

  &.s-input--big {
    min-height: var(--s-size-big);
    padding: $inner-spacing-medium;
  }

  &.is-disabled {
    opacity: 0.65;
  }

  .s-input__top,
  .s-input__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $basic-spacing;
    min-width: 0;
  }

  .s-input__content {
    display: flex;
    align-items: center;
    min-height: var(--s-size-small);
    gap: $basic-spacing;
  }

  .s-input__left,
  .s-input__right {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--s-color-base-content-secondary);
  }

  .s-input__input {
    flex: 1;
    min-width: 0;
  }

  .el-input__inner {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--s-color-base-content-primary);
    line-height: var(--s-line-height-small);
    font-size: var(--s-font-size-large);
    font-weight: 700;
    padding: 0;
  }
}
</style>
