<script setup lang="ts">
import type { DatePickerApi } from '@/components/DatePicker/api'
import { useDatePickerApi } from '@/components/DatePicker/api'

interface Props {
  value?: string
  options: string[]
}

const state: DatePickerApi = useDatePickerApi()

const props = withDefaults(defineProps<Props>(), {
  value: '00:00',
})

const emit = defineEmits(['update:time'])

const updateTime = (e: any) => {
  emit('update:time', e.target.textContent)
}
</script>

<template>
  <div class="s-date-picker-time-panel sora-tpg-p4">
    <p
      v-for="(time, idx) in options"
      :key="idx"
      class="cursor-pointer"
      :class="time === value ? 'active' : ''"
      @click="updateTime"
      @keydown="updateTime"
    >
      {{ time }}
    </p>
  </div>
</template>

<style lang="scss">
@use '@/theme';
.s-date-picker-time-panel {
  @apply flex flex-col items-center justify-start;
  overflow-y: scroll;
  height: 100%;
  padding: 4px 0;
  padding-right: 20px;
  grid-area: time;
  max-height: 342px;

  scrollbar-color: theme.token-as-var('sys.color.border-primary') transparent;
  scrollbar-arrow-color: transparent;
  scrollbar-width: thin;

  p {
    margin-bottom: 10px;
    padding: 1px 4px;
    width: 44px;
    height: 24px;
    font-feature-settings:
      'tnum' on,
      'lnum' on,
      'case' on;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &::-webkit-scrollbar {
    background: transparent;
    width: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: theme.token-as-var('sys.color.border-primary');
    border-radius: 2px;
  }

  .active {
    background-color: theme.token-as-var('sys.color.primary');
    color: theme.token-as-var('sys.color.util.surface');
    border-radius: 2px;
  }
}
</style>
