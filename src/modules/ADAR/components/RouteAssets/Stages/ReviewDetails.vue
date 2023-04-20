<template>
  <div class="route-assets-review-details">
    <div class="container route-assets-upload-template">
      <div class="route-assets__page-header-title">Review Routing Details</div>
      <div class="route-assets__page-header-description">
        {{ `Review the details of your routing transaction` }}
      </div>
      <div class="fields-container">
        <div class="field">
          <div class="field__label">INPUT ASSET</div>
          <div
            class="field__value pointer"
            @click="
              () => {
                showSelectInputAssetDialog = true;
              }
            "
          >
            <div>{{ inputToken.symbol }}</div>
            <div>
              <token-logo class="token-logo" :token="inputToken" />
            </div>
            <div>
              <s-icon name="arrows-chevron-down-rounded-24" size="20" />
            </div>
          </div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">total usd to be routed</div>
          <div class="field__value usd">{{ usdToBeRouted }}</div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">ESTImated ADAR fee ({{ adarFeePercent }}%)</div>
          <div class="field__value">
            {{ formatNumber(adarFee) }} <token-logo class="token-logo" :token="inputToken" />
          </div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">ESTImated Network fee (5%)</div>
          <div class="field__value">
            {{ formatNumber(estimatedNetworkFee) }} <token-logo class="token-logo" :token="inputToken" />
          </div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">Total tokens required</div>
          <div class="field__value">
            {{ formatNumber(estimatedAmountWithFees) }} <token-logo class="token-logo" :token="inputToken" />
          </div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">Total Tokens available</div>
          <div class="field__value">
            {{ totalTokensAvailable }} <token-logo class="token-logo" :token="inputToken" />
          </div>
          <warning-message
            class="warning-message"
            :text="noIssues ? 'balance is ok' : 'insufficient funds'"
            :isError="!noIssues"
          />
        </div>
        <template v-if="!noIssues">
          <s-divider />
          <div class="field">
            <div class="field__label">remaining AMOUNT required</div>
            <div class="field__value">
              <s-button
                type="primary"
                class="s-typography-button--mini add-button"
                @click.stop="onAddFundsClick('routing')"
              >
                {{ 'Add' }}
              </s-button>
              {{ formatNumber(remainingAmountRequired) }}
              <token-logo class="token-logo" :token="inputToken" />
            </div>
          </div>
        </template>
        <template v-if="showXorRequiredField">
          <s-divider />
          <div class="field">
            <div class="field__label">XOR fee required</div>
            <div class="field__value">
              <s-button
                type="primary"
                class="s-typography-button--mini add-button"
                @click.stop="onAddFundsClick('fee')"
              >
                {{ 'Add' }}
              </s-button>
              {{ formatNumber(xorFeeRequired) }}
              <token-logo class="token-logo" :token="xor" />
            </div>
          </div>
        </template>
        <s-divider v-if="!noIssues" />
        <div class="buttons-container">
          <s-button type="primary" class="s-typography-button--big" :disabled="!noIssues" @click.stop="onContinueClick">
            {{ 'Continue' }}
          </s-button>
          <s-button type="secondary" class="s-typography-button--big" @click.stop="cancelButtonAction">
            {{ `CANCEL PROCESSING` }}
          </s-button>
        </div>
      </div>
    </div>
    <div class="container routing-details-section">
      <div class="route-assets__page-header-title">Routing Details</div>
      <div v-for="(assetData, idx) in summaryData" :key="idx" class="asset-data-container fields-container">
        <div class="asset-title">
          <div>
            <token-logo class="token-logo" :token="assetData.asset" />
          </div>
          <div>{{ assetData.asset.symbol }}</div>
        </div>
        <div class="field">
          <div class="field__label">recepients</div>
          <div class="field__value">{{ assetData.recipientsNumber }}</div>
        </div>
        <s-divider />
        <div class="field">
          <div class="field__label">token AMOUNT required</div>
          <div class="field__value">{{ formatNumberJs(assetData.total) }}</div>
          <div class="field__value usd">{{ formatNumberJs(assetData.usd) }}</div>
        </div>
      </div>
    </div>
    <swap-dialog :visible.sync="showSwapDialog" :presetSwapData="swapData"></swap-dialog>
    <select-input-asset-dialog
      :visible.sync="showSelectInputAssetDialog"
      @onInputAssetSelected="onInputAssetSelected"
    ></select-input-asset-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { AdarComponents, adarFee, slippageMultiplier } from '@/modules/ADAR/consts';
