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
      <transaction-overview @repeatTransaction="onRepeatTransaction"></transaction-overview>
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
import { mixins, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util/build';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state, action } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { groupBy, sumBy } from 'lodash';
import { Recipient, RecipientStatus } from '@/store/routeAssets/types';
import { Asset } from '@sora-substrate/util/build/assets/types';
import { AdarComponents } from '@/consts/adar';
@Component({
  components: {
    TemplateSummary: lazyComponent(AdarComponents.TemplateSummary),
    TransactionOverview: lazyComponent(AdarComponents.TransactionOverview),
    AuthorizeDialog: lazyComponent(AdarComponents.AuthorizeRoutingTemplateDialog),
    SelectToken: lazyComponent(Components.SelectToken),
  },
})
export default class RoutingTemplate extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @state.wallet.account.fiatPriceAndApyObject private fiatPriceAndApyObject!: SUBQUERY_TYPES.FiatPriceAndApyObject;

  @getter.routeAssets.recipients recipients!: Array<Recipient>;
  @getter.routeAssets.validRecipients validRecipients!: Array<Recipient>;
  @getter.routeAssets.isProcessed processed!: boolean;
  @action.routeAssets.runAssetsRouting runAssetsRouting!: (asset: Asset) => Promise<void>;
  @action.routeAssets.repeatTransaction private repeatTransaction!: ({ inputAsset, id }) => Promise<void>;
  @action.routeAssets.subscribeOnReserves private subscribeOnReserves!: (asset: Asset) => void;
  showAuthorizeRoutingDialog = false;
  showSelectTokenDialog = false;
  asset = this.xor;

  onTokenSelect() {
    this.showSelectTokenDialog = true;
  }

  onTokenSelected(token) {
    this.asset = token;
    this.subscribeOnReserves(token);
  }

  back() {
    this.$emit('toUploadPage');
  }

  onRouteAssets() {
    this.showAuthorizeRoutingDialog = true;
  }

  async authorize() {
    this.showAuthorizeRoutingDialog = false;
    try {
      await this.runAssetsRouting(this.asset);
      this.$notify({
        message: `${this.t('adar.routeAssets.routingTemplate.messages.routeAssetsCompleted')}`,
        type: 'success',
        title: '',
      });
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    }
  }

  async onRepeatTransaction(recipient: Recipient) {
    try {
      await this.repeatTransaction({ inputAsset: this.asset, id: recipient.id });
      this.$notify({
        message: `${this.t('adar.routeAssets.routingTemplate.messages.routeAssetsCompleted')}`,
        type: 'success',
        title: '',
      });
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    }
  }

  get summaryTableData() {
    return Object.values(
      groupBy(
        this.validRecipients.map((item) => ({ symbol: item.asset.symbol, ...item })),
        'symbol'
      )
    ).map((assetArray: Array<Recipient>) => {
      return {
        asset: assetArray[0].asset,
        usd: sumBy(assetArray, (item: Recipient) => Number(item.usd)),
        total: sumBy(assetArray, (item: Recipient) => Number(this.getTokenEquivalent(item))),
        required: sumBy(assetArray, (item: Recipient) => Number(item.usd)) / Number(this.getAssetUSDPrice(this.asset)),
        // required: sumBy(assetArray, (item: Recipient) => {
        //   const operation = item.asset.address === this.asset.address ? Operation.Transfer : Operation.SwapAndSend;
        //   return Number(item.usd) / Number(this.getAssetUSDPrice(this.asset)) + this.getNetworkFee(operation);
        // }),
        totalTransactions: assetArray.length,
        successedTransactions: assetArray.filter((item: Recipient) => item.status === RecipientStatus.SUCCESS).length,
      };
    });
  }

  getTokenEquivalent(recipient) {
    return (recipient.usd / Number(this.getAssetUSDPrice(recipient.asset))).toFixed(2);
  }

  // getNetworkFee(operation): number {
  //   return Number(this.formatCodecNumber(this.networkFees[operation]));
  // }

  get totalAssetRequiredString() {
    return this.totalAssetRequired.toFixed(2);
  }

  get totalAssetRequired() {
    const sum = sumBy(this.summaryTableData, (item) => item.required);
    return sum * 1.05;
  }

  get totalUsd() {
    return this.validRecipients?.reduce((partialSum, a) => partialSum + Number(a.usd), 0);
  }

  get summaryData() {
    return {
      tableData: this.summaryTableData,
      totalAssetRequired: this.totalAssetRequiredString,
      totalUsd: this.totalUsd,
      successedTransactions: sumBy(this.summaryTableData, (item) => item.successedTransactions),
    };
  }

  getAssetUSDPrice(asset: Asset) {
    return FPNumber.fromCodecValue(this.fiatPriceAndApyObject[asset.address]?.price ?? 0, 18).toFixed(2);
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
