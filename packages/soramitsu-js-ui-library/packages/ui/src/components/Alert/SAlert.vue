<script setup lang="ts">
import { IconClose, STATUS_ICONS_MAP } from '@/components/icons'
import type { Status } from '@/types'
import type { Component } from 'vue'

interface Props {
  inline?: boolean
  status?: Status
  showCloseBtn?: boolean
  title?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  status: 'info' as Status,
  showCloseBtn: false,
})

const emit = defineEmits<(event: 'click:close') => void>()

const StatusIcon = shallowRef<Component>()

watchSyncEffect(() => {
  StatusIcon.value = STATUS_ICONS_MAP[props.status]
})

function onClickClose() {
  emit('click:close')
}
</script>

<template>
  <div :class="['s-alert', { 's-alert_inline': inline }]" :data-status="status">
    <div class="s-alert__icon-wrapper">
      <component :is="StatusIcon" />
    </div>

    <div class="flex-1">
      <div class="sora-tpg-h5">
        <slot name="title">
          {{ title }}
        </slot>
      </div>

      <div class="sora-tpg-p3">
        <slot name="description">
          {{ description }}
        </slot>
      </div>
    </div>

    <div v-if="showCloseBtn" class="s-alert__close-wrapper">
      <button data-testid="close-btn" @click="onClickClose">
        <IconClose />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

.s-alert {
  @apply rounded border border-solid;
  @apply px-6 py-4;
  @apply flex space-x-4;

  @each $status in ('info', 'warning', 'success', 'error') {
    $bg: theme.token-as-var('sys.color.status.#{$status}-background');
    $fg: theme.token-as-var('sys.color.status.#{$status}');

    &[data-status='#{$status}'] {
      background: $bg;
      border-color: $fg;
    }

    &[data-status='#{$status}'] &__icon-wrapper {
      color: $fg;
    }
  }

  // TODO(see docs/backlog.md#alert) implement inline variant

  &__icon-wrapper svg,
  &__close-wrapper svg {
    fill: currentColor;
  }
}
</style>
