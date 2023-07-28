<template>
  <dialog-base :visible.sync="visibility" :title="t('footer.statistics.dialog.title')" class="select-indexer-dialog">
    <statistics
      v-model="selectedIndexerType"
      :ceres-api="useCeresApi"
      :indexers="indexers"
      :environment="soraNetwork"
    />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, mutation } from '@/store/decorators';
import { Indexer } from '@/types/indexers';

const IndexerListView = 'IndexerListView';
const IndexerInfoView = 'IndexerInfoView';

@Component({
  components: {
    DialogBase: components.DialogBase,
    Statistics: lazyComponent(Components.Statistics),
    IndexerInfo: lazyComponent(Components.IndexerInfo),
  },
})
export default class SelectIndexerDialog extends Mixins(TranslationMixin, mixins.NotificationMixin) {
  @state.settings.selectIndexerDialogVisibility private selectIndexerDialogVisibility!: boolean;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.settings.subqueryEndpoint subqueryEndpoint!: Indexer['endpoint'];
  @state.wallet.settings.subsquidEndpoint subsquidEndpoint!: Indexer['endpoint'];
  @state.wallet.settings.subqueryStatus private subqueryStatus!: WALLET_TYPES.ConnectionStatus;
  @state.wallet.settings.subsquidStatus private subsquidStatus!: WALLET_TYPES.ConnectionStatus;
  @state.wallet.settings.indexerType indexerType!: Indexer['type'];

  @mutation.settings.setSelectIndexerDialogVisibility setSelectIndexerDialogVisibility!: (flag: boolean) => void;
  @mutation.wallet.settings.setIndexerType setIndexerType!: (type: WALLET_CONSTS.IndexerType) => void;

  currentView = IndexerListView;

  get isSubqueryOnline(): boolean {
    return this.subqueryStatus === WALLET_TYPES.ConnectionStatus.Available;
  }

  get isSubsquidOnline(): boolean {
    return this.subsquidStatus === WALLET_TYPES.ConnectionStatus.Available;
  }

  get indexers(): Indexer[] {
    return [
      {
        name: 'Subquery',
        type: WALLET_CONSTS.IndexerType.SUBQUERY,
        endpoint: this.subqueryEndpoint,
        online: this.isSubqueryOnline,
      },
      {
        name: 'Subsquid',
        type: WALLET_CONSTS.IndexerType.SUBSQUID,
        endpoint: this.subsquidEndpoint,
        online: this.isSubsquidOnline,
      },
    ];
  }

  get indexer(): Indexer {
    const indexer = this.indexers.find((indexer) => indexer.type === this.indexerType);
    if (!indexer) throw new Error('Unknown indexer type');
    return indexer;
  }

  get visibility(): boolean {
    return this.selectIndexerDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectIndexerDialogVisibility(flag);
    if (!flag) {
      this.handleBack();
    }
  }

  get useCeresApi(): boolean {
    return true;
  }

  get selectedIndexerType(): WALLET_CONSTS.IndexerType {
    return this.indexerType ?? '';
  }

  set selectedIndexerType(type: WALLET_CONSTS.IndexerType) {
    if (type === this.indexerType) return;

    const indexer = this.findIndexerInListByType(type);

    this.handleIndexer(indexer);
  }

  handleIndexer(indexer: Indexer): void {
    this.setIndexerType(indexer.type);

    if (this.indexer.type === indexer.type && this.currentView === IndexerInfoView) {
      this.handleBack();
    }
  }

  handleBack(): void {
    this.changeView(IndexerListView);
  }

  private changeView(view: string): void {
    this.currentView = view;
  }

  private findInList(list: Indexer[], type: string): any {
    return list.find((item) => item.type === type);
  }

  private findIndexerInListByType(type: WALLET_CONSTS.IndexerType): any {
    return this.findInList(this.indexers, type);
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
