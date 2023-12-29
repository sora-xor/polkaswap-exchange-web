<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('staking.title')" />

    <s-card v-if="!tokensData.length && !soraStaking" shadow="always" size="big" primary class="staking-empty-card">
      {{ t('demeterFarming.staking.stopped') }}
    </s-card>

    <router-link class="staking-sora-link" :to="{ name: SoraStakingPageNames.Overview }">
      <s-card class="staking-sora-card">
        <token-logo :token="soraStaking.asset" size="medium" class="token-logo" />
        <div>
          <h5 class="staking-info-subtitle">sora staking</h5>
          <h3 class="staking-info-title">{{ soraStaking.asset.symbol }}</h3>
          <div v-show="!isActiveCollapseItem('sora', activeCollapseItems)" class="s-flex staking-info-badges">
            <sora-status-badge />
          </div>
        </div>
        <s-icon class="staking-sora-arrow" name="arrows-chevron-right-rounded-24" />
      </s-card>
    </router-link>

    <span v-if="tokensData.length" class="staking-sora-separator"></span>

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
              <demeter-status-badge
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
import type { DemeterPoolDerivedData } from '@/modules/staking/demeter/types';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';
import { sortAssets } from '@/utils';

import { DemeterStakingComponents } from '../demeter/consts';
import PageMixin from '../demeter/mixins/PageMixin';
import { demeterStakingLazyComponent, soraStakingLazyComponent } from '../router';
import { soraStaking, SoraStakingComponents, SoraStakingPageNames } from '../sora/consts';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

type DemeterStakingItem = {
  asset: Asset;
  items: Array<DemeterPoolDerivedData>;
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
    DemeterStatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
    SoraStatusBadge: soraStakingLazyComponent(SoraStakingComponents.StatusBadge),
    StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
    ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
    CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
    TokenLogo: components.TokenLogo,
  },
})
export default class Staking extends Mixins(PageMixin, TranslationMixin) {
  @state.staking.validatorsInfo validators!: Array<ValidatorInfoFull>;

  activeCollapseItems: string[] = [];

  soraStaking = soraStaking;

  SoraStakingPageNames = SoraStakingPageNames;

  updateActiveCollapseItems(items: string[]) {
    this.activeCollapseItems = items;
  }

  get selectedDerivedPool(): Nullable<DemeterPoolDerivedData> {
    if (!this.selectedPool) return null;

    return this.prepareDerivedPoolData(this.selectedPool, this.selectedAccountPool);
  }

  get tokensData(): DemeterStakingItem[] {
    const items = Object.entries(this.pools).reduce<DemeterStakingItem[]>((buffer, [address, poolsMap]) => {
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

    const defaultSorted = [...items].sort((a, b) => sortAssets(a.asset, b.asset));

    return defaultSorted;
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
.staking-sora-card {
  .el-card__body {
    display: flex;
    align-items: flex-start;
  }
}
</style>

<style lang="scss" scoped>
$title-height: 42px;

.demeter-staking {
  height: 100%;
}

.staking-info-badges {
  flex-flow: wrap;
  gap: $inner-spacing-tiny;
}

.staking-sora {
  &-card {
    position: relative;
    width: 100%;
    margin-bottom: 16px;
    padding: 0;
    background: var(--s-color-utility-surface);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-small);
    text-align: center;
    .token-logo {
      margin-right: 16px;
      margin-top: 4px;
    }
  }
  &-link {
    text-decoration: none;
  }
  &-arrow {
    display: block;
    width: var(--s-size-medium);
    height: var(--s-size-medium);
    line-height: var(--s-size-medium);
    background: var(--s-color-utility-body);
    border-color: transparent;
    border-style: solid;
    border-width: 0px;
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-tertiary);
    font-size: 28px;
    height: 42px;
    width: 42px;
    right: 0;
    top: 0;
    border-radius: 100%;
    margin-left: auto;
  }
  &-separator {
    display: block;
    width: 100%;
    height: 1px;
    background: var(--s-color-base-border-secondary);
    margin-bottom: $inner-spacing-medium;
  }
}

.staking-info {
  &-subtitle {
    color: var(--s-color-theme-accent);
    font-feature-settings: 'clig' off, 'liga' off;
    font-family: Sora;
    font-size: 11px;
    font-style: normal;
    font-weight: 700;
    line-height: 11px; /* 100% */
    text-transform: uppercase;
    margin: 0;
    margin-bottom: -6px;
    text-align: left;
  }
  &-title {
    font-weight: 700;
    text-align: left;
    height: $title-height;
    line-height: $title-height;
    color: var(--s-color-base-content-primary);
  }

  &-card {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }
}
</style>
../router@/modules/staking/demeter/types../demeter/consts
