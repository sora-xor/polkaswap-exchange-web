<script setup lang="ts">
import type { DatePickerOptions, PossiblePresetOption } from './types'
import { IconBasicCheckMark24 } from '@/components/icons'
import type { DatePickerApi } from './api'
import { useDatePickerApi } from './api'

interface Props {
  menuState: string
  options: DatePickerOptions
}

const props = defineProps<Props>()

const emit = defineEmits(['click:option'])

const state: DatePickerApi = useDatePickerApi()

const onMenuClick = (data: PossiblePresetOption) => {
  emit('click:option', data)
}
</script>

<template>
  <div class="s-date-picker-options-panel sora-tpg-p3">
    <p
      v-for="(item, idx) in options[state.type]"
      :key="idx"
      class="s-date-picker-options-panel__item"
      :class="menuState === item.label ? 'active' : ''"
      @click="onMenuClick(item)"
      @keydown="onMenuClick(item)"
    >
      {{ item.label }}
      <span v-show="menuState === item.label" class="s-date-picker-options-panel__checkmark"
        ><IconBasicCheckMark24
      /></span>
    </p>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-date-picker-options-panel {
  @apply flex flex-col justify-start;
  grid-area: options;
  border-right: 1px solid theme.token-as-var('sys.color.border-primary');

  &__item {
    padding: 10px 16px;
    cursor: pointer;
    position: relative;
    width: 150px;
    &:hover {
      background-color: theme.token-as-var('sys.color.background-hover');
    }
    &.active {
      background-color: theme.token-as-var('sys.color.background-hover');
    }
  }

  &__checkmark {
    position: absolute;
    top: 0;
    right: 8px;
    transform: translateY(50%);
  }
}
</style>
