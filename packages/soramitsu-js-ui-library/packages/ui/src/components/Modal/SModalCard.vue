<script setup lang="ts">
import { SButton } from '../Button'
import { IconClose } from '../icons'
import { useModalApi } from './api'

withDefaults(
  defineProps<{
    /**
     * If `title` slot is presented, this value is ignored
     */
    title?: string

    /**
     * Flag to control whether to hide the close button
     *
     * @default true
     */
    close?: boolean
  }>(),
  {
    close: true,
  },
)

const api = useModalApi()

function closeClick() {
  api.close()
}
</script>

<template>
  <div class="s-modal-card">
    <div class="s-modal-card__header flex items-center">
      <h2 :id="api.labelledBy" class="sora-tpg-h4-bold flex-1">
        <slot name="title">
          {{ title }}
        </slot>
      </h2>

      <SButton v-if="close" type="action" size="sm" data-testid="btn-close" @click="closeClick">
        <template #icon>
          <IconClose />
        </template>
      </SButton>
    </div>

    <div class="s-modal-card__content px-6 py-8 flex flex-col flex-grow min-h-0">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
@use '@/theme';

$col-surface: theme.token-as-var('sys.color.util.surface');
$shadow: theme.token-as-var('sys.shadow.floating-notification');
$shadow-header: theme.token-as-var('sys.shadow.modal-window-header');

.s-modal-card {
  @apply rounded-xl overflow-hidden;

  background: $col-surface;
  box-shadow: $shadow;
  min-width: 300px;

  &__header {
    @apply px-6 py-6 text-center;
    box-shadow: $shadow-header;
  }
}
</style>
