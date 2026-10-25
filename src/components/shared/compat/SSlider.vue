<template>
  <div class="s-slider">
    <input
      class="s-slider__input"
      type="range"
      :value="currentValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="handleInput"
      @change="handleChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

type SliderValue = number | string;

const props = withDefaults(
  defineProps<{
    modelValue?: SliderValue;
    value?: SliderValue;
    min?: SliderValue;
    max?: SliderValue;
    step?: SliderValue;
    disabled?: boolean;
    showTooltip?: boolean;
    marks?: Record<string, string>;
  }>(),
  {
    modelValue: 0,
    value: undefined,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    showTooltip: false,
    marks: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'input', value: string): void;
  (e: 'change', value: string): void;
}>();

const currentValue = computed(() => props.value ?? props.modelValue ?? props.min);

function getEventValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function handleInput(event: Event): void {
  const nextValue = getEventValue(event);
  emit('update:modelValue', nextValue);
  emit('input', nextValue);
}

function handleChange(event: Event): void {
  emit('change', getEventValue(event));
}
</script>

<style lang="scss" scoped>
.s-slider {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.s-slider__input {
  width: 100%;
  min-width: 0;
  margin: 0;
  accent-color: var(--s-color-theme-accent);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
