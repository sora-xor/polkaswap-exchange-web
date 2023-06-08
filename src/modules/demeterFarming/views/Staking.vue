<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('staking.title')" />

    <s-card v-if="!tokensData.length" shadow="always" size="big" primary class="staking-empty-card">
      {{ t('demeterFarming.staking.stopped') }}
    </s-card>

    <s-collapse class="demeter-staking-list" @change="updateActiveCollapseItems">
      <s-collapse-item
        v-for="token in tokensData"
        :key="token.asset.address"
        :name="token.asset.address"
        class="staking-info"
      >
        <template #title>
          <token-logo :token="token.asset" size="medium" class="token-logo" />
          <div>
            <h3 class="staking-info-title">{{ token.asset.symbol }}</h3>
            <div
              v-show="!isActiveCollapseItem(token.asset.address, activeCollapseItems)"
              class="s-flex staking-info-badges"
            >
              <status-badge
                v-for="item in token.items"
                :key="item.pool.rewardAsset"
                :pool="item.pool"
                :account-pool="item.accountPool"
                :pool-asset="item.poolAsset"
                :reward-asset="item.rewardAsset"
                :apr="item.apr"
                @add="changePoolStake($event, true)"
                class="staking-info-badge"
              />
            </div>
          </div>
        </template>

        <template v-if="isActiveCollapseItem(token.asset.address, activeCollapseItems)">
          <pool-card
            v-for="item in token.items"
            :key="item.pool.rewardAsset"
            :pool="item.pool"
            :account-pool="item.accountPool"
            :base-asset="item.baseAsset"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :apr="item.apr"
            :tvl="item.tvl"
            @add="changePoolStake($event, true)"
            @remove="changePoolStake($event, false)"
            @claim="claimPoolRewards"
            @calculator="showPoolCalculator"
            show-balance
            class="staking-info-card"
          />
        </template>
      </s-collapse-item>
    </s-collapse>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :is-adding="isAddingStake"
      :parent-loading="parentLoading || loading"
      v-bind="selectedDerivedPool"
      @add="handleStakeAction($event, deposit)"
      @remove="handleStakeAction($event, withdraw)"
    />

    <claim-dialog
      :visible.sync="showClaimDialog"
      :parent-loading="parentLoading || loading"
      v-bind="selectedDerivedPool"
      @confirm="handleClaimRewards"
    />

    <calculator-dialog :visible.sync="showCalculatorDialog" v-bind="selectedDerivedPool" />
  </div>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import type { DemeterPoolDerivedData } from '@/modules/demeterFarming/types';
import { lazyComponent } from '@/router';

import { DemeterComponents } from '../consts';
import PageMixin from '../mixins/PageMixin';
import { demeterLazyComponent } from '../router';

import type { Asset } from '@sora-substrate/util/build/assets/types';

type StakingItem = {
  asset: Asset;
  items: Array<DemeterPoolDerivedData>;
};

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
  activeCollapseItems: string[] = [];

  updateActiveCollapseItems(items: string[]) {
    this.activeCollapseItems = items;
  }

  get selectedDerivedPool(): Nullable<DemeterPoolDerivedData> {
    if (!this.selectedPool) return null;

    return this.prepareDerivedPoolData(this.selectedPool, this.selectedAccountPool);
  }

  get tokensData(): StakingItem[] {
    return Object.entries(this.pools).reduce<StakingItem[]>((buffer, [address, poolsMap]) => {
      const asset = this.demeterAssetsData[address];

      if (!asset) return buffer;

      const derived = this.getDerivedPools(poolsMap?.[address]);
      const items = derived.map((item) => this.prepareDerivedPoolData(item.pool, item.accountPool));

      if (!items.length) return buffer;

      buffer.push({
        asset,
        items,
      });

      return buffer;
    }, []);
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
      margin-top: $inner-spacing-tiny;
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
  text-align: center;
}
</style>

<style lang="scss" scoped>
$title-height: 42px;

.demeter-staking {
  height: 100%;
}

.staking-info-badges {
  flex-flow: wrap;
  gap: $inner-spacing-mini / 2;
}

.staking-info {
  &-title {
    font-weight: 700;
    text-align: left;
    height: $title-height;
    line-height: $title-height;
  }

  &-card {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }
}
</style>
