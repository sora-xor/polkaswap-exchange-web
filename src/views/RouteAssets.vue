<template>
  <div class="route-assets">
    <component :is="component" @onUploadCSV="onUploadCSV" @toUploadPage="toUploadPage"></component>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, action, mutation } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Subscription } from 'rxjs';
import { PrimaryMarketsEnabledAssets } from '@sora-substrate/liquidity-proxy';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    RoutingTemplate: lazyComponent(Components.RoutingTemplate),
    UploadCsv: lazyComponent(Components.UploadCSV),
  },
})
export default class RouteAssets extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @action.routeAssets.updateRecipients private updateRecipients!: (file?: File) => void;
  @getter.routeAssets.isDataExisting private isDataExisting!: boolean;
  @mutation.swap.setPrimaryMarketsEnabledAssets private setEnabledAssets!: (args: PrimaryMarketsEnabledAssets) => void;

  enabledAssetsSubscription: Nullable<Subscription> = null;

  private subscribeOnEnabledAssets(): void {
    this.cleanEnabledAssetsSubscription();
    this.enabledAssetsSubscription = api.swap.subscribeOnPrimaryMarketsEnabledAssets().subscribe(this.setEnabledAssets);
  }

  private cleanEnabledAssetsSubscription(): void {
    this.enabledAssetsSubscription?.unsubscribe();
    this.enabledAssetsSubscription = null;
  }

  created() {
    this.withApi(async () => {
      this.subscribeOnEnabledAssets();
    });
  }

  beforeDestroy(): void {
    this.cleanEnabledAssetsSubscription();
  }

  toUploadPage() {
    this.updateRecipients();
  }

  onUploadCSV(file) {
    this.updateRecipients(file);
  }

  get component() {
    return this.isDataExisting ? 'RoutingTemplate' : 'UploadCsv';
  }
}
</script>

<style lang="scss">
.route-assets {
  max-width: 988px;
  margin: 0 auto 16px;
  .container {
    max-width: none;
  }
}
</style>
