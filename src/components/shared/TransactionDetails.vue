<template>
  <div v-if="infoOnly" v-bind="attrs">
    <slot></slot>
  </div>
  <div v-else-if="inline" class="transaction-details-inline" v-bind="attrs">
    <div
      :class="['transaction-details', { visible, disabled }]"
      :aria-expanded="String(visible)"
      v-button
      @click="toggleInlineVisibility"
    >
      <slot name="reference">
        <span>{{ t('transactionDetailsText') }}</span>
      </slot>
      <s-icon :name="icon" size="16px" class="transaction-details-icon"></s-icon>
    </div>
    <transition name="transaction-details-inline">
      <div v-if="visible" class="transaction-details-inline-content">
        <slot></slot>
      </div>
    </transition>
  </div>
  <span v-else v-bind="attrs">
    <s-popover-panel
      v-model:show="visible"
      :visible-arrow="false"
      placement="bottom"
      popper-class="transaction-details-popper"
      trigger="click"
    >
      <template #reference>
        <div :class="['transaction-details', { visible, disabled }]" v-button>
          <slot name="reference">
            <span>{{ t('transactionDetailsText') }}</span>
          </slot>
          <s-icon :name="icon" size="16px" class="transaction-details-icon"></s-icon>
        </div>
      </template>
      <slot></slot>
    </s-popover-panel>
  </span>
</template>

<script lang="ts" setup>
import { computed, ref, useAttrs, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

type Props = {
  /** Renders the details content directly without a disclosure trigger. */
  infoOnly?: boolean;
  /** Applies disabled styling and closes currently open details when set. */
  disabled?: boolean;
  /** Renders details in normal document flow so parent widgets expand instead of showing an overlay. */
  inline?: boolean;
};

const props = withDefaults(
  defineProps<Props>(),
  {
    infoOnly: true,
    disabled: false,
    inline: false,
  }
);

const attrs = useAttrs();

const visible = ref(false);

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      visible.value = false;
    }
  }
);

const icon = computed(() => (visible.value ? 'arrows-chevron-top-24' : 'arrows-chevron-bottom-24'));

const { t } = useTranslation();

const toggleInlineVisibility = (): void => {
  visible.value = !visible.value;
};

defineExpose({
  visible,
});
</script>

<style lang="scss">
.transaction-details-popper.el-popover.el-popper {
  @include popper-content;
  width: min(420px, calc(100vw - 24px));
  min-width: min(420px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
}
</style>

<style lang="scss" scoped>
.transaction-details {
  display: flex;
  gap: $inner-spacing-tiny;
  margin-top: $inner-spacing-medium;
  align-items: center;
  justify-content: center;

  font-size: var(--s-font-size-extra-small);
  font-weight: 400;
  text-transform: uppercase;

  &:not(.disabled) {
    cursor: pointer;
  }

  &.visible {
    color: var(--s-color-theme-accent);
  }

  &:hover,
  &:focus {
    outline: none;
    color: var(--s-color-theme-accent-hover);

    .transaction-details-icon {
      color: var(--s-color-base-content-secondary);
    }
  }

  &-icon {
    @include icon-styles;
  }
}

.transaction-details-inline {
  width: 100%;

  &-content {
    @include popper-content;
    box-sizing: border-box;
    width: 100%;
    margin-top: $inner-spacing-small;
  }

  &-enter-active,
  &-leave-active {
    transition:
      opacity 0.12s ease,
      transform 0.12s ease;
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
