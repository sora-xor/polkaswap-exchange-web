<template>
  <div class="route-assets-review-details">
    <div class="container route-assets-upload-template">
      <div class="route-assets__page-header-title">Routing completed</div>
      <div class="route-assets__page-header-description">
        {{ `View the details of your recent routing transaction` }}
      </div>
      <div class="fields-container">
        <div class="field">
          <div class="field__label">INPUT ASSET</div>
          <div class="field__value">
            <div>{{ inputToken.symbol }}</div>
            <div>
              <token-logo class="token-logo" :token="inputToken" />
            </div>
          </div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">total</div>
          <div class="field__value">
            {{ totalAmount }} <span class="usd">{{ totalUSD }}</span>
          </div>
        </div>
        <s-divider />
        <div class="field" v-if="incompletedRecipientsLength > 0">
          <div class="field__label">FAILED TRANSACTIONS</div>
          <warning-message class="warning-message" :text="'re-run failed transactions'" :isError="true" />
          <div class="field__value">
            {{ incompletedRecipientsLength }}
          </div>
        </div>
      </div>
      <div class="buttons-container">
        <s-button
          type="primary"
          class="s-typography-button--big"
          @click.stop="showFailedTransactionsDialog = true"
          v-if="withErrors"
        >
          {{ 'RE-RUN FAILED TRANSACTIONS' }}
        </s-button>
        <s-button type="secondary" class="s-typography-button--big" @click.stop="downloadPDF">
          {{ 'DOWNLOAD PDF OVERVIEW' }}
        </s-button>
        <s-button
          type="link"
          class="s-typography-button--big open-finish-routing-button"
          @click.stop="openFinishRoutingDialog"
          v-if="withErrors"
        >
          <span>{{ `Re-run doesn’t help? Finish routing anyway` }}</span>
        </s-button>
        <s-button v-else type="primary" class="s-typography-button--big" @click.stop="onFinishRouting">
          {{ 'FINISH' }}
        </s-button>
      </div>
    </div>
    <div v-if="summaryData.length > 0" class="container routing-details-section">
      <div class="route-assets__page-header-title">Routing Details</div>
      <div v-for="(assetData, idx) in summaryData" :key="idx" class="asset-data-container fields-container">
        <div class="asset-title">
          <div>
            <token-logo class="token-logo" :token="assetData.asset" />
          </div>
          <div>{{ assetData.asset.symbol }}</div>
        </div>
        <div class="field">
          <div class="field__label">recipients</div>
          <div class="field__value">{{ assetData.recipientsNumber }}</div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">token AMOUNT routed</div>
          <div class="field__value">{{ formatNumber(assetData.total) }}</div>
          <div class="field__value usd">{{ formatNumber(assetData.usd) }}</div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">Status</div>
          <div class="field__value" :class="`field__value_${assetData.status}`">{{ assetData.status }}</div>
        </div>
      </div>
    </div>
    <failed-transactions-dialog :visible.sync="showFailedTransactionsDialog"></failed-transactions-dialog>
    <confirm-finish-routing-dialog
      :visible.sync="showFinishRoutingDialog"
      @onConfirmClick="onFinishRouting"
    ></confirm-finish-routing-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { AdarComponents } from '@/modules/ADAR/consts';
