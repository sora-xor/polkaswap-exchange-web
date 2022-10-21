<template>
  <div class="route-assets-routing-template">
    <div>
      <s-button type="link" @click="back">
        <s-icon name="arrows-arrow-left-24" />
        {{ t('adar.routeAssets.routingTemplate.backButton') }}
      </s-button>
      <template-summary
        :asset="asset"
        :summaryData="summaryData"
        @onRouteAssetsClick="onRouteAssets"
        @onTokenSelectClick="onTokenSelect"
      ></template-summary>
      <transaction-overview></transaction-overview>
      <authorize-dialog
        :asset="asset"
        :total-assets="totalAssetRequiredString"
        :visible.sync="showAuthorizeRoutingDialog"
        @authorize="authorize"
      ></authorize-dialog>
    </div>
    <select-token
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :asset="asset"
      @select="onTokenSelected"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { api, FPNumber } from '@sora-substrate/util/build';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state, mutation, action } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { groupBy, sumBy } from 'lodash';
@Component({
  components: {
    TemplateSummary: lazyComponent(Components.TemplateSummary),
    TransactionOverview: lazyComponent(Components.TransactionOverview),
    AuthorizeDialog: lazyComponent(Components.AuthorizeRoutingTemplateDialog),
    SelectToken: lazyComponent(Components.SelectToken),
  },
})
export default class RoutingTemplate extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @state.wallet.account.fiatPriceAndApyObject private fiatPriceAndApyObject!: any;

  @getter.routeAssets.recipients recipients!: Array<any>;
  @getter.routeAssets.subscriptions subscriptions!: Array<any>;
  @getter.routeAssets.isProcessed processed!: boolean;
  @action.routeAssets.cleanSwapReservesSubscription cleanSwapReservesSubscription!: void;
  @action.routeAssets.runAssetsRouting runAssetsRouting!: any;

  // processed = false;
  showAuthorizeRoutingDialog = false;
  showSelectTokenDialog = false;
  asset = this.xor;

  onTokenSelect() {
    this.showSelectTokenDialog = true;
  }

  onTokenSelected(token) {
    this.asset = token;
  }

  back() {
    this.$emit('toUploadPage');
  }

  onRouteAssets() {
    this.showAuthorizeRoutingDialog = true;
  }

  authorize() {
    this.runAssetsRouting(this.asset);
    // this.processed = true;
    this.showAuthorizeRoutingDialog = false;
  }

  get summaryTableData() {
    return Object.values(
      groupBy(
        this.recipients.map((item) => ({ symbol: item.asset.symbol, ...item })),
        'symbol'
      )
    ).map((assetArray: any) => {
      return {
        asset: assetArray[0].asset,
        usd: sumBy(assetArray, (item: any) => Number(item.usd)),
        total: sumBy(assetArray, (item: any) => Number(item.amount)),
        required: sumBy(assetArray, (item: any) => Number(item.usd)) / Number(this.getAssetUSDPrice(this.asset)),
        totalTransactions: assetArray.length,
        successedTransactions: assetArray.length,
      };
    });
  }

  get totalAssetRequiredString() {
    return this.totalAssetRequired.toFixed(2);
  }

  get totalAssetRequired() {
    const sum = sumBy(this.summaryTableData, (item) => item.required);
    return sum * 1.05;
  }

  get totalUsd() {
    return this.recipients?.reduce((partialSum, a) => partialSum + Number(a.usd), 0);
  }

  get summaryData() {
    return {
      tableData: this.summaryTableData,
      totalAssetRequired: this.totalAssetRequiredString,
      totalUsd: this.totalUsd,
    };
  }

  getAssetUSDPrice(asset) {
    return FPNumber.fromCodecValue(this.fiatPriceAndApyObject[asset.address]?.price, 18).toFixed(2);
  }

  get xor() {
    return XOR;
  }
}
</script>

<style lang="scss">
.route-assets-routing-template {
  max-width: 988px;
  margin: 0 auto 16px;
  .container {
    max-width: none;
  }
}
</style>
