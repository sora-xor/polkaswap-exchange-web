import type { InjectionKey, Ref } from 'vue'

export type RowContext = {
  gutter: Ref<number>
}

export const ROW_INJECTION_KEY: InjectionKey<RowContext> = Symbol('soramitsu-ui-row')
