import './SRadioAtom.scss'

import type { FunctionalComponent, PropType } from 'vue'
import { mergeProps } from 'vue'
import type { RadioSize } from './types'

interface Props {
  checked?: boolean
  disabled?: boolean
  /**
   * Forced hover activation. Useful when it is a part of a larger component.
   */
  hover?: boolean
  size: RadioSize
}

const SRadioAtom: FunctionalComponent<Props> = (props, { attrs }) => {
  return h(
    'div',
    mergeProps(
      {
        class: [
          's-radio-atom',
          {
            's-radio-atom_checked': props.checked ?? false,
            's-radio-atom_disabled': props.disabled ?? false,
            's-radio-atom_hover': props.hover ?? false,
          },
        ],
        'data-size': props.size,
      },
      attrs,
    ),
  )
}

SRadioAtom.props = {
  size: {
    type: String as PropType<RadioSize>,
    required: true,
  },
  disabled: Boolean,
  hover: Boolean,
  checked: Boolean,
}

SRadioAtom.displayName = SRadioAtom.name

export default SRadioAtom
