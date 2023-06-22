<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    />
    <div class="liquidity-options__tooltip">
      <span>{{ 'ADD' }}</span>
      <s-tooltip border-radius="mini" :content="'what?'" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </div>
    <div class="liquidity-options">
      <div v-if="!secondToken" class="liquidity-options-tabs-placeholder"><span>Choose token</span></div>
      <s-tabs v-else v-model="currentTab" type="rounded" @click="handleTabChange">
        <s-tab :name="AddLiquidityType.Simple">
          <div slot="label">
            <pair-token-logo
              :first-token="firstToken"
              :second-token="secondToken"
              size="mini"
              class="liquidity-options__token-logo-pair"
            />
            <span>XOR-DAI</span>
          </div>
        </s-tab>
        <s-tab :name="AddLiquidityType.DivisibleFirstToken">
          <div slot="label">
            <token-logo :token="firstToken" size="mini" class="token-logo liquidity-options__token-logo" />
            <span>{{ firstTokenSymbol }}</span>
          </div>
        </s-tab>
        <s-tab :name="AddLiquidityType.DivisibleSecondToken">
          <div slot="label">
            <token-logo :token="secondToken" size="mini" class="token-logo liquidity-options__token-logo" />
            <span>{{ secondTokenSymbol }}</span>
          </div>
        </s-tab>
      </s-tabs>
    </div>
    <component :is="getComponent()" :currentTab="currentTab"></component>
  </div>
</template>

<script lang="ts">
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import BaseTokenPairMixin from '@/components/mixins/BaseTokenPairMixin';
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { AddLiquidityType } from '@/store/addLiquidity/types';
import { action, mutation } from '@/store/decorators';

@Component({
  components: {
    AddLiquiditySimple: lazyComponent(Components.AddLiquiditySimple),
    AddLiquidityDivisible: lazyComponent(Components.AddLiquidityDivisible),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenLogo: components.TokenLogo,
  },
})
export default class AddLiquidity extends Mixins(
  mixins.TransactionMixin,
  mixins.NetworkFeeWarningMixin,
  BaseTokenPairMixin,
  NetworkFeeDialogMixin,
  ConfirmDialogMixin,
  TokenSelectMixin,
  SelectedTokenRouteMixin
) {
  @mutation.addLiquidity.setLiquidityOption setLiquidityOption!: (type: AddLiquidityType) => void;

  @action.addLiquidity.setFirstTokenValue setFirstTokenValue!: (address: string) => Promise<void>;
  @action.addLiquidity.setSecondTokenValue setSecondTokenValue!: (address: string) => Promise<void>;

  currentTab: AddLiquidityType = AddLiquidityType.Simple;
  isSplitAutomatic = false;

  readonly AddLiquidityType = AddLiquidityType;

  isFirstTokenSelected = false;

  @Watch('isLoggedIn')
  private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (wasLoggedIn && !isLoggedIn) {
      this.handleBack();
    }
  }

  getComponent(): string {
    return this.isSplitAutomatic ? 'AddLiquidityDivisible' : 'AddLiquiditySimple';
  }

  handleTabChange(): void {
    if ([AddLiquidityType.DivisibleFirstToken, AddLiquidityType.DivisibleSecondToken].includes(this.currentTab)) {
      this.isSplitAutomatic = true;
    } else {
      this.isSplitAutomatic = false;
    }

    this.setFirstTokenValue('');
    this.setSecondTokenValue('');
    this.setLiquidityOption(this.currentTab);
  }

  async mounted(): Promise<void> {
    this.currentTab = AddLiquidityType.Simple;
    this.handleTabChange();
  }

  handleBack(): void {
    router.push({ name: PageNames.Pool });
  }
}
</script>

<style lang="scss" scoped>
.liquidity-options {
  @include custom-tabs;

  margin-top: 8px;

  &__token-logo {
    height: 14px;
    display: inline-block;
    margin-right: 5px;
  }

  &__tooltip {
    color: var(--s-color-base-content-secondary);

    display: inline-flex;
    align-items: baseline;
    align-self: self-start;
    span {
      margin-right: calc(var(--s-basic-spacing) / 2);
    }
  }

  &-tabs-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--s-color-base-background);
    color: #a19a9d;
    border-radius: 24px;
    height: 28px;
    font-size: 14px;
    text-transform: uppercase;
    line-height: 100%;
    box-shadow: var(--neu-tabs-shadow);
    margin-bottom: $basic-spacing;
    font-weight: 500;
  }
}
</style>
