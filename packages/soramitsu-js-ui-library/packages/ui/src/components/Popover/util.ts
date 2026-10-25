import type { Ref, BaseTransitionProps } from 'vue'

/**
 * TODO(see docs/backlog.md#popover) Reuse this functionality in `SModal` to remove duplication.
 */
export function useWrappedTransitionVisibility({ show, eager }: { show: Ref<boolean>; eager: Ref<boolean> }): {
  wrapperIf: Ref<boolean>
  wrapperShow: Ref<boolean>
  contentIf: Ref<boolean>
  contentShow: Ref<boolean>
  transitionProps: Partial<BaseTransitionProps>
} {
  const isContentMounted = ref(false)

  const wrapperIf = eagerComputed(() => eager.value || show.value || isContentMounted.value)
  const wrapperShow = eagerComputed(() => !eager.value || isContentMounted.value || show.value)

  const contentIf = eagerComputed(() => eager.value || show.value)
  const contentShow = eagerComputed(() => !eager.value || show.value)

  // don't "appear" if element should be mounted eagerly, but firstly is hidden
  const transitionAppear = !(eager.value && !show.value)

  const onContentBeforeEnter = () => {
    isContentMounted.value = true
  }
  const onContentAfterLeave = () => {
    isContentMounted.value = false
  }

  return {
    wrapperIf,
    wrapperShow,
    contentIf,
    contentShow,
    transitionProps: {
      appear: transitionAppear,
      onBeforeEnter: onContentBeforeEnter,
      onAfterLeave: onContentAfterLeave,
    },
  }
}
