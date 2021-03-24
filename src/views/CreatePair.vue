<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header has-button-back :title="t('createPair.title')" :tooltip="t('pool.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">{{ t('createPair.deposit') }}</div>
          <div v-if="connected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="(firstToken && {}).decimals"
              :disabled="!areTokensSelected"
              :value="firstTokenValue"
              @input="handleTokenChange($event, setFirstTokenValue)"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="isAvailable && isFirstMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
              {{ t('buttons.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-16" />
      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="connected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="(secondToken && {}).decimals"
              :disabled="!areTokensSelected"
              :value="secondTokenValue"
              @input="handleTokenChange($event, setSecondTokenValue)"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="isAvailable && isSecondMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
              {{ t('buttons.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectSecondTokenDialog">
            {{ t('buttons.chooseToken') }}
          </s-button>
        </div>
      </div>
      <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
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
        <p class="p2">{{ t('createPair.firstLiquidityProvider') }}</p>
        <info-line>
          <template #info-line-prefix>
            <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
          </template>
        </info-line>
      </div>
      <template v-else>
        <div class="info-line-container">
          <p class="p2">{{ t('createPair.pricePool') }}</p>
          <info-line :label="t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })" :value="price" />
          <info-line :label="t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })" :value="priceReversed" />
          <info-line :label="t('createPair.shareOfPool')" value="100%" />
          <info-line :label="t('createPair.networkFee')" :value="`${formattedFee} ${KnownSymbols.XOR}`" />
        </div>

        <div class="info-line-container">
          <p class="p2">{{ t('createPair.yourPositionEstimated') }}</p>
          <info-line
            :label="t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol })"
            :value="formattedMinted"
          >
            <template #info-line-prefix>
              <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
            </template>
          </info-line>
          <s-divider />
          <info-line :label="firstToken.symbol" :value="firstTokenValue" />
          <info-line :label="secondToken.symbol" :value="secondTokenValue" />
        </div>
      </template>
    </template>

    <select-token :visible.sync="showSelectFirstTokenDialog" :connected="connected" account-assets-only not-null-balance-only :asset="secondToken" @select="setFirstTokenAddress($event.address)" />
    <select-token :visible.sync="showSelectSecondTokenDialog" :connected="connected" :asset="firstToken" @select="setSecondTokenAddress($event.address)" />

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

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin'

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
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog)
  }
})

export default class CreatePair extends Mixins(TokenPairMixin) {
  @Action('createPair', { namespace }) createPair

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
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
