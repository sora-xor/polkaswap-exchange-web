<script setup lang="ts">
import { h, onScopeDispose } from 'vue'
import SNotificationBody from './SNotificationBody.vue'
import { useConditionalScope } from '@/composables/conditional-scope'
import { forceInject } from '@/util'
import { NOTIFICATIONS_API_KEY } from './api'
import type { Status } from '@/types'

defineOptions({ name: 'SUseNotification' })

const props = withDefaults(
  defineProps<{
    title?: string
    status?: Status
    timeout?: number
    showCloseBtn?: boolean
    description?: string
  }>(),
  {
    status: 'info' as Status,
    timeout: 5000,
  },
)

const show = defineModel<boolean>('show', { default: false })

const emit = defineEmits<(event: 'click:close' | 'timeout') => void>()

const slots = defineSlots<{
  default?: () => any
}>()

const toasts = forceInject(NOTIFICATIONS_API_KEY)

function onTimeout() {
  show.value = false
  emit('timeout')
}

function onClickClose() {
  show.value = false
  emit('click:close')
}

useConditionalScope(show, () => {
  const unreg = toasts.register({
    slot: () =>
      h(
        SNotificationBody,
        {
          ...props,
          'onClick:close': onClickClose,
          onTimeout,
        },
        slots,
      ),
  })

  onScopeDispose(unreg)
})
</script>

<template>
  <span aria-hidden="true" hidden />
</template>
