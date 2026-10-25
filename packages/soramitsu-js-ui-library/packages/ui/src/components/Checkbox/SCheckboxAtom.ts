import './SCheckboxAtom.scss'

import IconCheck from '~icons/uil/check'
import IconMinus from '~icons/uil/minus'

import type { FunctionalComponent, PropType } from 'vue'
import { mergeProps } from 'vue'
import type { CheckboxSize, CheckboxState } from './types'

interface Props {
  size: CheckboxSize
  checked?: CheckboxState
  hover?: boolean
  disabled?: boolean
}

const IconEmpty = () => h('svg', { width: '1.2em', height: '1.2em' }, h('path'))

const SCheckboxAtom: FunctionalComponent<Props> = (props, { attrs }) => {
  return h(
    'div',
    mergeProps(
      {
        class: [
          's-checkbox-atom',
          {
            's-checkbox-atom_disabled': props.disabled ?? false,
            's-checkbox-atom_hover': props.hover ?? false,
          },
        ],
        'data-size': props.size,
        'data-checked': props.checked ?? false,
      },
      attrs,
    ),
    [props.checked ? (props.checked === 'mixed' ? h(IconMinus) : h(IconCheck)) : IconEmpty()],
  )
}

SCheckboxAtom.displayName = 'SCheckboxAtom'

SCheckboxAtom.props = {
  size: {
    type: String as PropType<CheckboxSize>,
    required: true,
  },
  checked: {
    type: [Boolean, String] as PropType<CheckboxState>,
  },
  hover: Boolean,
  disabled: Boolean,
}

export default SCheckboxAtom
