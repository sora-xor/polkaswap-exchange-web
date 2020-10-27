<template>
  <div class="layout s-flex">
    <div class="swap-container">
      <s-tabs v-model="model" type="rounded">
        <s-tab :label="t('exchange.swap')" name="swap">
          <div class="actions">
            <div class="line">
              <div class="title">{{t('exchange.from')}}</div>
              <div class="balance">{{t('exchange.balance')}} <span class="balance-value">0.00</span></div>
            </div>
            <div class="line">
              <div class="value">
                <s-input v-model="tokenFrom" placeholder="0.0" />
             </div>
              <div class="wallet">
                <s-button class="el-button--max" type="tertiary" size="small" @click="handleMaxValue">
                  {{t('exchange.max')}}
                </s-button>
                <span>{{ defaultToken.symbol }}</span>
              </div>
            </div>
          </div>
          <s-button class="el-button--switch-tokens" type="action" size="medium" icon="change-positions" @click="handleSwitchTokens"></s-button>
          <div class="actions">
            <div class="line">
              <!-- TODO: add isEstimated -->
              <div class="title">{{t('exchange.to')}}<span v-if="isEstimated" class="title-estimate"> ({{t('swap.estimated')}})</span></div>
              <!-- <div class="balance">{{t('exchange.balance')}} <span class="balance-value">0.00</span></div> -->
            </div>
            <div class="line">
              <div class="value"><s-input v-model="tokenTo" placeholder="0.0" /></div>
              <!-- <s-button class="el-button--max" type="tertiary" size="small" @click="handleMaxValue">
                {{t('exchange.max')}}
              </s-button> -->
              <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken">
                {{t('swap.chooseToken')}}
              </s-button>
            </div>
          </div>
          <div v-if="areTokensSelected" class="swap-info-container">
            <div class="swap-info">
              <span>{{ t('exchange.price') }}</span>
              <span class="swap-info-value">0.0041 {{ defaultToken.symbol }} / {{ swapToken.symbol }}</span>
              <s-button class="el-button--switch-price" type="action" size="small" icon="swap" @click="handleSwitchPrice"></s-button>
            </div>
            <div class="swap-info">
              <span>{{ t('swap.slippageTolerance') }}</span>
              <span class="swap-info-value">{{ slippageToleranceValue }}%</span>
            </div>
          </div>
          <s-button type="primary" size="medium" @click="handleClickConnect">
            {{ t('swap.connectWallet') }}
          </s-button>
          <div v-if="areTokensSelected" class="swap-info-container">
            <div class="swap-info">
              <s-tooltip class="swap-info-icon" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start">
                <s-icon name="info" size="16"/>
              </s-tooltip>
              <span>{{ t('swap.minReceived') }}</span>
              <span class="swap-info-value">24,351.25 {{ defaultToken.symbol }}</span>
            </div>
            <div class="swap-info">
              <s-tooltip class="swap-info-icon" :content="t('swap.priceImpactTooltip')" theme="light" placement="right-start">
                <s-icon name="info" size="16"/>
              </s-tooltip>
              <span>{{ t('swap.priceImpact') }}</span>
              <span class="swap-info-value price-impact-value">0.02%</span>
            </div>
            <div class="swap-info">
              <s-tooltip class="swap-info-icon" :content="t('swap.liquidityProviderFeeTooltip')" theme="light" placement="right-start">
                <s-icon name="info" size="16"/>
              </s-tooltip>
              <span>{{ t('swap.liquidityProviderFee') }}</span>
              <span class="swap-info-value">0.00067 {{ defaultToken.symbol }}</span>
            </div>
          </div>
        </s-tab>
        <!-- TODO: Move Swap and Pool to independent components -->
        <s-tab :label="t('exchange.pool')" name="pool">Pool content</s-tab>
      </s-tabs>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import Swap from '@/components/Swap.vue'
import router from '@/router'

@Component
export default class Exchange extends Mixins(TranslationMixin) {
  model = 'swap';
  tokenFrom = 0;
  tokenTo = 0;
  // TODO: add watchers for tokens selection or alternative way to check it
  slippageToleranceValue = 0.5;
  tokens = {
    XOR: {
      name: 'Sora',
      symbol: 'XOR',
      address: '1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      price: 0.0035
    },
    KSM: {
      name: 'Kusama',
      symbol: 'KSM',
      address: '34916349d43f65bccca11ff53a8e0382a1a594a7',
      price: 0.0044
    },
    ETH: {
      name: 'Ether',
      symbol: 'ETH',
      address: '8adaca8ea8192656a15c88797e04c8771c4576b36901df4ad94c92dbe42397a0',
      price: 0.0057
    }
  };

  defaultToken = this.tokens.XOR;
  // swapToken = this.tokens.KSM;
  swapToken = null;
  areTokensSelected = this.defaultToken && this.swapToken;

  handleMaxValue (): void {
    alert(this.t('exchange.max'))
  }

  handleSwitchTokens (): void {
    const defaultTokenValue = this.defaultToken
    this.defaultToken = this.swapToken
    this.swapToken = defaultTokenValue
  }

  handleChooseToken (): void {
    alert(this.t('swap.chooseToken'))
  }

