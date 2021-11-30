<template>
  <component :is="infoOnly ? 'div' : 'transaction-details'">
    <div class="swap-info-container">
      <info-line v-for="{ id, label, value } in priceValues" :key="id" :label="label" :value="value" />
      <info-line
        :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
        :label-tooltip="t('swap.minReceivedTooltip')"
        :value="formattedMinMaxReceived"
        :asset-symbol="getAssetSymbolText"
        :fiat-value="getFiatAmountByCodecString(minMaxReceived, isExchangeB ? tokenFrom : tokenTo)"
        is-formatted
      />
      <info-line v-for="(reward, index) in rewardsValues" :key="index" v-bind="reward" />
      <info-line :label="t('swap.priceImpact')" :label-tooltip="t('swap.priceImpactTooltip')">
        <value-status-wrapper :value="priceImpact">
          <formatted-amount class="swap-value" :value="priceImpactFormatted">%</formatted-amount>
        </value-status-wrapper>
      </info-line>
      <info-line :label="t('swap.route')">
        <div v-for="token in swapRoute" class="liquidity-route swap-value" :key="token">
          <span>{{ token }}</span>
          <s-icon name="el-icon el-icon-arrow-right route-icon" />
        </div>
      </info-line>
      <info-line
        :label="t('swap.liquidityProviderFee')"
        :label-tooltip="liquidityProviderFeeTooltipText"
        :value="formattedLiquidityProviderFee"
        :asset-symbol="xorSymbol"
        is-formatted
      />
      <info-line
        v-if="isLoggedIn"
        :label="t('swap.networkFee')"
        :label-tooltip="t('swap.networkFeeTooltip')"
        :value="formattedNetworkFee"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
    </div>
  </component>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import {
  KnownAssets,
  KnownSymbols,
  CodecString,
  AccountAsset,
  LPRewardsInfo,
  Operation,
  NetworkFeesObject,
} from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'swap';

@Component({
  components: {
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class SwapTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @State((state) => state[namespace].liquidityProviderFee) liquidityProviderFee!: CodecString;
  @State((state) => state[namespace].isExchangeB) isExchangeB!: boolean;
  @State((state) => state[namespace].rewards) rewards!: Array<LPRewardsInfo>;

  @Getter isLoggedIn!: boolean;
  @Getter networkFees!: NetworkFeesObject;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString;
  @Getter('priceImpact', { namespace }) priceImpact!: string;
  @Getter('price', { namespace }) price!: string;
  @Getter('priceReversed', { namespace }) priceReversed!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get liquidityProviderFeeTooltipText(): string {
    return this.t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: this.liquidityProviderFeeValue });
  }

  get swapRoute(): Array<string> {
    const fromToken: string = this.tokenFrom?.symbol ?? '';
    const toToken: string = this.tokenTo?.symbol ?? '';
    const xorToken: string = KnownSymbols.XOR;

    return [...new Set([fromToken, xorToken, toToken])];
  }

  get priceValues(): Array<object> {
    const fromSymbol = this.tokenFrom?.symbol ?? '';
    const toSymbol = this.tokenTo?.symbol ?? '';

    return [
      {
        id: 'from',
        label: this.t('swap.firstPerSecond', { first: fromSymbol, second: toSymbol }),
        value: this.formatStringValue(this.price),
      },
      {
        id: 'to',
        label: this.t('swap.firstPerSecond', { first: toSymbol, second: fromSymbol }),
        value: this.formatStringValue(this.priceReversed),
      },
    ];
  }

  get priceImpactFormatted(): string {
    return this.formatStringValue(this.priceImpact);
  }

  get rewardsValues(): Array<any> {
    return this.rewards.map((reward, index) => {
      const asset = KnownAssets.get(reward.currency);
      const value = this.formatCodecNumber(reward.amount);

      return {
        value,
        fiatValue: this.getFiatAmountByString(value, asset as AccountAsset),
        assetSymbol: asset?.symbol ?? '',
        label: index === 0 ? this.t('swap.rewardsForSwap') : '',
      };
    });
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Swap];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get liquidityProviderFeeValue(): string {
    return this.formatStringValue('0.3');
  }

  get formattedLiquidityProviderFee(): string {
    return this.formatCodecNumber(this.liquidityProviderFee);
  }

  get formattedMinMaxReceived(): string {
    const decimals = (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.decimals;
    return this.formatCodecNumber(this.minMaxReceived, decimals);
  }

  get xorSymbol(): string {
    return ' ' + KnownSymbols.XOR;
  }

  get getAssetSymbolText(): string {
    return (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.symbol ?? '';
  }
}
</script>

<style lang="scss">
@include info-line;
.swap-info {
  &-value.el-button {
    margin-right: 0;
    height: var(--s-font-size-small);
    padding: 0;
    color: inherit;
  }
}
.swap-value {
  font-weight: 600;
}

.route-icon {
  color: var(--s-color-base-content-primary) !important;
  font-size: 13px !important;
  margin: 0 !important;
}

.liquidity-route:last-child .el-icon {
  display: none !important;
}
</style>
