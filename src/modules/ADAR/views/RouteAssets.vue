<template>
  <div v-loading="parentLoading" class="route-assets">
    <component :is="component"></component>
    <!-- <div class="temp-div">
      <s-button
        type="primary"
        class="s-typography-button--big route-assets-upload-csv__button"
        @click.stop="previousStage"
      >
        {{ 'Previous step' }}
      </s-button>
      <s-button
        type="secondary"
        class="s-typography-button--big route-assets-upload-csv__button"
        @click.stop="nextStage"
      >
        {{ 'Next step' }}
      </s-button>
    </div> -->
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { AdarComponents } from '@/modules/ADAR/consts';
import { adarLazyComponent } from '@/modules/ADAR/router';
import { getter, action, mutation } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { LiquiditySourceTypes, PrimaryMarketsEnabledAssets } from '@sora-substrate/liquidity-proxy';
import { FeatureFlags } from '@/store/settings/types';
@Component({
  components: {
    Authorize: adarLazyComponent(AdarComponents.RouteAssetsAuthorize),
    Done: adarLazyComponent(AdarComponents.RouteAssetsDone),
    ProcessTemplate: adarLazyComponent(AdarComponents.RouteAssetsProcessTemplate),
    ReviewDetails: adarLazyComponent(AdarComponents.RouteAssetsReviewDetails),
    Routing: adarLazyComponent(AdarComponents.RouteAssetsRouting),
    TransactionOverview: adarLazyComponent(AdarComponents.RouteAssetsTransactionOverview),
    UploadTemplate: adarLazyComponent(AdarComponents.RouteAssetsUploadTemplate),
  },
})
export default class RouteAssets extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @action.routeAssets.subscribeOnReserves private subscribeOnReserves!: () => void;
  @action.routeAssets.cleanSwapReservesSubscription private cleanSwapReservesSubscription!: () => void;
  @mutation.settings.setFeatureFlags private setFeatureFlags!: (data: FeatureFlags) => void;

  @getter.routeAssets.currentStageComponentName currentStageComponentName!: string;
  @action.routeAssets.processingNextStage nextStage!: any;
  @action.routeAssets.processingPreviousStage previousStage!: any;

  // @Watch('liquiditySource')
  // private handleLiquiditySourceChange(): void {
  //   this.subscribeOnReserves();
  // }

  created() {
    this.withApi(async () => {
      this.subscribeOnReserves();
      this.setFeatureFlags({ charts: false, moonpay: false });
    });
  }

  beforeDestroy(): void {
    this.cleanSwapReservesSubscription();
  }

  get component() {
    return this.currentStageComponentName;
  }
}
</script>

<style lang="scss">
.route-assets {
  max-width: 988px;
  margin: $inner-spacing-medium auto;
  .container {
    max-width: none;
  }

  &__page-header-title {
    font-weight: 600;
    font-size: 28px;
    line-height: var(--s-line-height-small);
    text-align: center;
    letter-spacing: -0.02em;
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-primary);
  }

  &__page-header-description {
    font-weight: 300;
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-medium);
  }

  &__ref {
    color: var(--s-color-theme-accent);
    text-decoration: underline;
  }
  .fields-container {
    > div {
      margin-bottom: 0;
    }
    .el-divider {
      margin-bottom: $inner-spacing-medium;
      margin-top: 4px;
    }
    .field {
      text-transform: uppercase;
      font-weight: 300;
      font-size: 13px;
      @include flex-between;
      position: relative;

      .warning-message {
        position: absolute;
        left: 0;
        bottom: 0;
        margin-bottom: -16px;
      }

      &__status {
        display: flex;
        justify-content: flex-end;
        align-items: center;

        &_error {
          color: var(--s-color-status-error);
          font-weight: 600;
          fill: var(--s-color-status-error);
        }

        &_success {
          color: var(--s-color-status-success);
          font-weight: 600;
          fill: var(--s-color-status-success);
        }
        i {
          font-size: 16px !important;
          color: inherit;
        }
      }

      &__value {
        font-weight: 600;
        font-size: 13px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 4px;

        &_failed {
          color: var(--s-color-status-error);
          font-weight: 600;
          fill: var(--s-color-status-error);
          &::after {
            margin-left: 4px;
            content: '✕';
            display: inline;
            color: var(--s-color-status-error);
          }
        }
        &_routed {
          color: var(--s-color-status-success);
          font-weight: 600;
          fill: var(--s-color-status-success);
          &::after {
            margin-left: 4px;
            content: '✓';
            display: inline;
            color: var(--s-color-status-success);
          }
        }
        &_waiting {
          color: var(--s-color-status-warning);
          font-weight: 600;
          fill: var(--s-color-status-warning);
          &::after {
            margin-left: 4px;
            content: '...';
            display: inline;
            color: var(--s-color-status-warning);
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.temp-div {
  width: 800px;
  margin: 0 auto;
  @include flex-between;

  button {
    display: block;
    margin: 0;
  }
}
</style>
