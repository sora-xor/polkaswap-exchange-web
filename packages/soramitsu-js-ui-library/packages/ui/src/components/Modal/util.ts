import type { Ref } from 'vue'
import { not, or, and } from '@vueuse/math'

/**
 * Transforms *something* into something that could be binded to `Transition` component as `v-bind="something"`
 * @param something - falsy will be transformed to null, string to { name }, any other will be returned as-is
 * @returns bindable attrs
 */
export function normalizeTransitionAttrs(something: null | undefined | string | object): null | object {
  if (!something) return null
  if (typeof something === 'string') return { name: something }
  return something
}

export function useCloseOnEsc(active: Ref<boolean>, closeCb: () => void) {
  onKeyStroke('Escape', () => {
    if (active.value) {
      closeCb()
    }
  })
}

const VisibilityState = {
  Hidden: 'hidden',
  Entering: 'entering',
  Visible: 'visible',
  Leaving: 'leaving',
} as const

type VisibilityState = (typeof VisibilityState)[keyof typeof VisibilityState]

type VisibilityStateMap<K extends string> = {
  [key in K]: VisibilityState
}

function createVisibilityReactiveState<K extends string>(keys: K[]): VisibilityStateMap<K> {
  return reactive(Object.fromEntries(keys.map((key) => [key, VisibilityState.Hidden]))) as any
}

function useVisibilityState<K extends string>(
  keys: K[],
): {
  state: VisibilityStateMap<K>
  toggle: (key: K, state: VisibilityState) => void
} {
  const state = createVisibilityReactiveState(keys)

  function toggle(key: K, value: VisibilityState) {
    state[key] = value
  }

  return { state, toggle }
}

function createTransitionVisibilityListeners<K>(
  key: K,
  toggle: (key: K, state: VisibilityState) => void,
): Record<string, () => void> {
  return {
    beforeEnter: () => toggle(key, VisibilityState.Entering),
    afterEnter: () => toggle(key, VisibilityState.Visible),
    beforeLeave: () => toggle(key, VisibilityState.Leaving),
    afterLeave: () => toggle(key, VisibilityState.Hidden),
  }
}

export interface UseModalVisibilityParams {
  /**
   * High-level show control
   */
  show: Ref<boolean>

  /**
   * Whether to render modal with `v-show`
   */
  eager: Ref<boolean>

  overlayEnabled: Ref<boolean>

  /**
   * Events will be emitted according to actual visibility of modal fragments
   */
  emit: (event: 'before-open' | 'after-open' | 'before-close' | 'after-close') => void
}

type SomeListeners = Record<string, () => void>

export interface UseModalVisibilityReturn {
  rootIf: Ref<boolean>
  rootShow: Ref<boolean>
  modalIf: Ref<boolean>
  modalShow: Ref<boolean>
  overlayIf: Ref<boolean>

  toggleFragmentVisibility: (key: 'modal' | 'overlay', state: VisibilityState) => void

  overlayTransitionListeners: SomeListeners
  modalTransitionListeners: SomeListeners

  /**
   * There is a corner case: when `eager` is enabled and modal renders with v-if but not with v-show, Transition
   * component fires appear transition i.e. enter transition. It violates visibility invariant.
   *
   * To solve this, this flag will be `false` when `eager` is true and initial show is `false`.
   *
   * Btw, issue:
   * https://github.com/vuejs/vue-next/issues/4845
   *
   * Comment with solution that i decided to use:
   * https://github.com/vuejs/vue-next/issues/4845#issuecomment-957974094
   */
  modalTransitionAppear: boolean
}

export function useModalVisibility({
  show,
  eager,
  emit,
  overlayEnabled,
}: UseModalVisibilityParams): UseModalVisibilityReturn {
  const { toggle, state } = useVisibilityState(['modal', 'overlay'])

  const allHidden = computed(() => state.modal === VisibilityState.Hidden && state.overlay === VisibilityState.Hidden)
  const allVisible = computed(
    () => state.modal === VisibilityState.Visible && state.overlay === VisibilityState.Visible,
  )
  const notAllHidden = not(allHidden)

  watch(
    show,
    (value) => {
      if (value) emit('before-open')
      else emit('before-close')
    },
    { flush: 'pre' },
  )

  whenever(allVisible, () => emit('after-open'))
  whenever(allHidden, () => emit('after-close'))

  const rootIf = or(eager, show, notAllHidden)
  const rootShow = or(show, notAllHidden)

  const modalIf = or(eager, show)
  const modalShow = show
  const modalTransitionAppear = !(eager.value && !show.value)

  const overlayIf = and(show, overlayEnabled)

  return {
    toggleFragmentVisibility: toggle,
    rootIf,
    rootShow,
    modalIf,
    modalShow,
    modalTransitionAppear,
    overlayIf,

    overlayTransitionListeners: createTransitionVisibilityListeners('overlay', toggle),
    modalTransitionListeners: createTransitionVisibilityListeners('modal', toggle),
  }
}
