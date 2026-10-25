<script setup lang="ts">
import { SelectOptionType, SelectSize } from './types'
import IconCheckMark from '~icons/mdi/check'
import { useSelectApi } from './api'
import { SCheckboxAtom } from '../Checkbox'
import { SRadioAtom } from '../Radio'

const props = defineProps<{
  type: SelectOptionType
  selected?: boolean
}>()

const api = useSelectApi()

const emit = defineEmits<(event: 'toggle') => void>()

const RADIO_CHECKBOX_SIZE = {
  [SelectSize.Xl]: 'xl',
  [SelectSize.Lg]: 'lg',
  [SelectSize.Md]: 'lg',
  [SelectSize.Sm]: 'md',
} as const

const CHECK_ICON_SIZE = {
  [SelectSize.Xl]: 24,
  [SelectSize.Lg]: 16,
  [SelectSize.Md]: 16,
  [SelectSize.Sm]: 16,
} as const
</script>

<template>
  <div
    :class="[
      's-select-option',
      `s-select-option_size_${api.size}`,
      {
        's-select-option_selected': selected,
      },
    ]"
    data-testid="select-option"
    @click="emit('toggle')"
  >
    <template v-if="type === SelectOptionType.Checkbox">
      <SCheckboxAtom
        class="flex-shrink-0"
        data-testid="select-option-checkbox"
        :checked="selected"
        :size="RADIO_CHECKBOX_SIZE[api.size]"
      />
    </template>
    <template v-if="type === SelectOptionType.Radio">
      <SRadioAtom
        class="flex-shrink-0"
        data-testid="select-option-radio"
        :checked="selected"
        :size="RADIO_CHECKBOX_SIZE[api.size]"
      />
    </template>

    <div class="s-select-option__content truncate">
      <slot />
    </div>

    <template v-if="type === SelectOptionType.Default">
      <IconCheckMark
        v-if="selected"
        class="flex-shrink-0"
        data-testid="select-option-checkmark"
        :width="CHECK_ICON_SIZE[api.size]"
        :height="CHECK_ICON_SIZE[api.size]"
      />
    </template>
  </div>
</template>

<style lang="scss">
@use './sizes-mixin.scss';
@use '@/theme';

.s-select-option {
  background: theme.token-as-var('sys.color.util.surface');
  @apply flex items-center px-[10px] py-1 select-none cursor-pointer space-x-8px;

  &:hover,
  &:active,
  &_selected {
    background: theme.token-as-var('sys.color.background');
  }

  &__content {
    @apply flex-1;
  }

  $root: &;

  &_size {
    @include sizes-mixin.s-select-sizes;
  }
}
</style>
