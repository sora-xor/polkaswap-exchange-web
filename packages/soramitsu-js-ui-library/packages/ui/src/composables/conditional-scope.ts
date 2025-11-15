import type { Ref, EffectScope } from 'vue'
import { effectScope, watch, onScopeDispose } from 'vue'

export function useConditionalScope(enabled: Ref<boolean>, scopeSetupFn: () => void) {
  let scope: EffectScope | null = null

  function setupScope() {
    scope = effectScope()
    scope.run(scopeSetupFn)
  }

  function stopScope() {
    scope?.stop()
  }

  watch(
    enabled,
    (flag) => {
      if (flag) {
        setupScope()
      } else {
        stopScope()
      }
    },
    { immediate: true },
  )

  onScopeDispose(stopScope)
}
