<template>
  <div class="demeter-staking">
    <generic-page-header :title="t('staking.title')" :tooltip="t('pool.description')" />

    <s-collapse class="demeter-staking-list">
      <s-collapse-item v-for="token of tokensData" :key="token.address" :name="token.address" class="staking-info">
        <template #title>
          <div class="staking-info-title">
            <div class="staking-info-title__token">
              <token-logo :token="token" size="medium" />
              <h3>{{ token.symbol }}</h3>
            </div>

            <pool-status-badge :active="token.active" :has-stake="token.hasStake" class="staking-info-title__badge" />
          </div>
        </template>

        <pool-card
          v-for="item of token.items"
          :key="item.pool.rewardAsset"
          :pool="item.pool"
          :account-pool="item.accountPool"
          class="staking-info-card"
        />
      </s-collapse-item>
    </s-collapse>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';

import { action, state, getter } from '@/store/decorators';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PoolCard: lazyComponent(Components.PoolCard),
    PoolStatusBadge: lazyComponent(Components.PoolStatusBadge),
    TokenLogo: components.TokenLogo,
  },
})
export default class DemeterStaking extends Mixins(SubscriptionsMixin, TranslationMixin) {
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<Asset>;
  @getter.demeterFarming.stakingPools stakingPools!: DataMap<DemeterPool[]>;
  @getter.demeterFarming.accountStakingPools accountStakingPools!: Array<DemeterAccountPool>;

  @action.demeterFarming.subscribeOnPools private subscribeOnPools!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnTokens private subscribeOnTokens!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncVoidFn;
  @action.demeterFarming.unsubscribeUpdates private unsubscribeDemeter!: AsyncVoidFn;

  created(): void {
    this.setStartSubscriptions([this.subscribeOnPools, this.subscribeOnTokens, this.subscribeOnAccountPools]);
    this.setResetSubscriptions([this.unsubscribeDemeter]);
  }

  get tokensData(): object {
    return Object.entries(this.stakingPools).map(([address, pools]) => {
      const asset = this.getAsset(address);
      const symbol = asset?.symbol ?? this.t('pool.unknownAsset');
      const items = pools.map((pool) => {
        const accountPool = this.accountStakingPools.find(
          (accountPool) => accountPool.poolAsset === address && accountPool.rewardAsset === pool.rewardAsset
        );

        return {
          pool,
          accountPool,
        };
      });
      const active = items.some((item) => !item.pool.isRemoved);
      const hasStake = items.some(
        (item) => !!item.accountPool && (!item.accountPool.pooledTokens.isZero() || !item.accountPool.rewards.isZero())
      );

      return {
        asset,
        symbol,
        address,
        active,
        hasStake,
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
    .logo {
      margin-right: $inner-spacing-medium;
    }
  }
}
</style>

<style lang="scss" scoped>
.staking-info {
  &-title {
    display: flex;
    flex: 1;
    align-items: center;
    padding-right: $inner-spacing-medium;

    &__token {
      display: flex;
      flex: 1;
      align-items: center;

      font-weight: 700;
      letter-spacing: var(--s-letter-spacing-small);
      text-align: left;
    }
  }

  &-card {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }
}
</style>
