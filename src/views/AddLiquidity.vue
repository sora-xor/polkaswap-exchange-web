<template>
  <div class="container">
    <div class="header">
      <s-button type="action" size="small" icon="arrow-left" @click="handleBack" />
      <h3 class="header-title">{{ t('addLiquidity.title') }}</h3>
      <s-tooltip class="header-tooltip" popperClass="info-tooltip" borderRadius="mini" :content="t('addLiquidity.description')" theme="light" placement="bottom-end" animation="none" :show-arrow="false">
        <s-icon name="info" size="16" />
      </s-tooltip>
    </div>
    <s-form
      v-model="formModel"
      class="el-form--add-liquidity"
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
            <s-input
              v-model="formModel.first"
              v-float="formModel.first"
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleChangeFirstField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" borderRadius="mini" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" borderRadius="medium" icon="chevron-bottom-rounded" @click="openSelectFirstTokenDialog">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" borderRadius="mini" icon="chevron-bottom-rounded" @click="openSelectFirstTokenDialog">
            {{ t('swap.chooseToken') }}
          </s-button>
        </div>
      </div>
      <s-icon class="plus" name="plus" size="medium" />
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
            <s-input
              v-model="formModel.second"
              v-float="formModel.second"
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleChangeSecondField"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" borderRadius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" borderRadius="medium" icon="chevron-bottom-rounded" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" borderRadius="mini" icon="chevron-bottom-rounded" @click="openSelectSecondTokenDialog">
            {{t('swap.chooseToken')}}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="showConfirmDialog = true">
        <template v-if="!areTokensSelected">
          {{ t('swap.chooseTokens') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('swap.insufficientBalance', { tokenSymbol: firstToken.symbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
    </s-form>

    <info-card v-if="areTokensSelected" :title="t('createPair.pricePool')">
      <div class="card__data">
        <div>{{ t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol }) }}</div>
        <div>{{ firstPerSecondPrice }} {{ firstToken.symbol }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol }) }}</div>
        <div>{{ secondPerFirstPrice }} {{ secondToken.symbol }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}</div>
      </div>
    </info-card>

    <info-card v-if="areTokensSelected" :title="t('createPair.yourPosition') ">
      <div class="card__data">
        <s-row flex>
          <pair-token-logo class="pair-token-logo" :firstToken="firstToken" :secondToken="secondToken" size="mini" />
          {{ t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol }) }}:
        </s-row>
        <div>{{ poolTokens }}</div>
      </div>
      <s-divider />
      <div class="card__data">
        <div>{{ firstToken.symbol }}</div>
        <div>{{ firstTokenPosition }}</div>
      </div>
      <div class="card__data">
        <div>{{ secondToken.symbol }}</div>
        <div>{{ secondTokenPosition }}</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" @select="setSecondToken" />

    <confirm-add-liquidity :visible.sync="showConfirmDialog" @confirm="handleConfirmAddLiquidity" />
    <result-dialog :visible.sync="isCreatePairConfirmed" :type="t('createPair.add')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router, { lazyComponent } from '@/router'
import { formatNumber, isWalletConnected } from '@/utils'
import { Components, PageNames } from '@/consts'

const namespace = 'addLiquidity'

