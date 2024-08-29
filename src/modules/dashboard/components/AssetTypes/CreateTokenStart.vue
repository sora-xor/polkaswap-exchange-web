<template>
  <wallet-base :title="t('createToken.titleCommon')" @back="handleBack" show-back>
    <div class="create-token">
      <s-tabs class="token__tab" type="rounded" :value="type" @input="handleChangeTab">
        <s-tab
          v-for="tab in AssetType"
          :key="tab"
          :name="tab"
          :label="getTabName(tab)"
          :disabled="isTabDisabled(tab)"
        />
      </s-tabs>
      <guide-regular v-if="type === AssetType.CreateRegularToken" />
      <guide-nft v-else-if="type === AssetType.CreateNftToken" />
      <guide-sbt v-else-if="type === AssetType.CreateSbtToken" />
      <s-button type="primary" class="create-token__btn-start" @click="startCreation(type)">{{
        `Let's start`
      }}</s-button>
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import router from '@/router';

import GuideNft from '../guides/Nft.vue';
import GuideRegular from '../guides/Regular.vue';
import GuideSbt from '../guides/Sbt.vue';

export enum AssetType {
  CreateRegularToken = 'CreateRegularToken',
  CreateNftToken = 'CreateNftToken',
  CreateSbtToken = 'CreateSbtToken',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    GuideRegular,
    GuideNft,
    GuideSbt,
  },
})
export default class CreateToken extends Mixins(mixins.TranslationMixin) {
  readonly AssetType = AssetType;
  type = AssetType.CreateRegularToken;

  isTabDisabled(tab): boolean {
    return tab === AssetType.CreateNftToken;
  }

  handleBack(): void {
    router.push({ name: DashboardPageNames.AssetOwner });
  }

  getTabName(tab: AssetType): string {
    if (tab === AssetType.CreateNftToken) {
      return this.TranslationConsts.NFT;
    }

    if (tab === AssetType.CreateSbtToken) {
      return 'SBT'; // this.TranslationConsts.SBT
    }

    return 'Token';
  }

  handleChangeTab(value: AssetType): void {
    this.type = value;
  }

  startCreation(type: AssetType): void {
    this.$emit('select-type', type);
  }
}
</script>

<style lang="scss">
.create-token {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }

  &__btn-start {
    font-size: var(--s-font-size-big);
    width: 100%;
  }

  // TODO: remove
  // disable NFT tab while it's not working
  .el-tabs__item.is-top.is-disabled {
    color: var(--s-color-base-content-tertiary) !important;

    &:hover {
      cursor: not-allowed;
    }
  }
}
</style>
