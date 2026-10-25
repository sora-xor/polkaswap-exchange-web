import type { ToastsApi, ToastRegisterFn, ToastRegisterParams, ToastUnregisterFn } from '@/components/Toasts/api'
import { vi } from 'vitest'

export function createToastsApiMock() {
  const unregister = vi.fn<ToastUnregisterFn>()
  const slots: ToastRegisterParams['slot'][] = []
  const register = vi.fn<ToastRegisterFn>((options) => {
    slots.push(options.slot)
    return unregister
  })

  return {
    api: { register: register as ToastsApi['register'] },
    register,
    unregister,
    slots,
  }
}