@Component({
  components: {
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmAddLiquidity: lazyComponent(Components.ConfirmAddLiquidity),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})
export default class AddLiquidity extends Mixins(TranslationMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action getTokens

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 2)
  showConfirmDialog = false
  isCreatePairConfirmed = false

  async created () {
    await this.getTokens()

    if (this.liquidityId) {
      await this.setDataFromLiquidity(this.liquidityId)
    }
  }

  get liquidityId (): string {
    return this.$route.params.id
  }

  formModel = {
    first: formatNumber(0, 1),
    second: formatNumber(0, 1)
  }

  formatNumber = formatNumber

  get connected (): boolean {
    return isWalletConnected()
  }

  get firstPerSecondPrice (): string {
    return formatNumber(this.firstToken.price / this.secondToken.price, 2)
  }

  get secondPerFirstPrice (): string {
    return formatNumber(this.secondToken.price / this.firstToken.price, 2)
  }

  get firstTokenPosition (): string {
    return formatNumber(0, 2)
  }

  get secondTokenPosition (): string {
    return formatNumber(0, 2)
  }

  get poolTokens (): string {
    return formatNumber(0, 2)
  }

  get shareOfPool (): string {
    return '<0.01%'
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.first > this.firstToken.balance
    }

    return true
  }

  get resultMessage (): string {
    return this.t('createPair.transactionMessage', {
      firstToken: this.getTokenValue(this.firstToken, this.firstTokenValue),
      secondToken: this.getTokenValue(this.secondToken, this.secondTokenValue)
    })
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  handleBack (): void {
    router.push({ name: PageNames.Pool })
  }

  openSelectFirstTokenDialog (): void {
    this.showSelectFirstTokenDialog = true
  }

  openSelectSecondTokenDialog (): void {
    this.showSelectSecondTokenDialog = true
  }

  handleChangeFirstField (): void {
    this.setFirstTokenValue(this.formModel.first)
  }

  handleChangeSecondField (): void {
    this.setSecondTokenValue(this.formModel.second)
  }

  handleFirstMaxValue (): void {
    this.formModel.first = this.firstToken.balance
  }

  handleSecondMaxValue (): void {
    this.formModel.second = this.secondToken.balance
  }

  getTokenBalance (token: any): string {
    if (token) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }

  handleConfirmAddLiquidity (): void {
    this.showConfirmDialog = false
    this.isCreatePairConfirmed = true
  }
}
</script>

<style lang="scss">
$swap-input-class: ".el-input";

.plus {
  padding: $inner-spacing-medium;
}
.el-form--add-liquidity {
  @include s-input-styles;
  @include token-buttons-styles;
}
.card {
  .el-divider {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-mini;
  }
}
</style>

<style lang="scss" scoped>
.container {
  @include container-styles;
}

@include header-styles;

.el-form--add-liquidity {
  display: flex;
  flex-direction: column;
  align-items: center;
  .input-container {
    position: relative;
    padding: $inner-spacing-small $inner-spacing-medium $inner-spacing-mini;
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-mini);
    .input-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      + .input-line {
        margin-top: $inner-spacing-small;
      }
    }
    .el-form-item {
      margin-bottom: 0;
      width: 50%;
    }
    .input-title,
    .token-balance {
      display: inline-flex;
      align-items: baseline;
    }
    .input-title {
      font-weight: $s-font-weight-medium;
      &-estimated {
        margin-left: $inner-spacing-mini / 2;
        font-size: var(--s-font-size-mini);
        font-weight: $s-font-weight-mini;
      }
    }
    @include token-styles;
  }
  .s-input {
    min-height: 0;
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
  }
  .el-button {
    &--max,
    &--empty-token,
    &--choose-token {
      font-weight: $s-font-weight-big;
      font-feature-settings: $s-font-feature-settings-title;
    }
    &--max {
      margin-right: $inner-spacing-mini;
      padding-right: $inner-spacing-mini;
      height: var(--s-size-mini);
    }
    &--empty-token {
      position: absolute;
      right: $inner-spacing-mini;
      bottom: $inner-spacing-mini;
    }
    &--choose-token {
      margin-left: 0;
      margin-right: -$inner-spacing-mini;
      padding-left: $inner-spacing-mini / 2;
      background-color: var(--s-color-base-background);
      border-color: var(--s-color-base-background);
      color: var(--s-color-base-content-primary);
      &:hover, &:active, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
        color: var(--s-color-base-content-primary);
      }
    }
    &.el-button--switch-price {
      margin-right: 0;
      margin-left: $inner-spacing-mini;
    }
  }
  .s-primary {
    margin-top: $inner-spacing-medium;
    width: 100%;
    &:disabled {
      color: var(--s-color-base-on-disabled);
    }
  }
}

.pair-token-logo {
  margin-right: $inner-spacing-mini
}
</style>
