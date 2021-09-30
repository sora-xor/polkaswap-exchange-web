<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('createPair.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="firstTokenValue"
        :decimals="(firstToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((firstToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && firstToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-value--primary">{{ getTokenBalance(firstToken) }}</span>
            <formatted-amount v-if="firstTokenPrice" :value="getFiatBalance(firstToken)" is-fiat-value />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="isAvailable && isFirstMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue(firstToken, setFirstTokenValue)"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="firstToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="firstToken && firstTokenPrice" :value="fiatFirstAmount" is-fiat-value />
          <token-address
            v-if="firstToken"
            :name="firstToken.name"
            :symbol="firstToken.symbol"
            :address="firstToken.address"
            class="input-value"
          />
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="plus-16" />
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="secondTokenValue"
        :decimals="(secondToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((secondToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setSecondTokenValue)"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && secondToken" class="input-value">
            <span class="input-value--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-value--primary">{{ getTokenBalance(secondToken) }}</span>
            <formatted-amount v-if="secondTokenPrice" :value="getFiatBalance(secondToken)" is-fiat-value />
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button
            v-if="isAvailable && isSecondMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click="handleMaxValue(secondToken, setSecondTokenValue)"
          >
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button
            class="el-button--select-token"
            icon="chevron-down-rounded-16"
            :token="secondToken"
            @click="openSelectSecondTokenDialog"
          />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <formatted-amount v-if="secondToken && secondTokenPrice" :value="fiatSecondAmount" is-fiat-value />
          <token-address
            v-if="secondToken"
            :name="secondToken.name"
            :symbol="secondToken.symbol"
            :address="secondToken.address"
            class="input-value"
          />
        </div>
      </s-float-input>
      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable"
        @click="openConfirmDialog"
      >
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.alreadyCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
      <slippage-tolerance class="slippage-tolerance-settings" />
    </s-form>

    <template v-if="areTokensSelected && isAvailable">
      <div v-if="isEmptyBalance" class="info-line-container">
        <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
        <info-line>
          <template #info-line-prefix>
            <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
          </template>
        </info-line>
      </div>
      <template v-else>
        <div class="info-line-container">
          <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
          <info-line
            :label="t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })"
            :value="formattedPrice"
          />
          <info-line
            :label="t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })"
            :value="formattedPriceReversed"
          />
          <info-line
            :label="t('createPair.networkFee')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="formattedFee"
            :asset-symbol="KnownSymbols.XOR"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
          />
        </div>

        <div class="info-line-container">
          <p class="info-line-container__title">{{ t('createPair.yourPositionEstimated') }}</p>
          <info-line
            :label="firstToken.symbol"
            :value="formattedFirstTokenValue"
            :fiat-value="fiatFirstAmount"
            is-formatted
          />
          <info-line
            :label="secondToken.symbol"
            :value="formattedSecondTokenValue"
            :fiat-value="fiatSecondAmount"
            is-formatted
          />
          <info-line :label="t('createPair.shareOfPool')" value="100%" />
        </div>
      </template>
    </template>

    <select-token
      :visible.sync="showSelectSecondTokenDialog"
      :connected="isLoggedIn"
      :asset="firstToken"
      @select="setSecondTokenAddress($event.address)"
    />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :minted="formattedMinted"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageTolerance"
      @confirm="confirmCreatePair"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action } from 'vuex-class';
import { FPNumber, KnownAssets, KnownSymbols } from '@sora-substrate/util';
import { components } from '@soramitsu/soraneo-wallet-web';

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'createPair';
const TokenPairMixin = CreateTokenPairMixin(namespace);

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class CreatePair extends Mixins(TokenPairMixin) {
  @Action('createPair', { namespace }) createPair;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  get formattedFirstTokenValue(): string {
    return this.formatStringValue(this.firstTokenValue.toString());
  }

  get formattedSecondTokenValue(): string {
    return this.formatStringValue(this.secondTokenValue.toString());
  }

  async created(): Promise<void> {
    await this.withParentLoading(async () => {
      await this.setFirstTokenAddress(KnownAssets.get(KnownSymbols.XOR).address);
    });
  }

  confirmCreatePair(): Promise<void> {
    return this.handleConfirm(this.createPair);
  }
}
</script>

<style lang="scss" scoped>
.info-line--first-liquidity {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-mini);
}

.el-form--actions {
  @include generic-input-lines;
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