  handleSwitchPrice (): void {
    alert('Swap prices')
  }

  handleClickConnect (): void {
    alert(this.t('swap.connectWallet'))
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$tabs-class: ".el-tabs";
$tabs-container-height: $basic-spacing * 4;
$tabs-container-padding: 2px;
$tabs-item-height: $tabs-container-height - $tabs-container-padding * 2;

.swap-container {
  .s-tabs {
    #{$tabs-class} {
      &__header {
        width: 100%;
        #{$tabs-class}__nav-wrap #{$tabs-class}__item {
          padding-right: $inner-spacing_medium;
          padding-left: $inner-spacing_medium;
          &.is-active {
            box-shadow: 0px 1px 1px 0px rgba(var(--s-color-standard-black), 0.1);
            &:hover {
              box-shadow: none;
            }
          }
          &:focus,
          &.is-focus {
            box-shadow: none;
            background-color: var(--s-color-background-hover);
          }
          &,
          &.is-active,
          &.is-focus {
            border-radius: $border-radius_small;
          }
        }
        #{$tabs-class}__item {
          height: $tabs-item-height;
          line-height: $tabs-item-height;
          &:hover {
            background-color: var(--s-color-background-hover);
          }
        }
      }
      &__nav-wrap {
        height: $tabs-container-height;
        padding: $tabs-container-padding;
        background-color: var(--s-color-background);
        border-radius: $border-radius_small;
      }
    }
  }
  #{$tabs-class} {
    &__header {
      margin-bottom: $inner-spacing_mini;
    }
    &__nav {
      width: 100%;
    }
    &__item {
      width: 50%;
      text-align: center;
    }
  }
  .el-button--choose-token {
    margin-right: -$inner-spacing_mini;
    > span {
      display: inline-flex;
      flex-direction: row-reverse;
      > i[class^=s-icon-] {
        margin-left: $inner-spacing_mini;
        margin-right: 0;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';
// TODO: play with font sizes

.swap-container {
  margin: $inner-spacing_big auto;
  padding: $inner-spacing_medium $inner-spacing_medium $inner-spacing_big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: var(--s-color-standard-white);
  border-radius: $border-radius_medium;
  box-shadow: 0px 1px 4px 0px rgba(var(--s-color-standard-black-rgb), 0.35);
  color: var(--s-color-basic-dark);
  .s-tabs {
    width: 100%;
  }
  .el-tab-pane {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .actions {
    padding: $inner-spacing_mini $inner-spacing_medium;
    width: 100%;
    background-color: var(--s-color-background);
    border-radius: $border-radius_mini;
    .line {
      display: flex;
      justify-content: space-between;
      + .line {
        margin-top: $inner-spacing_small;
      }
    }
    .title {
      font-weight: 600;
      &-estimate {
        font-weight: 400;
      }
    }
    .balance {
      color: var(--s-color-text-dark);
      &-value {
        color: var(--s-color-basic-dark);
      }
    }
    .wallet {
      font-weight: 700;
    }
    .s-input {
      color: var(--s-color-text-dark);
      font-size: 20px;
      line-height: 1.26;
    }
  }
  .actions,
  .el-button--switch-tokens {
    margin-top: $inner-spacing_mini;
  }
  .s-action {
    background-color: var(--s-color-background);
    border-color: var(--s-color-background);
    border-radius: $border-radius_small;
    &:hover, &:focus {
      background-color: var(--s-color-background-hover);
      border-color: var(--s-color-background-hover);
    }
  }
  .s-tertiary {
    padding-right: $inner-spacing_mini;
    padding-left: $inner-spacing_mini;
    background-color: var(--s-color-main-light);
    border-color: var(--s-color-main-light);
    border-radius: $border-radius_mini;
    color: var(--s-color-main-brand);
    font-weight: 700;
    &:hover, &:focus {
      background-color: var(--s-color-main-light-hover);
      border-color: var(--s-color-main-light-hover);
    }
    .s-icon-change-positions {
      margin-right: 0;
      margin-left: $inner-spacing_mini / 2;
    }
  }
  .swap-info {
    display: flex;
    align-items: center;
    margin-top: $inner-spacing_mini;
    color: var(--s-color-text-info);
    &:first-child {
      margin-top: $inner-spacing_small;
    }
    &-container {
      width: 100%;
    }
    &-value {
      margin-left: auto;
    }
    .price-impact-value {
      color: var(--s-color-status-success);
    }
    .el-tooltip {
      margin-right: $inner-spacing_small;
    }
    &-icon {
      position: relative;
      height: $inner-spacing_big;
      width: $inner-spacing_big;
      background-color: var(--s-color-background);
      border-radius: $border-radius_small;
      &:hover {
        background-color: var(--s-color-background-hover);
        cursor: pointer;
      }
      &:before {
        position: absolute;
        display: block;
        height: $inner-spacing_medium;
        width: $inner-spacing_medium;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        margin: auto;
      }
    }
  }
  .el-button--max {
    margin-right: $inner-spacing_mini;
  }
  .el-button--switch-price {
    margin-left: $inner-spacing_mini;
  }
  .s-primary {
    margin-top: $inner-spacing_medium;
    width: 100%;
    border-radius: $border-radius_small;
  }
}
</style>
