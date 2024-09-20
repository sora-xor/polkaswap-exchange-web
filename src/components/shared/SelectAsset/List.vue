<template>
  <asset-list :assets="assets" v-bind="$attrs" v-on="$listeners" class="asset-select-list" data-test-name="selectToken">
    <template #list-empty>
      <div class="asset-select-list__empty">
        <span class="empty-results-icon" />
        {{ t('selectToken.emptyListMessage') }}
      </div>
    </template>

    <template #default="token">
      <div v-if="connected" class="asset__balance-container">
        <button
          @click.stop="togglePinnedAsset(token)"
          class="pin-button"
          :title="isAssetPinned(token) ? t('Unpin Asset') : t('Pin Asset')"
        >
          <p>{{ token && isAssetPinned(token) ? 'unpin' : 'pin' }}</p>
        </button>
        <formatted-amount-with-fiat-value
          v-if="formatBalance(token) !== FormattedZeroSymbol"
          value-class="asset__balance"
          value-can-be-hidden
          :value="formatBalance(token)"
          :font-size-rate="FontSizeRate.MEDIUM"
          :has-fiat-value="shouldFiatBeShown(token)"
          :fiat-value="getFiatBalance(token)"
          :fiat-font-size-rate="FontSizeRate.MEDIUM"
          :fiat-font-weight-rate="FontWeightRate.MEDIUM"
        />
        <span v-else class="asset__balance">
          {{ shouldBalanceBeHidden ? HiddenValue : FormattedZeroSymbol }}
        </span>
      </div>
      <slot name="action" v-bind="token" />
    </template>
  </asset-list>
</template>

<script lang="ts">
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { formatAssetBalance } from '@/utils';
import { settingsStorage } from '@/utils/storage';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    AssetList: components.AssetList,
  },
})
export default class SelectAssetList extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  @Prop({ default: () => [], type: Array }) readonly assets!: AccountAsset;
  @Prop({ default: false, type: Boolean }) readonly connected!: boolean;
  @Prop({ default: false, type: Boolean }) readonly shouldBalanceBeHidden!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;

  readonly FormattedZeroSymbol = '-';
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly HiddenValue = WALLET_CONSTS.HiddenValue;

  pinnedAssetsAddresses: string[] = [];
  created() {
    this.loadPinnedAssetsAddresses();
  }

  // Method to load pinned assets from settingsStorage
  loadPinnedAssetsAddresses() {
    const pinnedAssetsAddressesStr = settingsStorage.get('pinnedAssets');
    console.info('we are in loadPinnedAssetsAddresses');
    console.info(typeof pinnedAssetsAddressesStr);

    try {
      const parsed = JSON.parse(pinnedAssetsAddressesStr);
      if (Array.isArray(parsed)) {
        this.pinnedAssetsAddresses = parsed;
      } else {
        this.pinnedAssetsAddresses = [];
      }
    } catch (e) {
      // Parsing failed, set to empty array
      this.pinnedAssetsAddresses = [];
    }
  }

  // Method to check if an asset is pinned
  isAssetPinned(asset: AccountAsset): boolean {
    return this.pinnedAssetsAddresses.includes(asset.address);
  }

  // Method to toggle the pinned status of an asset
  togglePinnedAsset(asset: AccountAsset): void {
    if (this.isAssetPinned(asset)) {
      this.removePinnedAsset(asset);
    } else {
      this.setPinnedAsset(asset);
    }
    this.$emit('pinnedAssetsChanged');
  }

  // Method to pin an asset
  setPinnedAsset(pinnedAccountAsset: AccountAsset): void {
    const assetAddress = pinnedAccountAsset.address;
    this.pinnedAssetsAddresses.push(assetAddress);
    settingsStorage.set('pinnedAssets', JSON.stringify(this.pinnedAssetsAddresses));
  }

  // Method to unpin an asset
  removePinnedAsset(pinnedAccountAsset: AccountAsset): void {
    this.pinnedAssetsAddresses = this.pinnedAssetsAddresses.filter((address) => address !== pinnedAccountAsset.address);
    settingsStorage.set('pinnedAssets', JSON.stringify(this.pinnedAssetsAddresses));
  }

  formatBalance(token: AccountAsset): string {
    return formatAssetBalance(token, {
      internal: this.isSoraToEvm,
      showZeroBalance: false,
      formattedZero: this.FormattedZeroSymbol,
    });
  }

  shouldFiatBeShown(asset: AccountAsset): boolean {
    return !!this.isSoraToEvm && !!this.getAssetFiatPrice(asset);
  }
}
</script>

<style lang="scss">
.asset-select-list {
  .asset {
    cursor: pointer;
    padding: 0 $inner-spacing-big;
    transition: var(--s-transition-default);

    @include focus-outline($withOffset: true);

    &:hover {
      background-color: var(--s-color-base-background-hover);
    }

    &__balance {
      line-height: var(--s-line-height-small);
      font-weight: 800;
    }

    &__balance-container {
      text-align: right;

      .formatted-amount__container {
        flex-direction: column;
        align-items: flex-end;
      }
    }
    .formatted-amount {
      display: block;
      width: 100%;
      &__integer {
        font-size: var(--s-font-size-big);
        font-weight: 800;
      }
      &__decimal {
        font-weight: 600;
      }
      &.formatted-amount--fiat-value {
        line-height: var(--s-line-height-reset);
        word-break: break-all;
        .formatted-amount__integer {
          font-size: var(--s-font-size-small);
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.asset-select-list {
  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    color: var(--s-color-base-content-tertiary);
    line-height: var(--s-line-height-big);
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url('~@/assets/img/no-results.svg') center no-repeat;
  }
}
</style>
