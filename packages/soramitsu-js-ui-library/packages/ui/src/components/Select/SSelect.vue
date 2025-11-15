<script setup lang="ts">
import type { SelectOption, SelectOptionGroup, SelectSize } from './types'
import { SelectOptionType } from './types'
import SSelectBase from './SSelectBase.vue'
import SSelectInput from './SSelectInput.vue'
import SSelectDropdown from './SSelectDropdown.vue'

const props = defineProps<{
  modelValue?: any
  options?: SelectOption[] | SelectOptionGroup[]
  optionType?: SelectOptionType
  disabled?: boolean
  multiple?: boolean
  label?: string
  size?: SelectSize
  noAutoClose?: boolean
  loading?: boolean
  triggerSearch?: boolean
  dropdownSearch?: boolean
  remoteSearch?: boolean
  maxShownOptions?: string | number | undefined
  mandatory?: boolean
}>()

const defaultOptionType = computed(() => (props.multiple ? SelectOptionType.Checkbox : SelectOptionType.Radio))
</script>

<template>
  <SSelectBase v-bind="{ ...$attrs, ...$props } as any" same-width-popper>
    <template #control="{ search }">
      <SSelectInput data-testid="select-trigger" :search="search">
        <template #label="binding">
          <slot name="label" v-bind="binding">
            {{ label }}
          </slot>
        </template>
      </SSelectInput>
    </template>

    <template #dropdown="{ search }">
      <SSelectDropdown
        :search="search"
        :item-type="optionType ?? defaultOptionType"
        :max-shown-options="+(maxShownOptions ?? 0)"
      >
        <template #empty>
          <slot name="empty" />
        </template>
      </SSelectDropdown>
    </template>
  </SSelectBase>
</template>
