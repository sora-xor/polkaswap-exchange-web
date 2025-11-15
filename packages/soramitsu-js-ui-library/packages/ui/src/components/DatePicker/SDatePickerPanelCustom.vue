<script setup lang="ts">
import type { RangeState, StateStore } from './types'
import { parse, isValid } from 'date-fns'
import type { DatePickerApi } from './api'
import { useDatePickerApi } from './api'

interface Props {
  stateStore: StateStore
  formatDate: (date: any) => string
  formatPattern: string
  showInputs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showInputs: false,
})

const state: DatePickerApi = useDatePickerApi()

const emit = defineEmits(['update:custom-input', 'click:done'])

const fromFormat = (dateString: string) => {
  let date = parse(dateString, props.formatPattern, new Date())
  if (!isValid(date)) return null
  return date
}

const pickState = computed(() => {
  return props.stateStore.pickState
})

const customInputValue = (field: string) => {
  return props.formatDate(props.stateStore.rangeState[field as keyof RangeState])
}

const updateCustomInput = (event: any, field: string) => {
  const newVal = event.target.value
  const date = fromFormat(newVal)
  emit('update:custom-input', date, field)
}

const updateCustomInputDay = (event: any) => {
  const newVal = event.target.value
  const date = fromFormat(newVal)
  emit('update:custom-input', date)
}

const updateCustomInputPick = (event: any) => {
  const newVal = event.target.value
  const date = fromFormat(newVal)
  emit('update:custom-input', date)
}

const customInputValuePick = computed(() => {
  return props.formatDate(props.stateStore.pickState[props.stateStore.pickState.length - 1])
})

const customInputValueStartDate = computed(() => {
  return customInputValue('startDate')
})

const customInputValueEndDate = computed(() => {
  return customInputValue('endDate')
})

const customInputValueDay = computed(() => {
  return props.formatDate(props.stateStore.dayState)
})

const customInputCssClass = computed(() => {
  return `s-date-picker-custom-panel__input${state.time ? '_time' : ''}`
})

function handleInput(event: Event) {
  if (!(event instanceof InputEvent) || !(event.target instanceof HTMLInputElement)) return

  if (event.inputType === 'deleteContentBackward') {
    return
  }

  const res = state.time ? dateTimeMask(event.target.value) : dateMask(event.target.value)

  if (res) {
    event.target.value = res
  }
}

function dateMask(date: string) {
  if (date.match(/^\d{2}$/) !== null) {
    return date + '/'
  }

  if (date.match(/^\d{2}\/\d{2}$/) !== null) {
    return date + '/'
  }
}

function dateTimeMask(date: string) {
  const res = dateMask(date)

  if (res) {
    return res
  }

  if (date.match(/^\d{2}\/\d{2}\/\d{4}$/) !== null) {
    return date + ', '
  }

  if (date.match(/^\d{2}\/\d{2}\/\d{4}, \d{2}$/) !== null) {
    return date + ':'
  }

  if (date.match(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/) !== null) {
    return date
  }
}

const customInputLength = computed(() => {
  return state.time ? 17 : 10
})

const onDoneClick = () => {
  emit('click:done')
}
</script>

<template>
  <div class="s-date-picker-custom-panel flex items-center relative px-16px">
    <div v-if="showInputs" class="flex justify-center items-center">
      <template v-if="state.type === 'range'">
        <input
          :maxlength="customInputLength"
          class="s-date-picker-custom-panel__input"
          :class="customInputCssClass"
          :value="customInputValueStartDate"
          @input="handleInput"
          @change="updateCustomInput($event, 'startDate')"
        />
        <div class="mx-2">-</div>
        <input
          :maxlength="customInputLength"
          class="s-date-picker-custom-panel__input"
          :class="customInputCssClass"
          :value="customInputValueEndDate"
          @input="handleInput"
          @change="updateCustomInput($event, 'endDate')"
        />
      </template>
      <template v-if="state.type === 'day'">
        <input
          :maxlength="customInputLength"
          class="s-date-picker-custom-panel__input"
          :class="customInputCssClass"
          :value="customInputValueDay"
          @input="handleInput"
          @change="updateCustomInputDay($event)"
        />
      </template>
      <template v-if="state.type === 'pick' && pickState.length > 0">
        <input
          :maxlength="customInputLength"
          class="s-date-picker-custom-panel__input"
          :class="customInputCssClass"
          :value="customInputValuePick"
          @input="handleInput"
          @change="updateCustomInputPick($event)"
        />
      </template>
    </div>
    <button
      class="s-date-picker-custom-panel__save-button ml-auto"
      data-testid="date-picker-done-button"
      type="button"
      @click="onDoneClick"
    >
      Done
    </button>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-date-picker-custom-panel {
  grid-area: custom;
  border-top: 1px solid theme.token-as-var('sys.color.border-primary');
  height: 52px;

  &__input {
    outline: none;
    border: 1px solid theme.token-as-var('sys.color.border-primary');
    border-radius: 4px;
    padding: 5px 10px;
    width: 120px;
    height: 32px;
    text-align: center;

    &_time {
      width: 150px;
    }
  }

  &__save-button {
    font-size: 10px;
    width: 44px;
    height: 24px;
    background: theme.token-as-var('sys.color.primary');
    border-radius: 2px;
    color: theme.token-as-var('sys.color.util.surface');
    font-weight: 700;
  }
}
</style>