import { lazyComponent } from '@/router';
import { adarLazyComponent } from '@/modules/ADAR/router';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, state } from '@/store/decorators';
import { components, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { groupBy, sumBy } from 'lodash';
import { Recipient, RecipientStatus } from '@/store/routeAssets/types';
import { FPNumber } from '@sora-substrate/util/build';
import { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import WarningMessage from '../WarningMessage.vue';
import { jsPDF as JsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  components: {
    TokenLogo: components.TokenLogo,
    WarningMessage,
    FailedTransactionsDialog: adarLazyComponent(AdarComponents.RouteAssetsFailedTransactionsDialog),
    ConfirmFinishRoutingDialog: adarLazyComponent(AdarComponents.RouteAssetsConfirmFinishRoutingDialog),
  },
})
export default class RoutingCompleted extends Mixins(TranslationMixin) {
  @getter.routeAssets.inputToken inputToken!: Asset;
  @getter.routeAssets.completedRecipients private completedRecipients!: Array<Recipient>;
  @getter.routeAssets.incompletedRecipients private incompletedRecipients!: Array<Recipient>;
  @getter.routeAssets.recipients private recipients!: Array<Recipient>;
  @state.wallet.account.fiatPriceObject private fiatPriceObject!: any;
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @action.routeAssets.cancelProcessing private cancelProcessing!: () => void;

  showFailedTransactionsDialog = false;
  showFinishRoutingDialog = false;

  get incompletedRecipientsLength() {
    return this.incompletedRecipients.length;
  }

  get totalAmount() {
    return this.formatNumber(this.totalUSD / Number(this.getAssetUSDPrice(this.inputToken)));
  }

  get totalUSD() {
    return sumBy(this.completedRecipients, (item: Recipient) => Number(item.usd));
  }

  get withErrors() {
    return this.incompletedRecipientsLength > 0;
  }

  get summaryData() {
    return Object.values(
      groupBy(
        this.completedRecipients.map((item) => ({ symbol: item.asset.symbol, ...item })),
        'symbol'
      )
    ).map((assetArray: Array<Recipient>) => {
      return {
        recipientsNumber: assetArray.length,
        asset: assetArray[0].asset,
        usd: sumBy(assetArray, (item: Recipient) => Number(item.usd)),
        total: sumBy(assetArray, (item: Recipient) => Number(item.amount)),
        required:
          sumBy(assetArray, (item: Recipient) => Number(item.usd)) / Number(this.getAssetUSDPrice(this.inputToken)),
        totalTransactions: assetArray.length,
        status: this.getStatus(assetArray),
      };
    });
  }

  getStatus(assetArray) {
    if (assetArray.some((recipient) => recipient.status === RecipientStatus.FAILED)) return 'failed';
    return assetArray.find((recipient) => recipient.status === RecipientStatus.PENDING) ? 'waiting' : 'routed';
  }

  getAssetUSDPrice(asset: Asset) {
    return FPNumber.fromCodecValue(this.fiatPriceObject[asset.address] ?? 0, 18);
  }

  formatNumber(num) {
    return !num || !Number.isFinite(num)
      ? '-'
      : num.toLocaleString('en-US', {
          maximumFractionDigits: 4,
        });
  }

  openFinishRoutingDialog() {
    this.showFinishRoutingDialog = true;
  }

  onFinishRouting() {
    this.cancelProcessing();
    this.showFinishRoutingDialog = false;
  }

  downloadPDF() {
    const doc = new JsPDF({ putOnlyUsedFonts: true, orientation: 'landscape' });
    const headers = ['№', 'Name', 'Wallet', 'USD', 'Input Token', 'Token', 'Amount', 'Status'];
    const data = this.recipients.map((recipient, idx) => {
      return [
        `${idx + 1}`,
        recipient.name.toString(),
        recipient.wallet.toString(),
        recipient.usd.toString(),
        this.inputToken.symbol,
        recipient.asset.symbol,
        (recipient.amount?.toFixed(5) || '').toString(),
        recipient.status.toString(),
      ];
    });
    autoTable(doc, {
      head: [headers],
      body: data,
    });
    doc.save(`ADAR-${new Date().toLocaleDateString('en-GB')}.pdf`);
  }
}
</script>

<style lang="scss">
.route-assets-review-details {
  width: 464px;
  text-align: center;
  font-weight: 300;
  font-feature-settings: 'case' on;
  margin: 0 auto;

  &__button {
    width: 100%;
    padding: inherit 30px;
  }

  .token-logo {
    > span {
      width: 16px;
      height: 16px;
    }
  }

  .routing-details-section {
    text-align: left;

    & > * {
      margin-bottom: $inner-spacing-medium;
    }

    .asset-title {
      @include flex-start;
      gap: 8px;
      font-weight: 700;
      font-size: 24px;
      line-height: 20px;
      margin-bottom: $inner-spacing-medium;

      .token-logo {
        > span {
          width: 36px;
          height: 36px;
        }
      }
    }

    .asset-data-container {
      box-shadow: var(--s-shadow-element);
      border-radius: 30px;
      background: var(--s-color-utility-body);
      padding: 16px;
    }
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}

.usd {
  color: var(--s-color-status-warning);
  &::before {
    content: '~ $';
    display: inline;
  }
}

.buttons-container {
  button {
    display: block;
    width: 100%;
    margin: 16px 0 0 0;
  }
}

.open-finish-routing-button {
  font-weight: 400;
  font-size: 14px;
  text-decoration: underline;
  color: var(--s-color-base-content-secondary);
  text-transform: none;
}
</style>
