<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('pageTitle.Staking')"></generic-page-header>

    <s-card v-if="!tokensData.length && !soraStaking" shadow="always" size="big" primary class="staking-empty-card">
      {{ t('demeterFarming.staking.stopped') }}
    </s-card>

    <router-link class="staking-sora-link" :to="{ name: SoraStakingPageNames.Overview }">
      <s-card class="staking-sora-card">
        <token-logo :token="soraStaking.asset" size="medium" class="token-logo"></token-logo>
        <div>
          <h5 class="staking-info-subtitle">sora staking</h5>
          <h3 class="staking-info-title">{{ soraStaking.asset.symbol }}</h3>
          <div v-show="!page.isActiveCollapseItem('sora', activeCollapseItems)" class="s-flex staking-info-badges">
            <sora-status-badge></sora-status-badge>
          </div>
        </div>
        <s-icon class="staking-sora-arrow" name="arrows-chevron-right-rounded-24"></s-icon>
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
          <token-logo :token="token.asset" size="medium" class="token-logo"></token-logo>
          <div>
            <h3 class="staking-info-title">{{ token.asset.symbol }}</h3>
            <div
              v-show="!page.isActiveCollapseItem(token.asset.address, activeCollapseItems)"
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
                @add="page.changePoolStake($event, true)"
                class="staking-info-badge"
              ></demeter-status-badge>
            </div>
          </div>
        </template>

        <template v-if="page.isActiveCollapseItem(token.asset.address, activeCollapseItems)">
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
            @add="page.changePoolStake($event, true)"
            @remove="page.changePoolStake($event, false)"
            @claim="page.claimPoolRewards"
            @calculator="showPoolCalculator"
            show-balance
            class="staking-info-card"
          ></pool-card>
        </template>
      </s-collapse-item>
    </s-collapse>

    <stake-dialog
      v-model:visible="page.showStakeDialog"
      :is-adding="page.isAddingStake"
      :parent-loading="parentLoading"
      v-bind="page.selectedDerivedPool"
      @add="page.handleStakeAction($event, page.deposit)"
      @remove="page.handleStakeAction($event, page.withdraw)"
    ></stake-dialog>

    <claim-dialog
      v-model:visible="page.showClaimDialog"
      :parent-loading="parentLoading"
      v-bind="page.selectedDerivedPool"
      @confirm="page.handleClaimRewards"
    ></claim-dialog>

    <calculator-dialog
      v-model:visible="base.showCalculatorDialog"
      v-bind="page.selectedDerivedPool"
    ></calculator-dialog>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyView } from '@/modules/pool/router';
import { lazyComponent } from '@/router';
import { sortAssets } from '@/utils';

import { useDemeterBasePage } from '../demeter/composables/useDemeterBasePage';
import { useDemeterPage } from '../demeter/composables/useDemeterPage';
import type { DemeterPoolDerivedData } from '../demeter/types';
import { DemeterStakingComponents } from '../demeter/consts';
import { demeterStakingLazyComponent, soraStakingLazyComponent } from '../router';
import { soraStaking as soraStakingConfig, SoraStakingComponents, SoraStakingPageNames } from '../sora/consts';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

type DemeterStakingItem = {
  asset: Asset;
  items: DemeterPoolDerivedData[];
};

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
});

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PoolBase: poolLazyView(PoolPageNames.Pool),
    PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
    DemeterStatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
    SoraStatusBadge: soraStakingLazyComponent(SoraStakingComponents.StatusBadge),
    StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
    ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
    CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
    TokenLogo: components.TokenLogo,
  },
});

const { t } = useTranslation();
const base = useDemeterBasePage({ isFarmingPage: true });
const page = useDemeterPage(base, { parentLoading: computed(() => props.parentLoading) });
const parentLoading = computed(() => props.parentLoading || page.loading.value);
const soraStaking = soraStakingConfig;

const activeCollapseItems = ref<string[]>([]);
const updateActiveCollapseItems = (items: string[]) => {
  activeCollapseItems.value = items;
};

const tokensData = computed<DemeterStakingItem[]>(() => {
  const pools = base.pools.value;
  const assets = base.demeterAssetsData.value;

  return Object.entries(pools ?? {})
    .reduce<DemeterStakingItem[]>((buffer, [address, poolMap]) => {
      const asset = assets[address];
      if (!asset) return buffer;

      const derivedItems: DemeterPoolDerivedData[] = Object.values(poolMap ?? {}).flatMap((list) => {
        const derived = base.getDerivedPools(list as any[]);
        return derived.map((item) => base.prepareDerivedPoolData(item.pool, item.accountPool));
      });

      if (!derivedItems.length) return buffer;

      buffer.push({ asset, items: derivedItems });
      return buffer;
    }, [])
    .sort((a, b) => sortAssets(a.asset, b.asset));
});
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
    font-size: 11px;
    font-style: normal;
    font-weight: 700;
    line-height: 11px;
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
