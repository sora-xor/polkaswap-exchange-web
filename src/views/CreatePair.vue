<template>
  <div v-loading="parentLoading || loading" class="container">
    <generic-page-header has-button-back :title="t('createPair.title')" :tooltip="t('pool.description')" @back="handleBack" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
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
          <div v-if="isLoggedIn && firstToken" class="input-title">
            <span class="input-title--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-title--uppercase input-title--primary">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isAvailable && isFirstMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="firstToken" />
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
          <div v-if="isLoggedIn && secondToken" class="input-title">
            <span class="input-title--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-title--uppercase input-title--primary">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isAvailable && isSecondMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="secondToken" @click="openSelectSecondTokenDialog" />
        </div>
      </s-float-input>
      <s-button type="primary" class="action-button s-typography-button--large" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
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
          <info-line :label="t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })" :value="formatStringValue(price)" />
          <info-line :label="t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })" :value="formatStringValue(priceReversed)" />
          <info-line :label="t('createPair.shareOfPool')" value="100%" />
          <info-line :label="t('createPair.networkFee')" :value="`${formattedFee} ${KnownSymbols.XOR}`" :tooltip-content="t('networkFeeTooltipText')" />
        </div>

        <div class="info-line-container">
          <p class="info-line-container__title">{{ t('createPair.yourPositionEstimated') }}</p>
          <info-line
            :label="t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol })"
            :value="formattedMinted"
          >
            <template #info-line-prefix>
              <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
            </template>
          </info-line>
          <info-line :label="firstToken.symbol" :value="formatStringValue(firstTokenValue)" />
          <info-line :label="secondToken.symbol" :value="formatStringValue(secondTokenValue)" />
        </div>
      </template>
    </template>

    <select-token :visible.sync="showSelectSecondTokenDialog" :connected="isLoggedIn" :asset="firstToken" @select="setSecondTokenAddress($event.address)" />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="loading"
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
import { Component, Mixins } from 'vue-property-decorator'
import { Action } from 'vuex-class'
import { FPNumber, KnownAssets, KnownSymbols } from '@sora-substrate/util'

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'createPair'

const TokenPairMixin = CreateTokenPairMixin(namespace)

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoLine: lazyComponent(Components.InfoLine),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton)
  }
})

export default class CreatePair extends Mixins(TokenPairMixin, NumberFormatterMixin) {
  @Action('createPair', { namespace }) createPair
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn

  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  async created (): Promise<void> {
    await this.withApi(async () => {
      await this.getAssets()
      await this.setFirstTokenAddress(KnownAssets.get(KnownSymbols.XOR).address)
    })
  }

  confirmCreatePair (): Promise<void> {
    return this.handleConfirm(this.createPair)
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
