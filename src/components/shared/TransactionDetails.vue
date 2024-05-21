<template>
  <div v-if="infoOnly">
    <slot />
  </div>
  <div v-else class="transaction-details-wrapper">
    <s-collapse>
      <s-collapse-item>
        <template #title>
          <span>{{ t('transactionDetailsText') }}</span>
        </template>
        <slot></slot>
      </s-collapse-item>
    </s-collapse>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class TransactionDetails extends Mixins(TranslationMixin) {
  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
}
</script>

<style lang="scss">
.transaction-details-wrapper {
  .el-collapse-item__header {
    display: flex;
    text-transform: uppercase;
    font-weight: 400;
  }

  .el-collapse-item__content {
    padding-bottom: 0;
  }

  .el-collapse-item__wrap {
    margin-top: $inner-spacing-medium;
  }

  .el-collapse.neumorphic .el-icon-arrow-right {
    all: initial;
    * {
      all: unset;
    }

    transition: transform 0.3s;
    color: var(--s-color-base-content-tertiary);
    margin-left: 7px;
    height: 16px;
    line-height: 1;
    width: 13px;
    position: relative;
  }

  .el-collapse-item__header {
    display: inline-flex;
    line-height: 13px;
    height: 14px;
    font-size: var(--s-font-size-extra-small);

    .el-icon-arrow-right {
      position: relative;

      &:hover {
        cursor: pointer;
      }
    }
  }

  .el-collapse-item > div:first-child {
    display: flex;
    justify-content: center;
  }

  .info-line .el-tooltip {
    margin-bottom: 4px !important;
  }
}
</style>
