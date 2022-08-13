<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('staking.title')" />

    <s-card v-if="!tokensData.length" shadow="always" size="big" primary class="staking-empty-card">
      {{ t('demeterFarming.staking.stopped') }}
    </s-card>

    <s-collapse class="demeter-staking-list" @change="updateActiveCollapseItems">
      <s-collapse-item v-for="token of tokensData" :key="token.address" :name="token.address" class="staking-info">
        <template #title>
          <token-logo :token="token" size="medium" class="token-logo" />
          <div>
            <h3 class="staking-info-title">{{ token.symbol }}</h3>
            <div class="s-flex">
              <status-badge
                v-for="item of token.items"
                :key="item.pool.rewardAsset"
                :pool="item.pool"
                :account-pool="item.accountPool"
                @add="changePoolStake($event, true)"
                class="staking-info-badge"
              />
            </div>
          </div>
        </template>

        <pool-card
          v-for="item of token.items"
          :key="item.pool.rewardAsset"
          :pool="item.pool"
          :account-pool="item.accountPool"
          @add="changePoolStake($event, true)"
          @remove="changePoolStake($event, false)"
          @claim="claimPoolRewards"
          @calculator="showPoolCalculator"
          show-balance
          class="staking-info-card"
        />
      </s-collapse-item>
    </s-collapse>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :is-adding="isAddingStake"
      @add="handleStakeAction($event, deposit)"
      @remove="handleStakeAction($event, withdraw)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      @confirm="handleClaimRewards"
    />
    <calculator-dialog :visible.sync="showCalculatorDialog" :pool="selectedPool" :account-pool="selectedAccountPool" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import PageMixin from '../mixins/PageMixin';
import { demeterLazyComponent } from '../router';
import { DemeterComponents } from '../consts';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import { getter } from '@/store/decorators';

import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PoolCard: demeterLazyComponent(DemeterComponents.PoolCard),
    StatusBadge: demeterLazyComponent(DemeterComponents.StatusBadge),
    StakeDialog: demeterLazyComponent(DemeterComponents.StakeDialog),
    ClaimDialog: demeterLazyComponent(DemeterComponents.ClaimDialog),
    CalculatorDialog: demeterLazyComponent(DemeterComponents.CalculatorDialog),
    TokenLogo: components.TokenLogo,
  },
})
export default class DemeterStaking extends Mixins(PageMixin, TranslationMixin) {
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<Asset>;

  // override PageMixin
  isFarmingPage = false;

  activeCollapseItems: string[] = [];

  updateActiveCollapseItems(items: string[]) {
    this.activeCollapseItems = items;
  }

  get tokensData(): object {
    return Object.entries(this.pools).map(([address, pools]) => {
      const asset = this.getAsset(address);
      const symbol = asset?.symbol ?? this.t('unknownAssetText');
      const items = this.getAvailablePools(pools);

      return {
        asset,
        symbol,
        address,
        items,
      };
    });
  }
}
</script>

<style lang="scss">
.demeter-staking-list {
  @include collapse-items;
  .el-collapse-item__header {
    align-items: flex-start;

    .token-logo {
      margin-right: $inner-spacing-medium;
      margin-top: $inner-spacing-mini / 2;
    }
  }
}
.s-card.neumorphic.staking-empty-card {
  color: var(--s-color-base-content-secondary);
  padding: $basic-spacing-medium $inner-spacing-big;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-medium);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--s-letter-spacing-small);
  text-align: center;
}
</style>

<style lang="scss" scoped>
$title-height: 42px;

.demeter-staking {
  height: 100%;
}

.staking-info {
  &-title {
    font-weight: 700;
    letter-spacing: var(--s-letter-spacing-small);
    text-align: left;
    height: $title-height;
    line-height: $title-height;
  }

  &-badge {
    & + & {
      margin-left: $inner-spacing-mini;
    }
  }

  &-card {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }
}
</style>
