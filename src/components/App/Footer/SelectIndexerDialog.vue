<template>
  <dialog-base :visible.sync="visibility" :title="t('selectIndexerDialog.title')" class="select-indexer-dialog">
    <select-indexer v-model="connectedIndexerAddress" :indexers="indexerList" :environment="soraNetwork" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { Indexer } from '@/types/indexers';
import { getter, state, mutation } from '@/store/decorators';
import TranslationMixin from '@/components/mixins/TranslationMixin';

const IndexerListView = 'IndexerListView';
const IndexerInfoView = 'IndexerInfoView';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SelectIndexer: lazyComponent(Components.SelectIndexer),
    IndexerInfo: lazyComponent(Components.IndexerInfo),
  },
})
export default class SelectIndexerDialog extends Mixins(TranslationMixin, mixins.NotificationMixin) {
  @state.settings.indexer indexer!: Partial<Indexer>;
  @state.settings.selectIndexerDialogVisibility private selectIndexerDialogVisibility!: boolean;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.settings.indexerList indexerList!: Array<Indexer>;

  @mutation.settings.setSelectIndexerDialogVisibility setSelectIndexerDialogVisibility!: (flag: boolean) => void;
  @mutation.settings.setIndexer setIndexer!: (indexer: Indexer) => void;

  currentView = IndexerListView;

  get visibility(): boolean {
    return this.selectIndexerDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectIndexerDialogVisibility(flag);
    if (!flag) {
      this.handleBack();
    }
  }

  get connectedIndexerAddress(): string {
    return this.indexer?.address ?? '';
  }

  set connectedIndexerAddress(address: string) {
    if (address === this.indexer.address) return;

    const indexer = this.findIndexerInListByAddress(address);

    this.handleIndexer(indexer);
  }

  handleIndexer(indexer: Indexer): void {
    this.setIndexer(indexer);

    if (this.indexer.address === indexer.address && this.currentView === IndexerInfoView) {
      this.handleBack();
    }
  }

  handleBack(): void {
    this.changeView(IndexerListView);
  }

  private changeView(view: string): void {
    this.currentView = view;
  }

  private findInList(list: Indexer[], address: string): any {
    return list.find((item) => item.address === address);
  }

  private findIndexerInListByAddress(address: string): any {
    return this.findInList(this.indexerList, address);
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-indexer-dialog {
  &--add-indexer {
    .el-dialog {
      .el-dialog__header {
        padding: 0;
        display: none;
      }
    }
  }
}
</style>
