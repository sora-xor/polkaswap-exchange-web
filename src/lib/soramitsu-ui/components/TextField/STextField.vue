<script setup lang="ts">
import type { ValidationsList } from '@soramitsu-ui/ui/components/TextField/types';
import { STATUS_ICONS_MAP_16, IconEye, IconEyeOff, IconStatusSuccess16 } from '../icons';
import { computed } from 'vue';
import type { StyleValue } from 'vue';
import type { Status } from '@soramitsu-ui/ui/types';
import type { MaybeElementRef } from '@vueuse/core';

/**
 * warning: don't use it inside of `Props`. Vue compiler determines it
 * as an object and generates wrong props definition
 */
type TextFieldStatus = Exclude<Status, 'info'>;

type Emits = {
  (event: 'click:input-wrapper', value: MouseEvent): void;
  (event: 'update:modelValue', value: string | undefined): void;
};
type TextFieldSlot = () => any;
type TextFieldSlots = {
  label?: TextFieldSlot;
  prefix?: TextFieldSlot;
  append?: TextFieldSlot;
  message?: TextFieldSlot;
};

interface Props {
  /**
   * "Strict sync" means that when `<input>` element's value is updated,
   * component's `modelValue` is updated **and then** input's value is set
   * by `modelValue`.
   *
   * This behavior disallows for `<input>` to have value that differs from
   * `modelValue`.
   *
   * Enable this prop to disable this behaviour.
   *
   * @default false
   */
  noModelValueStrictSync?: boolean;

  /**
   * v-model driven value
   */
  modelValue?: string;

  /**
   * Will be used if `label` slot is omitted
   */
  label?: string;

  /**
   * Recommended for a11y
   */
  id?: string;

  /**
   * @default false
   */
  password?: boolean;

  /**
   * Disable eye-toggle that is shown if input is `password`
   *
   * @default false
   */
  noEye?: boolean;

  /**
   * @default false
   */
  disabled?: boolean;

  /**
   * If this value is defined, then the counter will be shown.
   *
   * @remarks
   * Could not be less than 0. Render depends on the passed value type:
   *
   * - number | string - `{count}/{counter value}`
   * - boolean (true) - `{count}` (just a count)
   *
   * This value doesn't apply any validation - just renders a counter.
   *
   * @default false
   */
  counter?: boolean | number | string;

  /**
   * Primary status prop. Overrides `success`, `warning` and `error` particular
   * setters.
   */
  status?: Exclude<Status, 'info'>;
  /**
   * Shorthand for `success` status
   */
  success?: boolean;
  /**
   * Shorthand for `warning` status
   */
  warning?: boolean;
  /**
   * Shorthand for `error` status
   */
  error?: boolean;
  /**
   * Text to display under the input.
   *
   * @remarks
   * If input has some status, text will be styled according to this
   * status and will be prefixed with a status icon.
   *
   * Also you can use `message` slot.
   */
  message?: string;
  /**
   * Manually activates filled state
   */
  filledState?: boolean;
  /**
   * Display the list of rules
   */
  validationsList?: ValidationsList;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  multiline: false,
  password: false,
  disabled: false,
  counter: false,
  noEye: false,
  noModelValueStrictSync: false,
  filledState: false,
});

const emit = defineEmits<Emits>();

const slots = defineSlots<TextFieldSlots>();

const model = defineModel<string | undefined>();

const displayedValue = computed(() => (props.noModelValueStrictSync ? model.value : props.modelValue));

// ***

const status = computed<null | TextFieldStatus>(() => {
  if (props.status) return props.status;
  if (props.success) return 'success';
  if (props.warning) return 'warning';
  if (props.error) return 'error';

  return null;
});

function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  model.value = el.value;
  if (!props.noModelValueStrictSync) {
    el.value = displayedValue.value ?? '';
  }
}

const isValueEmpty = computed(() => !displayedValue.value);
const isFocused = ref(false);
const labelTypographyClass = computed(() =>
  !(props.filledState || isFocused.value) && isValueEmpty.value ? 'sora-tpg-p3' : 'sora-tpg-p4'
);

const inputRef = ref<MaybeElementRef>(null);

function handleInputWrapperClick(event: MouseEvent) {
  if (event.target !== document.activeElement) {
    event.preventDefault();
  }

  if (inputRef.value instanceof HTMLInputElement && !isFocused.value) {
    inputRef.value.focus();
    isFocused.value = true;
  }

  emit('click:input-wrapper', event);
}

function handleInputWrapperMouseDown(event: MouseEvent) {
  if (event.target === inputRef.value) return;

  event.preventDefault();
}

// MESSAGE

