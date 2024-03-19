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
          <p class="p3">Your vault</p>
          <div class="asset-title s-flex">
            <div class="asset-title__text s-flex-column">
              <h3 class="asset-title__name">{{ vault.id }}</h3>
              <token-address :address="vault.lockedAssetId" symbol="ANY" />
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
            <s-button class="s-typography-button--small" size="small" @click="openRemoveVaultDialog">
              <s-icon name="finance-send-24" size="16" />
              Remove
            </s-button>
          </div>
        </s-card>
        <s-card class="details-card" border-radius="small" shadow="always" size="big" primary>
          <div class="asset-supply s-flex">
            <div class="asset-supply__info">
              <h4>{{ vault.id }} asset supply</h4>
              <formatted-amount
                class="asset__value"
                :value="formattedSupply"
                :font-size-rate="FontSizeRate.MEDIUM"
                :font-weight-rate="FontWeightRate.MEDIUM"
              />
              <formatted-amount v-if="fiatSupply" is-fiat-value :value="fiatSupply" />
            </div>
            <s-button class="s-typography-button--small" type="primary" size="small" :disabled="true">
              <s-icon name="basic-drop-24" size="16" />
              Add liquidity
            </s-button>
          </div>
          <s-divider />
          <div class="asset-supply-actions">
            <s-button class="s-typography-button--small" size="small" :disabled="true">
              <s-icon name="printer-16" size="16" />
              Mint more
            </s-button>
            <s-button class="s-typography-button--small" size="small" :disabled="true">
              <s-icon name="basic-flame-24" size="16" />
              Burn
            </s-button>
          </div>
          <p v-if="true" class="p3">Adding liquidity is not available because the asset is non-divisible.</p>
          <p v-if="false" class="p3">Minting the asset is unavailable because it is not extensible.</p>
        </s-card>
        <div class="details-card">SOME DATA 1</div>
      </s-col>
      <s-col :xs="12" :sm="12" :md="7" :lg="7">
        <div class="details-card">SOME DATA 2</div>
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
    <remove-vault-dialog :visible.sync="showRemoveVaultDialog" />
  </div>
  <div v-else class="asset-owner-details-container empty" />
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames, Components, ZeroStringValue, BreakpointClass } from '@/consts';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { VaultComponents, VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import router from '@/router';
import { getter, state } from '@/store/decorators';
import { waitUntil } from '@/utils';

import type { CodecString } from '@sora-substrate/util';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';
import type { Subscription } from 'rxjs';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    TokenAddress: components.TokenAddress,
    RemoveVaultDialog: vaultLazyComponent(VaultComponents.RemoveVaultDialog),
  },
})
export default class VaultDetails extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  // @state.settings.screenBreakpointClass private responsiveClass!: BreakpointClass;
  // @getter.dashboard.ownedAssets private assets!: OwnedAsset[];
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @state.vault.accountVaults private accountVaults!: Vault[];

  // private supply: CodecString = ZeroStringValue;
  // private supplySubscription: Nullable<Subscription> = null;
  // private balanceSubscription: Nullable<Subscription> = null;

  // balance: CodecString = ZeroStringValue;

  showRemoveVaultDialog = false;

  /** To force re-render component(s). Currently, it should be applied to charts */
  // getForceRerenderKey(name: string): string {
  //   return `${name}-${this.responsiveClass}`;
  // }

  get vault(): Nullable<Vault> {
    const vaultId = this.$route.params.vault;
    if (!vaultId) return null;
    return this.accountVaults.find(({ id }) => id === +vaultId);
  }

  // get formattedBalance(): string {
  //   if (!this.balance) return '0';
  //   return this.formatCodecNumber(this.balance, this.asset?.decimals);
  // }

  // get fiatBalance(): Nullable<string> {
  //   if (!(this.asset && this.balance)) return ZeroStringValue;
  //   return this.getFiatAmountByCodecString(this.balance, this.asset);
  // }

  // get hasFiat(): boolean {
  //   return !!this.fiatBalance;
  // }

  // get formattedSupply(): string {
  //   if (!this.supply) return ZeroStringValue;
  //   return this.formatCodecNumber(this.supply, this.asset?.decimals);
  // }

  // get fiatSupply(): Nullable<string> {
  //   if (!(this.asset && this.supply)) return ZeroStringValue;
  //   return this.getFiatAmountByCodecString(this.supply, this.asset);
  // }

  mounted(): void {
    this.withApi(async () => {
      if (!this.isLoggedIn) {
        router.push({ name: VaultPageNames.Vaults });
        return;
      }

      await waitUntil(() => !this.parentLoading);
      if (!this.vault) {
        router.push({ name: VaultPageNames.Vaults });
        // return;
      }

      // this.balanceSubscription = api.assets.getAssetBalanceObservable(this.asset).subscribe((balance) => {
      //   this.balance = balance.transferable;
      // });
      // this.supplySubscription = api.apiRx.query.tokens.totalIssuance(this.asset.address).subscribe((supply) => {
      //   this.supply = supply.toString();
      // });
    });
  }

  handleBack(): void {
    router.back();
  }

  openRemoveVaultDialog(): void {
    this.showRemoveVaultDialog = true;
  }

  // goToAddLiquidity(): void {
  //   if (!this.asset) return;
  //   router.push({ name: PageNames.AddLiquidity, params: { first: XOR.symbol, second: this.asset.address } });
  // }

  beforeDestroy(): void {
    // this.balanceSubscription?.unsubscribe?.();
    // this.supplySubscription?.unsubscribe?.();
  }
}
</script>

<style lang="scss" scoped>
.asset-owner-details {
  &-container {
    display: flex;
    gap: 16px;

    &.empty {
      height: calc(100vh - #{$header-height} - #{$footer-height});
    }

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
