<script setup lang="ts">
import { uniqueElementId } from '@/util'
import type { CheckboxSize, CheckboxType } from './types'
import { CHECKBOX_SIZE_VALUES, CHECKBOX_TYPE_VALUES } from './types'
import { usePropTypeFilter } from '@/composables/prop-type-filter'
import SRadioBody from '../Radio/SRadioBody'
import SCheckboxAtom from './SCheckboxAtom'
import { usePassiveModel } from '@/composables/passive-model'

interface Props {
  modelValue?: boolean
  type?: CheckboxType
  size?: CheckboxSize
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  type: 'default',
  size: 'md',
})

const propFilter = usePropTypeFilter(props)

const definitelyType = propFilter('type', CHECKBOX_TYPE_VALUES, 'default')
const definitelySize = propFilter('size', CHECKBOX_SIZE_VALUES, 'md')

const rawModel = defineModel<boolean>('modelValue', { default: false })
const model = usePassiveModel(rawModel)

function toggleModel() {
  model.value = !model.value
}

const uniqueLabelId = uniqueElementId()
const uniqueDescriptionId = uniqueElementId()
const hover = ref(false)
</script>

<template>
  <!-- it is not needed because focus state is controlled via CSS -->
  <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events -->
  <SRadioBody
    role="checkbox"
    :aria-checked="model"
    :aria-disabled="disabled"
    :size="definitelySize"
    :type="definitelyType"
    :label-id="uniqueLabelId"
    :description-id="uniqueDescriptionId"
    :tabindex="disabled ? -1 : 0"
    class="s-checkbox-solo"
    @click="toggleModel"
    @keypress.space="toggleModel"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <template #atom>
      <SCheckboxAtom :checked="model" :size="definitelySize" :disabled="disabled" :hover="hover" />
    </template>

    <template #label>
      <slot />
    </template>

    <template #description>
      <slot name="description" />
    </template>
  </SRadioBody>
</template>
