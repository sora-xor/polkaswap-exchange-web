<template>
  <div class="route-assets">
    <router-view :csv="csvFile" @onUploadCSV="onUploadCSV"></router-view>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, action } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
})
export default class RouteAssets extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  //   @getter.templates.templates templates!: Array<Template>;
  //   @getter.templates.isLoading templatesAreLoading!: boolean;
  //   @action.templates.fetchTemplates private fetchTemplates!: AsyncVoidFn;
  //   @action.templates.updateTemplate private updateTemplate!: (model: Template) => Promise<void>;
  //   @action.templates.deleteTemplate private deleteTemplate!: (id: string) => AsyncVoidFn;

  csvFile = null;

  onUploadCSV(file) {
    this.csvFile = file;
    this.$router.push({ path: '/route-assets/routing-template' });
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
