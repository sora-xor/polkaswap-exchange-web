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
            <div class="s-flex staking-info-badges">
              <status-badge
                v-for="item in token.items"
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
          v-for="item in token.items"
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
      :parent-loading="parentLoading || loading"
      @add="handleStakeAction($event, deposit, signTx)"
      @remove="handleStakeAction($event, withdraw, signTx)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :parent-loading="parentLoading || loading"
      @confirm="handleClaimRewards($event, signTx)"
    />
    <calculator-dialog :visible.sync="showCalculatorDialog" :pool="selectedPool" :account-pool="selectedAccountPool" />
    <confirm-dialog :visible.sync="showConfirmTxDialog" @confirm="confirmTransactionDialog" />
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
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';

type StakingItem = {
  asset: Asset;
  items: Array<{ pool: DemeterPool; accountPool: Nullable<DemeterAccountPool> }>;
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PoolCard: demeterLazyComponent(DemeterComponents.PoolCard),
    StatusBadge: demeterLazyComponent(DemeterComponents.StatusBadge),
    StakeDialog: demeterLazyComponent(DemeterComponents.StakeDialog),
    ClaimDialog: demeterLazyComponent(DemeterComponents.ClaimDialog),
    CalculatorDialog: demeterLazyComponent(DemeterComponents.CalculatorDialog),
    ConfirmDialog: components.ConfirmDialog,
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
    return Object.entries(this.pools).reduce<StakingItem[]>((buffer, [address, poolsMap]) => {
      const asset = this.getAsset(address);

      if (!asset) return buffer;

      const items = this.getAvailablePools(poolsMap?.[address]);

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
  letter-spacing: var(--s-letter-spacing-small);
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
}

.staking-info {
  &-title {
    font-weight: 700;
    letter-spacing: var(--s-letter-spacing-small);
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
