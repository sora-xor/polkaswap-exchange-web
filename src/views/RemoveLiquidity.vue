<template>
  <div class="container">
    <generic-header :title="t('removeLiquidity.title')" :tooltip="t('removeLiquidity.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <info-card class="slider-container" :title="t('removeLiquidity.amount')">
        <div class="slider-container__amount">
          {{ removePart }}<span class="percent">%</span>
        </div>
        <div>
          <s-slider :value="removePart" @change="setRemovePart" />
        </div>
      </info-card>
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.input') }}</div>
          <div v-if="isWalletConnected && liquidity" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(liquidity) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="removeLiquidityAmount"
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div class="token">
            <s-button v-if="isWalletConnected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleLiquidityMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <div class="liquidity-logo">
                <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="mini" />
              </div>
              {{ firstToken.symbol }}-{{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="arrow-bottom" size="medium" />

      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.output') }}</div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="firstTokenRemoveAmount"
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
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
            <span>{{ t('removeLiquidity.output') }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="secondTokenRemoveAmount"
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-button type="primary" border-radius="small" :disabled="isEmptyAmount" @click="showConfirmDialog = true">
        <template v-if="isEmptyAmount">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>
    </s-form>

    <s-row flex justify="space-between" class="price-container">
      <div>{{ t('removeLiquidity.price') }}</div>
      <div>
        <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price, 2) }} {{ secondToken.symbol }}</div>
        <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price, 2) }} {{ firstToken.symbol }}</div>
      </div>
    </s-row>

    <confirm-remove-liquidity :visible.sync="showConfirmDialog" @confirm="handleConfirmRemoveLiquidity" />
    <result-dialog :visible.sync="isRemoveLiquidityConfirmed" :type="t('removeLiquidity.remove')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import TokenLogo from '@/components/TokenLogo.vue'

import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { formatNumber } from '@/utils'
import { Token } from '@/types'
const namespace = 'removeLiquidity'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})
export default class RemoveLiquidity extends Mixins(TranslationMixin) {
  @Getter('liquidity', { namespace }) liquidity!: any
  @Getter('removePart', { namespace }) removePart!: any
  @Getter('removeAmount', { namespace }) removeAmount!: any
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenRemoveAmount', { namespace }) firstTokenRemoveAmount!: any
  @Getter('secondTokenRemoveAmount', { namespace }) secondTokenRemoveAmount!: any

  @Getter tokens!: Array<Token>

  @Action('getLiquidity', { namespace }) getLiquidity
  @Action('setRemovePart', { namespace }) setRemovePart
  @Action getTokens

  async created () {
    await this.getTokens()
    await this.getLiquidity(this.liquidityId)
  }

  isWalletConnected = true
  inputPlaceholder: string = formatNumber(0, 2);
  showConfirmDialog = false
  isRemoveLiquidityConfirmed = false

  formatNumber = formatNumber

  get liquidityId (): string {
    return this.$route.params.id
  }

  get firstPerSecondPrice (): string {
    return formatNumber(this.firstToken.price / this.secondToken.price, 2)
  }

  get secondPerFirstPrice (): string {
    return formatNumber(this.secondToken.price / this.firstToken.price, 2)
  }

  get areTokensSelected (): boolean {
    return !!this.firstToken && !!this.secondToken
  }

  get removeLiquidityAmount (): string {
    return formatNumber(this.removeAmount, 2)
  }

  get isEmptyAmount (): boolean {
    return this.removePart === 0
  }

  get resultMessage (): string {
    return this.t('createPair.transactionMessage', {
      firstToken: this.getTokenValue(this.firstToken, this.firstTokenRemoveAmount),
      secondToken: this.getTokenValue(this.secondToken, this.secondTokenRemoveAmount)
    })
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  getTokenBalance (token: any): string {
    return token ? formatNumber(token.balance, 2) : ''
  }

  handleLiquidityMaxValue (): void {
    this.setRemovePart(100)
  }

  handleConfirmRemoveLiquidity (): void {
    this.showConfirmDialog = false
    this.isRemoveLiquidityConfirmed = true
  }
}
</script>

<style lang="scss" scoped>
.container {
  @include container-styles;
}

.el-form--actions {
  .slider-container {
    width: 100%;

    &__amount {
      font-size: var(--s-heading1-font-size);
      line-height: $s-line-height-mini;
      letter-spacing: $s-letter-spacing-mini;
    }
    .percent {
      color: var(--s-color-base-content-secondary)
    }
  }
  @include input-form-styles;
  @include buttons(true);
  @include full-width-button;
}

.price-container {
  margin: $inner-spacing-medium $inner-spacing-medium 0;
  line-height: $s-line-height-big;
  color: var(--s-color-base-content-secondary)
}

@include vertical-divider;
</style>
