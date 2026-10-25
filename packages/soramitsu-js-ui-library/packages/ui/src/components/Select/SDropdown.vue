<script setup lang="ts">
import type { SelectOption, SelectSize, SelectOptionGroup } from './types'
import { SelectButtonType, SelectOptionType } from './types'
import SSelectBase from './SSelectBase.vue'
import SSelectButton from './SSelectButton.vue'
import SSelectDropdown from './SSelectDropdown.vue'
import type { SelectApi } from './api'

const props = defineProps<{
  modelValue?: any
  options?: SelectOption[] | SelectOptionGroup[]
  optionType?: SelectOptionType
  disabled?: boolean
  multiple?: boolean
  label?: string
  size?: SelectSize
  inline?: boolean
  noAutoClose?: boolean
  loading?: boolean
  dropdownSearch?: boolean
  remoteSearch?: boolean
  maxShownOptions?: string | number | undefined
  mandatory?: boolean
}>()

const buttonType = computed(() => (props.inline ? SelectButtonType.Inline : SelectButtonType.Default))

const slots = defineSlots<{
  label?: (api: SelectApi<any>) => any
  empty?: () => any
}>()

function isThereLabelSlot() {
  return !!slots.label
}
</script>

<template>
  <SSelectBase v-bind="{ ...$attrs, ...$props } as any" :same-width-popper="loading">
    <template #control>
      <SSelectButton data-testid="select-trigger" :type="buttonType">
        <template v-if="isThereLabelSlot() || label" #label="binding">
          <slot name="label" v-bind="binding">
            {{ label }}
          </slot>
        </template>
      </SSelectButton>
    </template>

    <template #dropdown="{ search }">
      <SSelectDropdown
        :search="search"
        :item-type="optionType ?? SelectOptionType.Default"
        :max-shown-options="+(maxShownOptions ?? 0)"
      >
        <template #empty>
          <slot name="empty" />
        </template>
      </SSelectDropdown>
    </template>
  </SSelectBase>
</template>
