<template>
  <div class="transaction-details-wrapper">
    <s-collapse>
      <s-collapse-item>
        <template #title>
          <span>transaction details</span>
        </template>
        <slot></slot>
      </s-collapse-item>
    </s-collapse>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class TransactionDetails extends Vue {}
</script>

<style lang="scss">
.transaction-details-wrapper {
  margin-bottom: -24px;

  .el-collapse-item__header {
    display: flex;
    text-transform: uppercase;
    font-weight: 400;
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
    width: 13px;
  }

  .el-collapse-item__header {
    display: inline-flex;
    line-height: 13px;
    height: 14px;
    font-size: 13px;
    margin-bottom: 15px;

    .el-icon-arrow-right {
      &:hover {
        cursor: pointer;
      }
    }
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active {
    transform: scale(1, -1);
    transition: transform 0.3s;

    &:hover {
      cursor: pointer !important;
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
