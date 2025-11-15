import './SRadioBody.scss'

import type { FunctionalComponent, PropType } from 'vue'
import { mergeProps } from 'vue'
import type { RadioType, RadioSize } from './types'
import { TYPOGRAPHY } from './const'

interface Props {
  type: RadioType
  size: RadioSize
  labelId: string
  descriptionId: string
}

const SRadioBody: FunctionalComponent<Props> = (props, { attrs, slots }) => {
  const tpg = TYPOGRAPHY[props.size]

  return h(
    'div',
    mergeProps(
      {
        class: 's-radio-body',
        'data-type': props.type,
        'data-size': props.size,
        'aria-labelledby': props.labelId,
        'aria-describedby': props.descriptionId,
      },
      attrs,
    ),
    [
      h('div', { class: 'flex space-x-2 items-center' }, [
        ...(slots.atom?.() ?? []),
        h(
          'label',
          {
            id: props.labelId,
            class: tpg.label,
          },
          slots.label?.(),
        ),
      ]),
      props.type === 'bordered-with-description' &&
        h(
          'div',
          {
            id: props.descriptionId,
            class: [tpg.description, 's-radio-body__description'],
          },
          slots.description?.(),
        ),
    ],
  )
}

SRadioBody.displayName = 'SRadioBody'

SRadioBody.props = {
  type: {
    type: String as PropType<RadioType>,
    required: true,
  },
  size: {
    type: String as PropType<RadioSize>,
    required: true,
  },
  labelId: {
    type: String,
    required: true,
  },
  descriptionId: {
    type: String,
    required: true,
  },
}

export default SRadioBody
