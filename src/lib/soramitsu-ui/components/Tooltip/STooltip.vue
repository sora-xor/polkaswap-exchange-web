<script setup lang="ts">
import { SPopover, SPopoverWrappedTransition } from '@soramitsu-ui/ui/components/Popover';
import { SButton } from '@soramitsu-ui/ui/components/Button';
import type { BasePlacement } from '@popperjs/core';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    wrapperTag?: string | object;
    content?: string;
    header?: string;
    placement?: BasePlacement;
    primaryButtonText?: string;
    secondaryButtonText?: string;
  }>(),
  {
    wrapperTag: 'div',
    content: '',
    header: '',
    placement: 'bottom',
    primaryButtonText: '',
    secondaryButtonText: '',
  }
);

const emit = defineEmits(['click:primary-button', 'click:secondary-button']);

function handlePrimaryButtonClick() {
  emit('click:primary-button');
}

function handleSecondaryButtonClick() {
  emit('click:secondary-button');
}
</script>

<template>
  <SPopover distance="4" :placement="placement">
    <template #trigger>
      <component :is="wrapperTag" v-bind="$attrs" data-testid="tooltip-trigger">
        <slot />
      </component>
    </template>

    <template #popper>
      <SPopoverWrappedTransition name="tooltip-default-transition">
        <div class="s-tooltip__body sora-tpg-p4 px-16px py-12px" data-testid="tooltip-body">
          <div v-if="$slots.header || header" class="sora-tpg-p1 mb-4px" data-testid="tooltip-header">
            <slot name="header">
              {{ header }}
            </slot>
          </div>

          <div data-testid="tooltip-content">
            <slot name="content">
              {{ content }}
            </slot>
          </div>

          <div v-if="primaryButtonText || secondaryButtonText" class="mt-8px py-4px">
            <SButton
              v-if="primaryButtonText"
              class="s-tooltip__button first:mr-8px"
              type="outline"
              size="sm"
              data-testid="tooltip-primary-button"
              @click="handlePrimaryButtonClick"
            >
              {{ primaryButtonText }}
            </SButton>
            <SButton
              v-if="secondaryButtonText"
              class="s-tooltip__button"
              type="outline"
              size="sm"
              data-testid="tooltip-secondary-button"
              @click="handleSecondaryButtonClick"
            >
              {{ secondaryButtonText }}
            </SButton>
          </div>
        </div>
      </SPopoverWrappedTransition>
    </template>
  </SPopover>
</template>

<style lang="scss">
@use '@soramitsu-ui/theme';

.s-tooltip {
  &__body {
    background: theme.token-as-var('sys.color.content-primary');
    color: theme.token-as-var('sys.color.content-on-background-inverted');
    border-radius: 4px;
  }

  &__button.s-button {
    &_type_outline {
      border-color: theme.token-as-var('sys.color.border-primary');
      color: theme.token-as-var('sys.color.content-on-background-inverted');

      &:hover,
      &:active {
        border-color: theme.token-as-var('sys.color.util.surface');
        background: theme.token-as-var('sys.color.util.surface');
        color: theme.token-as-var('sys.color.content-primary');
      }
    }

    &_type_outline#{&}_disabled {
      border-color: theme.token-as-var('sys.color.disabled');
      color: theme.token-as-var('sys.color.on-disabled');
    }
  }
}

.tooltip-default-transition {
  &-enter-active,
  &-leave-active {
    opacity: 1;
    transition: 150ms ease-in-out opacity;
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
  }
}
</style>
