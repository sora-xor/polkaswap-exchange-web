<template>
  <div v-if="infoOnly" v-bind="attrs">
    <slot></slot>
  </div>
  <span v-else v-bind="attrs">
    <s-popover-panel
      v-model:show="visible"
      :visible-arrow="false"
      :disabled="disabled"
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

const props = withDefaults(
  defineProps<{
    infoOnly?: boolean;
    disabled?: boolean;
  }>(),
  {
    infoOnly: true,
    disabled: false,
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
</style>
