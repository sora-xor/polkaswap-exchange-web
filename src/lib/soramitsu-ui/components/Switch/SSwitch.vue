<script setup lang="ts">
interface Props {
  /**
   * v-model for two-way data binding
   */
  modelValue?: boolean;
  /**
   * Id for matching switch with label
   *
   */
  id: string;
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
  label: '',
  disabled: false,
});

const model = defineModel<boolean | undefined>();
</script>

<template>
  <div class="s-switch">
    <input :id="id" v-model="model" type="checkbox" :disabled="disabled" class="s-switch__button" />
    <label :for="id" class="s-switch__label sora-tpg-p3">{{ label }}</label>
  </div>
</template>

<style lang="scss" scoped>
@use '@soramitsu-ui/theme';

$border-primary: theme.token-as-var('sys.color.border-primary');
$content-primary: theme.token-as-var('sys.color.content-primary');
$content-quaternary: theme.token-as-var('sys.color.content-quaternary');
$primary: theme.token-as-var('sys.color.primary');
$primary-hover: theme.token-as-var('sys.color.primary-hover');
$util-surface: theme.token-as-var('sys.color.util.surface');

.s-switch {
  display: flex;
  align-items: center;
  &__button {
    position: relative;
    background-color: $border-primary;
    width: 40px;
    height: 20px;
    appearance: none;
    outline: none;
    border-radius: 20px;
    transition: 0.5s;
    &:checked {
      background-color: $primary;
    }
    &:checked:hover {
      background-color: $primary-hover;
    }
    &::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 10px;
      top: 0;
      left: 0;
      background-color: $util-surface;
      transition: 0.5s;
      transform: scale(0.8);
    }
    &:checked::before {
      left: 20px;
    }
    &:hover {
      background-color: $primary-hover;
      cursor: pointer;
    }
    &:disabled {
      background-color: $border-primary;
    }
    &:disabled + .s-switch-label {
      color: $content-quaternary;
    }
    &:disabled:hover {
      background-color: $border-primary;
      cursor: pointer;
    }
  }
  &__label {
    color: $content-primary;
    margin-left: 8px;
    text-align: center;
    cursor: pointer;
  }
}
</style>
