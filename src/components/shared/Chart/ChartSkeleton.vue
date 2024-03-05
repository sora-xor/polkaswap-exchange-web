<template>
  <s-skeleton class="charts-container" :loading="loading || hasIssue" :throttle="0">
    <template #template>
      <div v-loading="loading" class="charts-skeleton">
        <div class="charts-skeleton-header">
          <s-skeleton-item element="rect" class="charts-skeleton-price" />
          <div class="charts-skeleton-price-impact">
            <s-skeleton-item element="circle" />
            <s-skeleton-item element="rect" />
          </div>
        </div>
        <div class="charts-skeleton-container chart">
          <div v-for="i in yTick" :key="i" class="charts-skeleton-line">
            <s-skeleton-item v-if="yLabel" element="rect" class="charts-skeleton-label" />
            <s-skeleton-item element="rect" class="charts-skeleton-border" />
          </div>
          <div v-if="xLabel" :class="['charts-skeleton-line', 'charts-skeleton-line--lables', { offset: yLabel }]">
            <s-skeleton-item v-for="i in xTick" :key="i" element="rect" class="charts-skeleton-label" />
          </div>
          <div v-if="hasIssue" class="charts-skeleton-error">
            <s-icon v-if="isError" name="clear-X-16" :size="'32px'" />
            <p class="charts-skeleton-error-message">
              <template v-if="isError">{{ t('swap.errorFetching') }}</template>
              <template v-else>{{ t('noDataText') }}</template>
            </p>
            <s-button v-if="isError" type="secondary" size="small" @click="handleRetry">
              {{ t('retryText') }}
            </s-button>
          </div>
        </div>
      </div>
    </template>
    <slot />
  </s-skeleton>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { SSkeleton, SSkeletonItem } from '@soramitsu-ui/ui-vue2/lib/components/Skeleton';
import { Component, Mixins, Prop } from 'vue-property-decorator';

@Component({
  components: {
    SSkeleton,
    SSkeletonItem,
  },
})
export default class ChartSkeleton extends Mixins(mixins.TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isEmpty!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isError!: boolean;
  @Prop({ default: true, type: Boolean }) readonly yLabel!: boolean;
  @Prop({ default: true, type: Boolean }) readonly xLabel!: boolean;
  @Prop({ default: 9, type: Number }) readonly yTick!: boolean;
  @Prop({ default: 11, type: Number }) readonly xTick!: boolean;

  get hasIssue(): boolean {
    return !this.loading && (this.isError || this.isEmpty);
  }

  handleRetry(): void {
    this.$emit('retry');
  }
}
</script>

<style lang="scss">
$skeleton-label-width: 34px;

.charts-container {
  width: 100%;

  .chart {
    height: calc(100% - 51px);
    min-height: 293px;

    @include tablet {
      min-height: 317px;
    }

    &-price {
      display: flex;
      align-items: center;
      gap: $inner-spacing-mini;
      margin-bottom: $inner-spacing-tiny;
      font-weight: 600;
      font-size: var(--s-heading3-font-size);
      line-height: var(--s-line-height-extra-small);
    }
  }
}

.charts-skeleton {
  $margin-right: #{$inner-spacing-tiny};
  $skeleton-label-width-mobile: calc((100% - #{$margin-right} * 10) / 11);
  $skeleton-spacing: 18px;
  $price-impact-height: 16px;

  .el-loading-mask {
    background-color: transparent;
  }
  .el-skeleton__item {
    background: var(--s-color-base-border-secondary);
  }

  &-container {
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-between;
    position: relative;
  }

  &-price {
    width: 157px;

    &.el-skeleton__item.el-skeleton__rect {
      height: 24px;
      margin: 3px 0;
    }

    &-impact {
      display: flex;
      max-width: 150px;
      margin-top: 6px;
      margin-bottom: 2px;

      > :first-child,
      > :last-child {
        height: $price-impact-height;
      }
      > :first-child {
        width: $price-impact-height;
        margin-right: $margin-right;
      }
      > :last-child {
        width: 42px;
      }
    }
  }

  &-line {
    display: flex;
    align-items: center;
    flex-grow: 0;
    margin-top: 22px;

    &--lables {
      justify-content: space-between;
      margin-bottom: $inner-spacing-small;

      &.offset {
        padding-left: calc(#{$margin-right} + #{$skeleton-label-width});
      }
    }
  }

  &-label.el-skeleton__item.el-skeleton__rect {
    height: 8px;
    width: $skeleton-label-width-mobile;
    max-width: $skeleton-label-width;
    margin-bottom: 0;
    margin-right: $margin-right;
  }

  &-border.el-skeleton__rect {
    width: 100%;
    height: 1px;
  }

  &-error {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    top: 0;
    height: 100%;
    width: 100%;
    &-message {
      margin-top: $skeleton-spacing;
      margin-bottom: $skeleton-spacing;
      font-weight: 400;
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
    }
    .el-button.s-secondary {
      padding-right: $inner-spacing-big;
      padding-left: $inner-spacing-big;
    }
  }
  .s-icon-clear-X-16:before {
    color: var(--s-color-status-error);
  }
}
</style>
