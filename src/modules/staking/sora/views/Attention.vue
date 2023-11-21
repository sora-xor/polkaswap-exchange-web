<template>
  <div class="container" v-loading="parentLoading">
    <s-icon @click="back()" class="back-button" name="arrows-chevron-left-rounded-24" />
    <token-logo :token="stakingAsset" size="large" class="token-logo" />
    <h1>SORA Staking</h1>
    <p>Stake XOR tokens on SORA Network as a nominator to validate transactions and earn VAL token rewards.</p>
    <s-button
      v-if="isLoggedIn"
      class="button s-typography-button--large"
      data-test-name="addLiquidity"
      type="primary"
      @click="handleStake()"
    >
      START STAKING
    </s-button>
    <div class="info">
      <info-line label="TOTAL LIQUIDITY STAKED" :value="totalStakedFormatted" />
      <info-line :label="TranslationConsts.APR" :value="maxApy" />
      <info-line label="REWARD TOKEN" :value="rewardAsset?.symbol" />
      <info-line label="UNSTAKING PERIOD" value="28 DAYS" />
      <info-line label="MINIMUM STAKE" value="1 XOR" :asset-symbol="stakingAsset?.symbol" is-formatted />
      <info-line label="NOMINATORS" :value="totalNominators" />
      <info-line label="VALIDATORS" :value="validators.length" />
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import router from '@/router';
import { getter, state } from '@/store/decorators';

import { DemeterStakingComponents } from '../../demeter/consts';
import { soraStakingLazyComponent } from '../../router';
import { SoraStakingPageNames } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    PoolCard: soraStakingLazyComponent(DemeterStakingComponents.PoolCard),
    StatusBadge: soraStakingLazyComponent(DemeterStakingComponents.StatusBadge),
    TokenLogo: components.TokenLogo,
    InfoLine: components.InfoLine,
  },
})
export default class SoraStakingAttention extends Mixins(StakingMixin, mixins.LoadingMixin, TranslationMixin) {
  activeCollapseItems: string[] = [];

  @state.staking.totalNominators totalNominators!: number;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  back() {
    router.push({ name: SoraStakingPageNames.Overview });
  }

  handleStake() {
    router.push({ name: SoraStakingPageNames.NewStake });
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
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

.container {
  width: 100%;
  max-width: 375px;
  margin: 50px auto;
  padding: 30px;
  border-radius: 20px;
}

.back-button {
  display: flex;
  justify-content: center;
  align-items: center;
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
  border-radius: 100%;
}

.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 28px;
  text-align: center;
  margin-bottom: 15px;
}

p {
  color: var(--base-day-content-secondary, #a19a9d);
  text-align: center;
  font-feature-settings: 'case' on, 'clig' off, 'liga' off;
  font-family: Sora;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 150%; /* 24px */
  letter-spacing: -0.32px;
}

.button {
  width: 100%;
  margin-top: 16px;
}

.info {
  margin-top: 25px;
}
</style>
../../demeter/consts
