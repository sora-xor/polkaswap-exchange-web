import type { FunctionalComponent, PropType } from 'vue'
import { h } from 'vue'
import { IconChevronBottom16, IconArrowsChevronBottom24 } from '@/components/icons'
import './SSelectChevron.scss'

interface Props {
  rotate?: boolean
  variant?: 16 | 24
}

const component: FunctionalComponent<Props> = ({ rotate, variant }) =>
  h(variant === 24 ? IconArrowsChevronBottom24 : IconChevronBottom16, {
    class: [
      's-select-chevron',
      {
        's-select-chevron_rotate': rotate,
      },
    ],
    width: '1em',
    height: '1em',
  })

component.props = {
  rotate: Boolean,
  variant: Number as PropType<16 | 24>,
}
component.displayName = 'SSelectChevron'

export default component
