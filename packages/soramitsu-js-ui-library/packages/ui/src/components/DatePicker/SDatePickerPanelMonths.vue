<script setup lang="ts">
import { IconArrowsChevronRight24, IconArrowsChevronLeft24 } from '@/components/icons'
import { months } from './consts'
import type { ShowState } from './types'

interface Props {
  showState: ShowState
  hideArrows?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hideArrows: false,
})

const showMonth = computed(() => props.showState.month)
const showYear = computed(() => props.showState.year)

const emit = defineEmits(['update:showed-state', 'change-view'])

const changeMonth = (delta: number) => {
  emit('update:showed-state', delta)
  return
}

const changeView = (viewName: string) => {
  emit('change-view', viewName)
}
</script>

<template>
  <div
    class="s-date-picker-month-panel sora-tpg-p1 flex items-center"
    :class="hideArrows ? 'justify-center' : 'justify-between'"
  >
    <button v-if="!hideArrows" type="button" @click="changeMonth(-1)">
      <IconArrowsChevronLeft24 />
    </button>
    <div class="flex justify-center items-center header">
      <span
        role="button"
        class="header__label"
        tabIndex="0"
        @click="changeView('months')"
        @keydown="changeView('months')"
        >{{ months[showMonth] }}</span
      >
      <span
        role="button"
        class="header__label"
        tabIndex="0"
        @click="changeView('years')"
        @keydown="changeView('years')"
        >{{ showYear }}</span
      >
    </div>
    <button v-if="!hideArrows" type="button" @click="changeMonth(1)">
      <IconArrowsChevronRight24 />
    </button>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-date-picker-month-panel {
  height: 57px;

  .header {
    &__label {
      padding: 0 5px;
      line-height: 22px;
      text-align: center;
      cursor: pointer;
      color: theme.token-as-var('sys.color.content-primary');

      &.active,
      &:hover {
        color: theme.token-as-var('sys.color.primary');
      }
    }
  }
}
</style>
