<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * v-model for two-way data binding
   */
  modelValue?: boolean;
  /**
   * Legacy one-way binding used by Vue 2 templates.
   */
  value?: boolean;
  /**
   * Id for matching switch with label
   *
   */
  id?: string;
  /**
   * Text label for switch
   *
   * @default ''
   */
  label?: string;
  /**
   * Attr specfifies whether switch is disabled
   *
   * @default false
   */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  value: undefined,
  id: '',
  label: '',
  disabled: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'change', value: boolean): void;
}>();

const checked = computed(() => Boolean(props.modelValue ?? props.value ?? false));
const switchId = computed(() => props.id || 's-switch');

const emitValue = (nextValue: boolean): void => {
  emit('update:modelValue', nextValue);
  emit('change', nextValue);
};

const handleSwitchChange = (value: boolean): void => {
  emitValue(Boolean(value));
};

const handleLabelClick = (): void => {
  if (props.disabled) return;
  emitValue(!checked.value);
};

const toggleSwitch = (): void => {
  if (props.disabled) return;
  emitValue(!checked.value);
};
</script>

<template>
  <div class="s-switch neumorphic">
    <div
      :class="['el-switch', { 'is-checked': checked, 'is-disabled': disabled }]"
      role="switch"
      :aria-checked="checked"
      :tabindex="disabled ? -1 : 0"
      @click="toggleSwitch"
      @keydown.enter.prevent="toggleSwitch"
      @keydown.space.prevent="toggleSwitch"
    >
      <input
        :id="switchId"
        type="checkbox"
        class="el-switch__input"
        :checked="checked"
        :disabled="disabled"
        @click.stop
        @change="(event) => handleSwitchChange((event.target as HTMLInputElement).checked)"
      />
      <span class="el-switch__core" style="width: 40px"></span>
    </div>
    <label v-if="label" :for="switchId" class="s-switch__label sora-tpg-p3" @click.prevent="handleLabelClick">
      {{ label }}
    </label>
  </div>
</template>

<style lang="scss" scoped>
.s-switch {
  display: flex;
  align-items: center;

  :deep(.el-switch) {
    height: 20px;
    line-height: 20px;
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    cursor: pointer;
  }

  :deep(.el-switch.is-disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }

  :deep(.el-switch__input) {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    margin: 0;
  }

  :deep(.el-switch__core) {
    position: relative;
    display: inline-block;
    width: 40px !important;
    height: 20px;
    border: 0;
    border-radius: 10px;
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    transition: background-color 0.2s ease;
  }

  :deep(.el-switch__core::after) {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #a19a9d;
    transition:
      left 0.2s ease,
      margin-left 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  :deep(.el-switch.is-checked .el-switch__core) {
    background: var(--s-color-theme-accent);
  }

  :deep(.el-switch.is-checked .el-switch__core::after) {
    left: 40px;
    margin-left: -19px;
    background: #fff;
    box-shadow:
      1px 1px 5px rgba(255, 255, 255, 0.7),
      -1px -1px 5px #fff,
      0 0 20px rgba(247, 84, 163, 0.5);
  }

  &__label {
    color: var(--s-color-base-content-primary);
    margin-left: 8px;
    cursor: pointer;
  }
}
</style>
