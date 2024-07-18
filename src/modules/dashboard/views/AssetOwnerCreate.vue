<template>
  <div>
    <create-token-start v-if="showIntroPage" @select-type="selectType" />
    <div v-else>
      <create-regular-token v-if="type === AssetType.CreateRegularToken" @go-back="showIntroPage = true" />
      <create-nft-token v-else-if="type === AssetType.CreateNftToken" @go-back="showIntroPage = true" />
      <create-sbt-token v-else-if="type === AssetType.CreateSbtToken" />
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { DashboardComponents, DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyComponent, dashboardLazyView } from '@/modules/dashboard/router';
import router from '@/router';

export enum AssetType {
  CreateRegularToken = 'CreateRegularToken',
  CreateNftToken = 'CreateNftToken',
  CreateSbtToken = 'CreateSbtToken',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    CreateTokenStart: dashboardLazyComponent(DashboardComponents.CreateTokenStart),
    CreateRegularToken: dashboardLazyComponent(DashboardComponents.CreateRegularToken),
    CreateNftToken: dashboardLazyComponent(DashboardComponents.CreateNftToken),
    CreateSbtToken: dashboardLazyComponent(DashboardComponents.CreateSbtToken),
  },
})
export default class CreateToken extends Mixins(mixins.TranslationMixin) {
  readonly AssetType = AssetType;

  type = AssetType.CreateRegularToken;
  showIntroPage = true;

  selectType(type: AssetType): void {
    this.type = type;
    this.showIntroPage = false;
  }
}
</script>

<style lang="scss">
.create-token {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}
</style>
