import type { FunctionalComponent, PropType } from 'vue'
import { h } from 'vue'
import type { ToastsDisplayPlacementHorizontal, ToastsDisplayPlacementVertical } from '../Toasts'
import { SToastsProvider, SToastsDisplay } from '../Toasts'
import { NOTIFICATIONS_API_KEY } from './api'

/**
 * @remarks
 * Usage:
 *
 * ```html
 * <SNotificationsProvider>
 *   <!-- use notifications here -->
 * </SNotificationsProvider>
 * ```
 *
 * Btw it is a shortcut for:
 *
 * ```vue
 * <script setup>
 * import { SToastsProvider, SToastsDisplay, NOTIFICATIONS_API_KEY } from '@soramitsu-ui/ui'
 * </script>
 *
 * <template>
 *   <SToastsProvider :api-key="NOTIFICATIONS_API_KEY">
 *     <SToastsDisplay />
 *
 *     <!-- ... -->
 *   </SToastsProvider>
 * </template>
 * ```
 */
const component: FunctionalComponent<{
  vertical?: ToastsDisplayPlacementVertical
  horizontal?: ToastsDisplayPlacementHorizontal
  absolute?: boolean
  to?: string
}> = (props, { slots }) =>
  h(
    SToastsProvider,
    {
      apiKey: NOTIFICATIONS_API_KEY,
    },
    {
      default: () => [
        h(SToastsDisplay as any, {
          // reactivity is lost if props are not spreaded
          ...props,
        }),
        slots.default?.(),
      ],
    },
  )

component.props = {
  // no need in validators - placements will be validates in the display component
  vertical: { type: String as PropType<ToastsDisplayPlacementVertical> },
  horizontal: { type: String as PropType<ToastsDisplayPlacementHorizontal> },
  absolute: Boolean,
  to: String,
}

component.displayName = 'SNotificationsProvider'

export default component
