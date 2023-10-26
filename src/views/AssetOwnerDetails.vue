<template>
  <div v-if="asset" class="asset-owner-details-container">
    <s-row>
      <s-col class="s-flex" :xs="12" :sm="12" :md="5" :lg="5">
        <s-button type="action" size="small" alternative :tooltip="t('assets.details')" @click="handleBack">
          <s-icon name="arrows-chevron-left-rounded-24" size="24" />
        </s-button>
        <div class="asset__primary-col">
          <s-card class="asset" border-radius="small" shadow="always" size="big" primary>
            <p class="p3">Your asset</p>
            <div class="asset-title s-flex">
              <div class="asset-title__text s-flex-column">
                <h3 class="asset-title__name">{{ asset.name }}</h3>
                <token-address :address="asset.address" :symbol="asset.symbol" />
              </div>
              <token-logo class="asset-title__icon" size="big" :token="asset" />
            </div>
            <s-divider />
            <div class="asset-balance">
              <div class="asset-balance__info">
                <p class="p3">Your balance</p>
                <formatted-amount
                  value-can-be-hidden
                  :value="formattedBalance"
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :font-weight-rate="FontWeightRate.MEDIUM"
                />
                <formatted-amount v-if="fiatBalance" is-fiat-value value-can-be-hidden :value="fiatBalance" />
              </div>
              <s-button size="small">Send</s-button>
            </div>
          </s-card>
          <s-card border-radius="small" shadow="always" size="big" primary>
            <div class="asset-supply">
              <div class="asset-supply__info">
                <h4>{{ asset.symbol }} asset supply</h4>
                <formatted-amount
                  :value="formattedSupply"
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :font-weight-rate="FontWeightRate.MEDIUM"
                />
                <formatted-amount v-if="fiatSupply" is-fiat-value :value="fiatSupply" />
              </div>
              <s-button type="primary" size="small" :disabled="isAddLiquidityDisabled" @click="goToAddLiquidity">
                Add liquidity
              </s-button>
            </div>
            <s-divider />
            <div class="asset-supply-actions">
              <s-button size="small" :disabled="hasFixedSupply">Mint more</s-button>
              <s-button size="small">Burn</s-button>
            </div>
            <p v-if="isAddLiquidityDisabled" class="p3">
              Adding liquidity is not available because the asset is non-divisible.
            </p>
            <p v-if="hasFixedSupply" class="p3">Minting the asset is unavailable because it is not extensible.</p>
          </s-card>
          <stats-supply-chart :predefined-token="asset" />
        </div>
      </s-col>
      <s-col :xs="12" :sm="12" :md="7" :lg="7">
        <div class="asset__secondary-col">
          <swap-chart :token-from="asset" />
          <s-row>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  UNIQUE HOLDERS
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  TOTAL TXNS
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  {{ asset.symbol }} MINTED
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  MINT TXNS
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  {{ asset.symbol }} BURNED
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
            <s-col :xs="6" :sm="6" :md="4" :lg="4">
              <s-card border-radius="small" shadow="always" size="big" primary>
                <p class="p3 asset-stats-card__title">
                  BURN TXNS
                  <s-icon name="info-16" />
                </p>
                <div class="asset-stats-card__value">N/A</div>
              </s-card>
            </s-col>
          </s-row>
          <s-card border-radius="small" shadow="always" size="big" primary>Volume</s-card>
        </div>
      </s-col>
    </s-row>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import StatsSupplyChart from '@/components/pages/Stats/SupplyChart.vue';
import { PageNames, Components } from '@/consts';
import type { OwnedAsset } from '@/modules/dashboard/types';
import router, { lazyComponent } from '@/router';
import { mutation, getter, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    TokenAddress: components.TokenAddress,
    StatsSupplyChart,
    SwapChart: lazyComponent(Components.SwapChart),
  },
})
export default class AssetOwner extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @state.dashboard.selectedOwnedAsset asset!: OwnedAsset;
  @mutation.dashboard.resetSelectedOwnedAsset private reset!: FnWithoutArgs;

  private supply: CodecString = '0';
  private supplySubscription: Nullable<Subscription> = null;
  private balance: Nullable<AccountBalance> = null;
  private balanceSubscription: Nullable<Subscription> = null;

  get formattedBalance(): string {
    if (!this.balance) return '0';
    return this.formatCodecNumber(this.balance.transferable, this.asset.decimals);
  }

  get fiatBalance(): Nullable<string> {
    if (!this.balance) return '0';
    return this.getFiatAmountByCodecString(this.balance.transferable, this.asset);
  }

  get formattedSupply(): string {
    if (!this.supply) return '0';
    return this.formatCodecNumber(this.supply, this.asset.decimals);
  }

  get fiatSupply(): Nullable<string> {
    if (!this.supply) return '0';
    return this.getFiatAmountByCodecString(this.supply, this.asset);
  }

  get isAddLiquidityDisabled(): boolean {
    return !this.asset.decimals;
  }

  get hasFixedSupply(): boolean {
    return true;
  }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn || !this.asset) {
        router.push({ name: PageNames.AssetOwner });
        return;
      }
      console.log(this.asset);
      this.balanceSubscription = api.assets.getAssetBalanceObservable(this.asset).subscribe((balance) => {
        this.balance = balance;
      });
      this.supplySubscription = api.apiRx.query.tokens.totalIssuance(this.asset.address).subscribe((supply) => {
        this.supply = supply.toString();
      });
    });
  }

  handleBack(): void {
    router.back();
  }

  goToAddLiquidity(): void {
    router.push({ name: PageNames.AddLiquidity, params: { first: XOR.symbol, second: this.asset.address } });
  }

  beforeDestroy(): void {
    this.balanceSubscription?.unsubscribe?.();
    this.supplySubscription?.unsubscribe?.();
    this.reset();
  }
}
</script>

<style lang="scss" scoped>
.asset-owner-details-container {
  .asset {
    &__primary-col {
      margin-left: 16px;
      flex: 1;
    }
    &__secondary-col {
      margin-left: 24px;
      margin-right: 32px;
    }
  }
}
</style>
