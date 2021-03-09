<template>
  <div class="container" v-loading="parentLoading">
    <generic-header :title="t('createPair.title')" :tooltip="t('pool.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('createPair.deposit') }}</div>
          <div v-if="connected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="firstToken && firstToken.decimals"
              :disabled="!areTokensSelected"
              :value="firstTokenValue"
              @input="handleTokenChange($event, setFirstTokenValue)"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="isAvailable && isFirstMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-rounded" size="medium" />
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="connected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="secondToken && secondToken.decimals"
              :disabled="!areTokensSelected"
              :value="secondTokenValue"
              @input="handleTokenChange($event, setSecondTokenValue)"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="isAvailable && isSecondMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
            {{ t('exchange.chooseToken') }}
          </s-button>
        </div>
      </div>
      <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
        <template v-if="!areTokensSelected">
          {{ t('exchange.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.alreadyCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('exchange.enterAmount') }}
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
      <template v-if="isEmptyBalance">
        <info-card class="card--first-liquidity" :title="t('createPair.firstLiquidityProvider')">
          <div class="card__data">
            <p v-html="t('createPair.firstLiquidityProviderInfo')" />
          </div>
        </info-card>
      </template>
      <template v-else>
        <info-card :title="t('createPair.pricePool')">
          <div class="card__data">
            <div>
              {{
                t('createPair.firstPerSecond', {
                  first: firstToken.symbol,
                  second: secondToken.symbol
                })
              }}
            </div>
            <div>{{ price }} {{ firstToken.symbol }}</div>
          </div>
          <div class="card__data">
            <div>
              {{
                t('createPair.firstPerSecond', {
                  first: secondToken.symbol,
                  second: firstToken.symbol
                })
              }}
            </div>
            <div>{{ priceReversed }} {{ secondToken.symbol }}</div>
          </div>
          <div class="card__data">
            <div>{{ t('createPair.shareOfPool') }}</div>
            <div>100%</div>
          </div>
          <div class="card__data">
            <div>{{ t('createPair.networkFee') }}</div>
            <div>{{ formattedFee }} {{ KnownSymbols.XOR }}</div>
          </div>
        </info-card>

        <info-card :title="t('createPair.yourPositionEstimated')">
          <div class="card__data card__data_assets">
            <s-row flex>
              <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
              {{
                t('createPair.firstSecondPoolTokens', {
                  first: firstToken.symbol,
                  second: secondToken.symbol
                })
              }}
            </s-row>
            <div>{{ formattedMinted }}</div>
          </div>
          <s-divider />
          <div class="card__data">
            <div>{{ firstToken.symbol }}</div>
            <div>{{ firstTokenValue }}</div>
          </div>
          <div class="card__data">
            <div>{{ secondToken.symbol }}</div>
            <div>{{ secondTokenValue }}</div>
          </div>
        </info-card>
      </template>
    </template>

    <select-token :visible.sync="showSelectFirstTokenDialog" account-assets-only not-null-balance-only :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" :asset="firstToken" @select="setSecondToken" />

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
    GenericHeader: lazyComponent(Components.GenericHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
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
.container {
  .card--first-liquidity {
    margin-top: $inner-spacing-medium;
    font-feature-settings: $s-font-feature-settings-common;
    .card__data {
      margin-top: $inner-spacing-mini / 2;
      font-size: var(--s-font-size-mini);
    }
  }
}

.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
