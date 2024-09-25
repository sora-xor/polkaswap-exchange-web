<template>
  <div v-if="infoOnly">
    <slot />
  </div>
  <el-popover
    v-else
    v-model="visible"
    :visible-arrow="false"
    placement="bottom"
    popper-class="transaction-details-popper"
    trigger="click"
  >
    <template #reference>
      <div :class="['transaction-details', { visible }]" v-button>
        <slot name="reference">
          <span>{{ t('transactionDetailsText') }}</span>
        </slot>
        <s-icon :name="icon" size="16px" class="transaction-details-icon" />
      </div>
    </template>
    <slot />
  </el-popover>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class TransactionDetails extends Mixins(TranslationMixin) {
  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  visible = false;

  get icon(): string {
    return this.visible ? 'arrows-chevron-top-24' : 'arrows-chevron-bottom-24';
  }
}
</script>

<style lang="scss">
.transaction-details-popper.el-popover.el-popper {
  @include popper-content;
  min-width: 420px;
}
</style>

<style lang="scss" scoped>
.transaction-details {
  cursor: pointer;
  display: flex;
  gap: $inner-spacing-tiny;
  margin-top: $inner-spacing-medium;
  align-items: center;
  justify-content: center;

  font-size: var(--s-font-size-extra-small);
  font-weight: 400;
  text-transform: uppercase;

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
