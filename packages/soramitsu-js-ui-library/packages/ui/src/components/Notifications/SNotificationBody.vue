<script setup lang="ts">
import type { Status } from '@/types'
import SNotificationBodyTimeline from './SNotificationBodyTimeline.vue'
import { IconClose, STATUS_ICONS_MAP } from '@/components/icons'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    status?: Status
    timeout?: number
    showCloseBtn?: boolean
  }>(),
  {
    status: 'info' as Status,
    timeout: 0,
  },
)

const StatusIcon = computed(() => STATUS_ICONS_MAP[props.status])

const emit = defineEmits(['click:close', 'timeout'])

function onClickClose() {
  emit('click:close')
}

function onTimeout() {
  emit('timeout')
}
</script>

<template>
  <div class="s-notification-body" :data-status="status">
    <div class="flex space-x-4">
      <div class="s-notification-body__icon-wrapper">
        <component :is="StatusIcon" />
      </div>

      <div class="flex-1">
        <div class="sora-tpg-p2">
          <slot name="title">
            {{ title }}
          </slot>
        </div>

        <div class="sora-tpg-p4">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>

      <div class="s-notification-body__close-wrapper">
        <button v-if="showCloseBtn" data-testid="close-btn" @click="onClickClose">
          <IconClose />
        </button>
      </div>
    </div>

    <SNotificationBodyTimeline :timeout="timeout" @timeout="onTimeout" />
  </div>
</template>

<style lang="scss">
@use '@/theme';

@mixin define-icon-color($status) {
  &[data-status='#{$status}'] &__icon-wrapper {
    @content;
  }
}

.s-notification-body {
  @apply px-6 py-4 rounded-lg;

  // for time line
  @apply relative overflow-hidden;

  background: theme.token-as-var('sys.color.content-primary');
  color: theme.token-as-var('sys.color.content-on-background-inverted');
  box-shadow: theme.token-as-var('sys.shadow.floating-notification');

  @mixin apply-icon-color($status) {
    &[data-status='#{$status}'] &__icon-wrapper {
      color: theme.token-as-var('sys.color.status.#{$status}');
    }
  }

  // status variations
  @each $status in 'info', 'success', 'error', 'warning' {
    @include apply-icon-color($status);
  }

  // fix for broken sora icons
  &__close-wrapper svg,
  &__icon-wrapper svg {
    fill: currentColor;
  }
}
</style>
