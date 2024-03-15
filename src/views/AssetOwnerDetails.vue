<template>
  <div v-if="asset" class="asset-owner-details-container">
    <s-button
      class="asset-owner-details-back"
      type="action"
      size="small"
      alternative
      :tooltip="t('assets.details')"
      @click="handleBack"
    >
      <s-icon name="arrows-chevron-left-rounded-24" size="24" />
    </s-button>
    <s-row class="asset-owner-details-main" :gutter="20">
      <s-col :xs="12" :sm="12" :md="5" :lg="5">
        <s-card class="asset details-card" border-radius="small" shadow="always" size="big" primary>
          <p class="p3">Your asset</p>
          <div class="asset-title s-flex">
            <div class="asset-title__text s-flex-column">
              <h3 class="asset-title__name">{{ asset.name }}</h3>
              <token-address :address="asset.address" :symbol="asset.symbol" />
            </div>
            <token-logo class="asset-title__icon" size="big" :token="asset" />
          </div>
          <s-divider />
          <div class="asset-balance s-flex">
            <div class="asset-balance__info">
              <p class="p3">Your balance</p>
              <formatted-amount
                class="asset__value"
                value-can-be-hidden
                :value="formattedBalance"
                :font-size-rate="FontSizeRate.MEDIUM"
                :font-weight-rate="FontWeightRate.MEDIUM"
              />
              <formatted-amount v-if="fiatBalance" is-fiat-value value-can-be-hidden :value="fiatBalance" />
            </div>
            <s-button class="s-typography-button--small" size="small" @click="openSendDialog">
              <s-icon name="finance-send-24" size="16" />
              Send
            </s-button>
          </div>
        </s-card>
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="asset-supply s-flex">
            <div class="asset-supply__info">
              <h4>{{ asset.symbol }} asset supply</h4>
              <formatted-amount
                class="asset__value"
                :value="formattedSupply"
                :font-size-rate="FontSizeRate.MEDIUM"
                :font-weight-rate="FontWeightRate.MEDIUM"
              />
              <formatted-amount v-if="fiatSupply" is-fiat-value :value="fiatSupply" />
            </div>
            <s-button
              class="s-typography-button--small"
              type="primary"
              size="small"
              :disabled="isAddLiquidityDisabled"
              @click="goToAddLiquidity"
            >
              <s-icon name="basic-drop-24" size="16" />
              Add liquidity
            </s-button>
          </div>
          <s-divider />
          <div class="asset-supply-actions">
            <s-button
              class="s-typography-button--small"
              size="small"
              :disabled="hasFixedSupply"
              @click="openMintDialog"
            >
              <s-icon name="printer-16" size="16" />
              Mint more
            </s-button>
            <s-button class="s-typography-button--small" size="small" @click="openBurnDialog">
              <s-icon name="basic-flame-24" size="16" />
              Burn
            </s-button>
          </div>
          <p v-if="isAddLiquidityDisabled" class="p3">
            Adding liquidity is not available because the asset is non-divisible.
          </p>
          <p v-if="hasFixedSupply" class="p3">Minting the asset is unavailable because it is not extensible.</p>
        </s-card>
        <stats-supply-chart class="details-card" :predefined-token="asset" />
      </s-col>
      <s-col :xs="12" :sm="12" :md="7" :lg="7">
        <swap-chart class="details-card" :base-asset="asset" :is-available="true" />
        <s-row :gutter="20">
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                HOLDERS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                TOTAL TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                MINTED
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                MINT TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                BURNED
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
          <s-col :xs="6" :sm="6" :md="6" :lg="4">
            <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
              <p class="p3 asset-stats-card__title">
                BURN TXNS
                <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
                  <s-icon name="info-16" size="14px" />
                </s-tooltip>
              </p>
              <div class="asset-stats-card__value">N/A</div>
            </s-card>
          </s-col>
        </s-row>
      </s-col>
    </s-row>
    <mint-dialog :visible.sync="showMintDialog" :editable-fiat="hasFiat" />
    <burn-dialog :visible.sync="showBurnDialog" :balance="balance" :editable-fiat="hasFiat" />
    <send-dialog :visible.sync="showSendDialog" :balance="balance" :editable-fiat="hasFiat" />
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import StatsSupplyChart from '@/components/pages/Stats/SupplyChart.vue';
import { PageNames, Components, ZeroStringValue } from '@/consts';
import { DashboardComponents } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import type { OwnedAsset } from '@/modules/dashboard/types';
import router, { lazyComponent } from '@/router';
import { mutation, getter, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    TokenAddress: components.TokenAddress,
    StatsSupplyChart,
    SwapChart: lazyComponent(Components.SwapChart),
    MintDialog: dashboardLazyComponent(DashboardComponents.MintDialog),
    BurnDialog: dashboardLazyComponent(DashboardComponents.BurnDialog),
    SendDialog: dashboardLazyComponent(DashboardComponents.SendTokenDialog),
  },
})
export default class AssetOwner extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @state.dashboard.selectedOwnedAsset asset!: OwnedAsset;
  @mutation.dashboard.resetSelectedOwnedAsset private reset!: FnWithoutArgs;

  private supply: CodecString = ZeroStringValue;
  private supplySubscription: Nullable<Subscription> = null;
  private balanceSubscription: Nullable<Subscription> = null;

  balance: CodecString = ZeroStringValue;
  showSendDialog = false;
  showBurnDialog = false;
  showMintDialog = false;

  get formattedBalance(): string {
    if (!this.balance) return '0';
    return this.formatCodecNumber(this.balance, this.asset.decimals);
  }

  get fiatBalance(): Nullable<string> {
    if (!this.balance) return ZeroStringValue;
    return this.getFiatAmountByCodecString(this.balance, this.asset);
  }

  get hasFiat(): boolean {
    return !!this.fiatBalance;
  }

  get formattedSupply(): string {
    if (!this.supply) return ZeroStringValue;
    return this.formatCodecNumber(this.supply, this.asset.decimals);
  }

  get fiatSupply(): Nullable<string> {
    if (!this.supply) return ZeroStringValue;
    return this.getFiatAmountByCodecString(this.supply, this.asset);
  }

  get isAddLiquidityDisabled(): boolean {
    return !this.asset.decimals;
  }

  get hasFixedSupply(): boolean {
    return !this.asset.isMintable;
  }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn || !this.asset) {
        router.push({ name: PageNames.AssetOwner });
        return;
      }
      this.balanceSubscription = api.assets.getAssetBalanceObservable(this.asset).subscribe((balance) => {
        this.balance = balance.transferable;
      });
      this.supplySubscription = api.apiRx.query.tokens.totalIssuance(this.asset.address).subscribe((supply) => {
        this.supply = supply.toString();
      });
    });
  }

  handleBack(): void {
    router.back();
  }

  openSendDialog(): void {
    this.showSendDialog = true;
  }

  openMintDialog(): void {
    this.showMintDialog = true;
  }

  openBurnDialog(): void {
    this.showBurnDialog = true;
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
.asset-owner-details {
  &-container {
    display: flex;
    gap: 16px;

    .details-card {
      margin-bottom: 24px;
    }
  }
}
.asset-title,
.asset-balance,
.asset-supply {
  align-items: center;
}
.asset-title__text,
.asset-balance__info,
.asset-supply__info {
  flex: 1;
}
.asset__value {
  font-size: 20px;
}
.asset-supply-actions {
  margin-bottom: 8px;
}
</style>