const isMessageSlotDefined = () => !!slots.message;
const shouldRenderMessage = () => !!props.message || isMessageSlotDefined() || shouldShowValidationsList.value;
const messageIcon = computed(() => {
  if (status.value === null) return null;
  return STATUS_ICONS_MAP_16[status.value];
});

// COUNTER

interface CounterConfig {
  /**
   * Normalized limit, >= 0 for sure
   */
  limit: null | number;
}

const counterConfig = computed<null | CounterConfig>(() => {
  const val = props.counter;
  const ty = typeof val;
  if (ty === 'boolean' && val) {
    return { limit: null };
  }
  if (ty === 'number' || ty === 'string') {
    const num = Number(val);
    return { limit: num >= 0 ? num : null };
  }
  return null;
});

const counterText = computed<string | null>(() => {
  const config = counterConfig.value;
  if (!config) return null;
  const { limit } = config;
  const currentCount = displayedValue.value?.length ?? 0;
  return limit === null ? String(currentCount) : `${currentCount}/${limit}`;
});

// attrs are not reactive: https://vuejs.org/api/composition-api-setup.html#setup-context
// so we need to compute them directly in the render function
const attrs = useAttrs();
const rootClass = () => attrs.class;
const rootStyle = () => attrs.style as StyleValue;
const inputAttrs = () => {
  const { style, class: clazz, ...rest } = attrs;
  return rest;
};

// APPEND

const showEye = computed<boolean>(() => props.password && !props.noEye);
const isAppendSlotDefined = () => !!slots.append;
const shouldRenderAppend = () => !!counterText.value || isAppendSlotDefined() || showEye.value;

// EYE

const [forceRevealPassword, toggleForceReveal] = useToggle();
const inputType = computed(() =>
  props.password && (!showEye.value || !forceRevealPassword.value) ? 'password' : 'text'
);

const isTouched = ref(false);

function handleFocus() {
  isFocused.value = true;
  isTouched.value = true;
}

const isMatchingValidationsList = computed(() => {
  if (!props.validationsList) return false;

  return props.validationsList.validations.every((v) => v.isMatching);
});

const shouldShowValidationsList = computed(
  () =>
    props.validationsList &&
    (!props.validationsList.showOnFocusOnly || isFocused.value) &&
    isTouched.value &&
    !isMatchingValidationsList.value
);
</script>

<template>
  <div
    :class="[
      's-text-field',
      {
        's-text-field_empty': isValueEmpty && !filledState,
        's-text-field_filled-state': filledState,
        's-text-field_disabled': disabled,
      },
      rootClass(),
    ]"
    :style="rootStyle()"
    :data-status="status"
  >
    <!-- key events works with input element -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
    <div class="s-text-field__input-wrapper" @click="handleInputWrapperClick" @mousedown="handleInputWrapperMouseDown">
      <label :for="id" :class="labelTypographyClass">
        <slot name="label">{{ label }}</slot>
      </label>

      <div class="s-text-field__input-line">
        <slot name="prefix" />

        <input
          :id="id"
          ref="inputRef"
          class="sora-tpg-p3"
          :value="displayedValue ?? ''"
          :type="inputType"
          :disabled="disabled"
          v-bind="inputAttrs()"
          @input="onInput"
          @focus="handleFocus"
          @blur="isFocused = false"
        />
      </div>

      <div v-if="shouldRenderAppend()" class="s-text-field__append" data-testid="append">
        <div v-if="counterText" data-testid="counter" class="s-text-field__counter sora-tpg-p4">
          {{ counterText }}
        </div>

        <slot name="append" />

        <button
          v-if="showEye"
          class="s-text-field__eye"
          data-testid="eye"
          type="button"
          @click.stop="toggleForceReveal()"
        >
          <IconEye v-if="!forceRevealPassword" />
          <IconEyeOff v-else />
        </button>
      </div>
    </div>

    <Transition name="s-text-field__message-transition">
      <div v-if="shouldRenderMessage()" data-testid="message" class="s-text-field__message sora-tpg-p4">
        <component :is="messageIcon" v-if="messageIcon && !props.validationsList" class="s-text-field__message-icon" />

        <div v-if="props.validationsList">
          <span>{{ props.validationsList.title }}</span>

          <div v-for="item in props.validationsList.validations" :key="item.message">
            <div class="flex gap-4px">
              <IconStatusSuccess16 v-if="item.isMatching" class="flex self-center w-16px" />
              <div v-else class="w-16px">-</div>

              <div :class="{ 's-text-field__message-requirement_matched': item.isMatching }">
                {{ item.message }}
              </div>
            </div>
          </div>
        </div>

        <span v-else>
          <slot name="message">{{ message }}</slot>
        </span>
      </div>
    </Transition>
  </div>
</template>
