<template>
  <div class="add-asset-details">
    <s-scrollbar class="asset-list-scrollbar" :style="{ height }">
      <div class="asset-list-container">
        <div v-for="asset in selectAssets" :key="asset.address">
          <s-card shadow="always" size="small" border-radius="mini">
            <asset-list-item :asset="asset" :pinnable="false">
              <template #append>
                <s-card size="mini" :status="assetCardStatus(asset)" primary>
                  <div class="asset-nature">{{ assetNatureText(asset) }}</div>
                </s-card>
              </template>
            </asset-list-item>
          </s-card>
        </div>
      </div>
    </s-scrollbar>
    <!-- Other elements remain unchanged -->
    <s-card status="warning" :primary="isCardPrimary" shadow="always" class="add-asset-details_text">
      <div class="p2">{{ t('addAsset.warningTitle') }}</div>
      <div class="warning-text p4">
        {{ warningMessage }}
      </div>
    </s-card>
    <div class="add-asset-details_confirm">
      <s-switch v-model="isConfirmed" :disabled="loading"></s-switch>
      <span>{{ t('addAsset.understand') }}</span>
    </div>
    <s-button
      class="add-asset-details_action s-typography-button--large"
      type="primary"
      :disabled="!selectAssets.length || !isConfirmed || loading"
      @click="handleAddAssets"
    >
      {{ tc('addAssetsText', selectAssets.length) }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

import { Theme } from '@/consts';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import { getCssVariableValue } from '../../util';
import AssetListItem from '../AssetListItem.vue';
import AddAssetMixin from '../mixins/AddAssetMixin';
import LoadingMixin from '../mixins/LoadingMixin';
import TranslationMixin from '../mixins/TranslationMixin';

import type { WhitelistIdsBySymbol } from '../../types/common';
import type { Asset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  components: {
    AssetListItem,
  },
  mixins: [TranslationMixin, LoadingMixin, AddAssetMixin],
  props: {
    selectAssets: {
      required: true,
      type: Array as PropType<Asset[]>,
    },
    theme: {
      default: Theme.Light,
      type: String as PropType<Theme>,
    },
    assetTypeKey: {
      required: true,
      type: String,
    },
  },
  emits: ['add'],
  data() {
    return {
      isConfirmed: false,
    };
  },
  computed: {
    whitelist(this: any) {
      return useWalletStore(this.$pinia).whitelist;
    },
    whitelistIdsBySymbol(this: any) {
      return useWalletStore(this.$pinia).whitelistIdsBySymbol;
    },
    isCardPrimary(this: any): boolean {
      return this.theme !== Theme.Dark;
    },
    height(this: any): string {
      const itemHeight = parseFloat(getCssVariableValue('--s-asset-item-height--fiat'));
      const itemHeightFixed = itemHeight + 1; // card is bigger on 1px
      const gutter = 16;
      const count = this.selectAssets.length;
      const size = Math.min(count, 2);
      const preview = Number(size < count) * (gutter + itemHeight / 2);
      const height = itemHeightFixed * size + gutter * (size - 1) + preview;

      return `${height}px`;
    },
    warningMessage(this: any): string {
      const assetType = this.tc(`addAsset.assetType.${this.assetTypeKey}`, 1);
      const assetTypePlural = this.tc(`addAsset.assetType.${this.assetTypeKey}`, this.selectAssets.length);
      const purchaseAssetType =
        this.selectAssets.length === 1
          ? this.tc('addAsset.warningMessage', 1, { assetType })
          : this.tc('addAsset.warningMessage', this.selectAssets.length, { assetTypePlural });

      return this.tc('addAsset.warningMessageText', this.selectAssets.length, {
        assetType,
        assetTypePlural,
        purchaseAssetType,
      });
    },
  },
  methods: {
    isWhitelist(this: any, asset: Asset): boolean {
      return api.assets.isWhitelist(asset, this.whitelist as Whitelist);
    },
    isBlacklist(this: any, asset: Asset): boolean {
      return api.assets.isBlacklist(asset, this.whitelistIdsBySymbol as WhitelistIdsBySymbol);
    },
    assetCardStatus(this: any, asset: Asset): string {
      return this.isWhitelist(asset) ? 'success' : 'error';
    },
    assetNatureText(this: any, asset: Asset): string {
      const isWhitelist = this.isWhitelist(asset);
      const isBlacklist = this.isBlacklist(asset);

      if (isWhitelist) {
        return this.t('addAsset.approved');
      }
      if (isBlacklist) {
        return this.t('addAsset.scam');
      }

      return this.t('addAsset.unknown');
    },
    async handleAddAssets(this: any): Promise<void> {
      this.$emit('add');
      this.selectAssets.forEach((asset: Asset) => {
        this.addAccountAsset(asset);
      });
    },
  },
});
</script>

<style lang="scss">
.asset-list-scrollbar {
  @include scrollbar($basic-spacing-big);
  .el-scrollbar__wrap {
    overflow-x: unset;
  }
}
</style>

<style scoped lang="scss">
.add-asset-details {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-medium;

  .asset-nature {
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
  }

  &_confirm {
    @include switch-block;

    & {
      padding-top: 0;
      padding-bottom: 0;
    }
  }
  &_action {
    width: 100%;
  }
  &_text {
    color: var(--s-color-status-warning);
  }

  .asset-list-container {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing-medium;
  }
}
</style>
