<script setup lang="ts">
import { computed } from 'vue';
import { SButton } from '@soramitsu-ui/ui/components/Button';
import type { BasePlacement } from '@popperjs/core';
import SPopoverPanel from '@/lib/soramitsu-ui/components/Popover/SPopoverPanel';
import type { OverlayTarget } from '@/lib/soramitsu-ui/composables/overlayTarget';

defineOptions({ inheritAttrs: false });

type TooltipTrigger = 'manual' | 'hover' | 'click' | 'focus';

const props = withDefaults(
  defineProps<{
    wrapperTag?: string | object;
    content?: string;
    header?: string;
    placement?: BasePlacement;
    trigger?: TooltipTrigger;
    popperClass?: string;
    appendToBody?: boolean;
    teleportTo?: OverlayTarget;
    tabindex?: string | number;
    visibleArrow?: boolean;
    openDelay?: string | number;
    closeDelay?: string | number;
    primaryButtonText?: string;
    secondaryButtonText?: string;
  }>(),
  {
    wrapperTag: 'div',
    content: '',
    header: '',
    placement: 'bottom',
    trigger: 'hover',
    popperClass: '',
    appendToBody: true,
    teleportTo: 'body',
    tabindex: undefined,
    visibleArrow: false,
    openDelay: 0,
    closeDelay: 0,
    primaryButtonText: '',
    secondaryButtonText: '',
  }
);

const emit = defineEmits(['click:primary-button', 'click:secondary-button']);

const popperClassNames = computed(() => ['s-tooltip-popper', props.popperClass].filter(Boolean).join(' '));
const resolvedTeleportTo = computed(() => (props.appendToBody ? props.teleportTo : null));

function handlePrimaryButtonClick() {
  emit('click:primary-button');
}

function handleSecondaryButtonClick() {
  emit('click:secondary-button');
}
</script>

<template>
  <SPopoverPanel
    :placement="placement"
    :trigger="trigger"
    :popper-class="popperClassNames"
    :teleport-to="resolvedTeleportTo"
    :tabindex="tabindex"
    :visible-arrow="visibleArrow"
    :open-delay="openDelay"
    :close-delay="closeDelay"
  >
    <template #reference>
      <component :is="wrapperTag" v-bind="$attrs" data-testid="tooltip-trigger">
        <slot />
      </component>
    </template>

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
  </SPopoverPanel>
</template>

<style lang="scss">
@use '@soramitsu-ui/theme';

.s-tooltip-popper.el-popover.el-popper {
  border: 0;
  background: transparent;
  box-shadow: none;
  min-width: auto;
  padding: 0;
}

.s-tooltip {
  &__body {
    background: theme.token-as-var('sys.color.content-primary');
    color: theme.token-as-var('sys.color.content-on-background-inverted');
    border-radius: 4px;
    box-sizing: border-box;
    max-width: min(480px, calc(100vw - 16px));
    overflow-wrap: anywhere;
    white-space: normal;
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

</style>
