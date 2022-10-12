<template>
  <transaction-details :info-only="infoOnly">
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
  </transaction-details>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR, XSTUSD, KnownAssets } from '@sora-substrate/util/build/assets/consts';
import { DexId } from '@sora-substrate/util/build/poolXyk/consts';
import type { LPRewardsInfo } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter, state } from '@/store/decorators';

type PriceValue = {
  id: 'from' | 'to';
  label: string;
  value: string;
};

type RewardValue = {
  value: string;
  fiatValue: Nullable<string>;
  assetSymbol: string;
  label: string;
};

@Component({
  components: {
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class SwapTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.swap.liquidityProviderFee private liquidityProviderFee!: CodecString;
  @state.swap.rewards private rewards!: Array<LPRewardsInfo>;
  @state.swap.isExchangeB isExchangeB!: boolean;
  @state.swap.selectedDexId private selectedDexId!: DexId;

  @getter.swap.price private price!: string;
  @getter.swap.priceReversed private priceReversed!: string;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;
  @getter.swap.minMaxReceived minMaxReceived!: CodecString;
  @getter.swap.priceImpact priceImpact!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get liquidityProviderFeeTooltipText(): string {
    return this.t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: this.liquidityProviderFeeValue });
  }

  get swapRoute(): Array<string> {
    const fromToken: string = this.tokenFrom?.symbol ?? '';
    const toToken: string = this.tokenTo?.symbol ?? '';
    const baseToken = this.selectedDexId === DexId.XOR ? XOR.symbol : XSTUSD.symbol;

    return [...new Set([fromToken, baseToken, toToken])]; // To remove doubled XOR if the route is simple
  }

  get priceValues(): Array<PriceValue> {
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

  get rewardsValues(): Array<RewardValue> {
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
    return ' ' + XOR.symbol;
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
  font-size: 12px !important;
  margin: 0 !important;
}

.liquidity-route:last-child .el-icon {
  display: none !important;
}
</style>
