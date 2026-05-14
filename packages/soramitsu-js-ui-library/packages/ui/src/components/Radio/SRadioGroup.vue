<script setup lang="ts">
import { RADIO_GROUP_API_KEY } from './api'
import { useRadiosSelector, useRadiosRegistration } from './util'
import { usePassiveModel } from '@/composables/passive-model'

interface Props {
  modelValue?: null | symbol | string | number | object

  /**
   * @default '[role=radio]'
   */
  radioSelector?: string

  labelledBy?: string
  describedBy?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  radioSelector: '[role=radio]',
  labelledBy: '',
  describedBy: '',
})

const rawModel = defineModel<null | symbol | string | number | object>('modelValue', { default: null })
const model = usePassiveModel(rawModel)

const { elems: radioElements, update: updateRadioElements } = useRadiosSelector<HTMLElement>(
  templateRef('root'),
  computed(() => props.radioSelector),
)

const { registerRadio, moveFocus, checkFocused } = useRadiosRegistration({
  radioElements,
  model,
  updateRadioElements,
})

provide(RADIO_GROUP_API_KEY, readonly({ registerRadio }))

// Handling keyboard

function handleKeydown(e: KeyboardEvent) {
  switch (e.code) {
    case 'ArrowDown':
    case 'ArrowRight':
      moveFocus()
      break

    case 'ArrowUp':
    case 'ArrowLeft':
      moveFocus(false)
      break

    case 'Space':
      checkFocused()
      break

    default:
      return
  }

  // was handled
  e.preventDefault()
}
</script>

<template>
  <!--
    https://www.w3.org/TR/wai-aria-practices-1.1/examples/radio/radio-1/radio-1.html
    "radiogroup ... Is not focusable because focus is managed using a roving tabindex strategy as described below."
  -->
  <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
  <div
    ref="root"
    role="radiogroup"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    @keydown="handleKeydown"
  >
    <slot />
  </div>
</template>