import { adarLazyComponent } from '@/modules/ADAR/router';
import { action, getter, state } from '@/store/decorators';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { groupBy, sumBy } from 'lodash';
import type { PresetSwapData, Recipient } from '@/store/routeAssets/types';
import { CodecString, FPNumber, NetworkFeesObject, Operation } from '@sora-substrate/util/build';
import { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import { getAssetBalance } from '@/utils';
import WarningMessage from '../WarningMessage.vue';
import { XOR, VAL } from '@sora-substrate/util/build/assets/consts';
import { ZeroStringValue } from '@/consts';
@Component({
  components: {
    TokenLogo: components.TokenLogo,
    SwapDialog: adarLazyComponent(AdarComponents.RouteAssetsSwapDialog),
    WarningMessage,
    SelectInputAssetDialog: adarLazyComponent(AdarComponents.RouteAssetsSelectInputAssetDialog),
  },
})
export default class ReviewDetails extends Mixins(mixins.TransactionMixin) {
  @getter.routeAssets.inputToken inputToken!: Asset;
  @action.routeAssets.processingNextStage nextStage!: () => void;
  @getter.routeAssets.recipients private recipients!: Array<Recipient>;
  @state.wallet.account.fiatPriceObject private fiatPriceObject!: any;
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @action.routeAssets.setInputToken setInputToken!: (asset: Asset) => void;
  @action.routeAssets.cancelProcessing private cancelProcessing!: () => void;
  @action.routeAssets.runAssetsRouting private runAssetsRouting!: any;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor xor!: Nullable<AccountAsset>;

  showSwapDialog = false;
  showSelectInputAssetDialog = false;

  onInputAssetSelected(asset) {
    this.setInputToken(asset);
    this.showSelectInputAssetDialog = false;
  }

  get noIssues() {
    return this.remainingAmountRequired.toNumber() <= 0;
  }

  get usdToBeRouted() {
    return this.formatNumber(new FPNumber(this.recipients?.reduce((partialSum, a) => partialSum + Number(a.usd), 0)));
  }

  get estimatedAmount() {
    const sum = sumBy(this.summaryData, (item) => item.required);
    const isInputAssetXor = this.inputToken?.symbol === XOR.symbol;
    return isInputAssetXor ? new FPNumber(sum).add(this.xorFeeAmount) : new FPNumber(sum);
  }

  get adarFeeMultiplier() {
    return new FPNumber(adarFee);
  }

  get adarFeePercent() {
    return this.adarFeeMultiplier.mul(FPNumber.HUNDRED).toString();
  }

  get networkFeeMultiplier() {
    return new FPNumber(slippageMultiplier);
  }

  get adarFee() {
    return this.estimatedAmount.add(this.estimatedNetworkFee).mul(this.adarFeeMultiplier);
  }

  get estimatedNetworkFee() {
    return this.estimatedAmount.mul(this.networkFeeMultiplier);
  }

  get estimatedAmountWithFees() {
    return this.estimatedAmount.add(this.adarFee).add(this.estimatedNetworkFee);
  }

  get totalTokensAvailable() {
    return this.formattedBalance;
  }

  get xorNetworkFee() {
    return FPNumber.fromCodecValue(this.networkFees[Operation.SwapAndSend]).toNumber();
  }

  get remainingAmountRequired() {
    const isInputAssetXor = this.inputToken?.symbol === XOR.symbol;
    return isInputAssetXor
      ? this.estimatedAmountWithFees.add(this.xorFeeAmount).sub(this.fpBalance)
      : this.estimatedAmountWithFees.sub(this.fpBalance);
  }

  get xorFeeAmount() {
    return this.summaryData.reduce((sum, item) => {
      const isTransfer = item.asset.address === this.inputToken.address;
      const fee = isTransfer ? this.networkFees[Operation.Transfer] : this.networkFees[Operation.SwapAndSend];
      return sum.add(FPNumber.fromCodecValue(fee));
    }, FPNumber.ZERO);
  }

  get xorFeeRequired() {
    return this.xorFeeAmount.mul(new FPNumber(1.05)).sub(this.xorBalance);
  }

  get showXorRequiredField() {
    return this.xorFeeAmount > this.xorBalance && this.inputToken.address !== XOR.address;
  }

  get xorBalance() {
    const xorBalance = this.xor?.balance;
    return this.getFPNumberFromCodec(xorBalance?.transferable ?? ZeroStringValue, this.xor?.decimals);
  }

  get summaryData() {
    return Object.values(
      groupBy(
        this.recipients.map((item) => ({ symbol: item.asset.symbol, ...item })),
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
      };
    });
  }

  action: 'fee' | 'routing' = 'fee';

  get routingSwapData(): PresetSwapData {
    const isInputAssetXor = this.inputToken?.symbol === XOR?.symbol;
    const assetFrom = isInputAssetXor ? VAL : XOR;
    const assetTo = this.inputToken;
    const valueTo = this.remainingAmountRequired.toNumber();
    return {
      assetFrom,
      assetTo,
      valueTo,
    };
  }

  get xorFeeSwapData(): PresetSwapData {
    const assetFrom = VAL;
    const assetTo = XOR;
    const valueTo = this.xorFeeRequired.toNumber();
    return {
      assetFrom,
      assetTo,
      valueTo,
    };
  }

  get swapData(): PresetSwapData {
    return this.action === 'fee' ? this.xorFeeSwapData : this.routingSwapData;
  }

  onAddFundsClick(action: 'fee' | 'routing') {
    this.action = action;
    this.showSwapDialog = true;
  }

  get fpBalance(): FPNumber {
    if (!this.getTokenBalance) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(this.getTokenBalance, this.decimals);
  }

  get decimals(): number {
    return this.inputToken?.decimals ?? FPNumber.DEFAULT_PRECISION;
  }

  get formattedBalance(): string {
    return this.fpBalance.toNumber().toLocaleString('en-US', {
      maximumFractionDigits: 6,
    });
  }

  getAssetUSDPrice(asset: Asset) {
    return FPNumber.fromCodecValue(this.fiatPriceObject[asset.address] ?? 0, asset.decimals);
  }

  get getTokenBalance(): CodecString {
    const asset = this.accountAssets.find((item) => item.address === this.inputToken.address);
    return getAssetBalance(asset);
  }

  formatNumberJs(num) {
    return !num || !Number.isFinite(num)
      ? '-'
      : num.toLocaleString('en-US', {
          maximumFractionDigits: 4,
        });
  }

  formatNumber(num: FPNumber) {
    return !num || !num.isFinity()
      ? '-'
      : num.toNumber().toLocaleString('en-US', {
          maximumFractionDigits: 4,
        });
  }

  // onAddFundsClick() {
  //   this.showSwapDialog = true;
  // }

  cancelButtonAction() {
    this.cancelProcessing();
  }

  onContinueClick() {
    this.runAssetsRouting();
    this.nextStage();
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

.fields-container {
  .el-divider {
    margin-bottom: $inner-spacing-medium;
    margin-top: $inner-spacing-medium;
  }
}

.usd {
  color: var(--s-color-status-warning);
  &::before {
    content: '~ $';
    display: inline;
  }
}

.pointer {
  cursor: pointer;
}

.buttons-container {
  button {
    display: block;
    width: 100%;
    margin: 16px 0 0 0;
  }
}
</style>
