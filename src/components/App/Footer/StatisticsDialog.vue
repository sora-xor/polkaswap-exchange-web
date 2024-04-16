<template>
  <dialog-base :visible.sync="visibility" :title="t('footer.statistics.dialog.title')" class="select-indexer-dialog">
    <select-indexer
      :indexer.sync="selectedIndexerType"
      :ceres.sync="useCeresApi"
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
import { action, state, mutation } from '@/store/decorators';
import { Indexer } from '@/types/indexers';
import { capitalize } from '@/utils';

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
  @state.settings.selectIndexerDialogVisibility private selectIndexerDialogVisibility!: boolean;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.settings.indexers private indexersData!: Record<WALLET_CONSTS.IndexerType, WALLET_TYPES.IndexerState>;
  @state.wallet.settings.indexerType indexerType!: Indexer['type'];
  @state.wallet.account.ceresFiatValuesUsage private ceresFiatValuesUsage!: boolean;

  @mutation.settings.setSelectIndexerDialogVisibility setSelectIndexerDialogVisibility!: (flag: boolean) => void;
  @action.wallet.settings.selectIndexer private selectIndexer!: (type: WALLET_CONSTS.IndexerType) => Promise<void>;
  @action.wallet.account.useCeresApiForFiatValues private useCeresApiForFiatValues!: (flag: boolean) => Promise<void>;

  currentView = IndexerListView;

  get indexers(): Indexer[] {
    return Object.keys(WALLET_CONSTS.IndexerType).map((key) => {
      const type = WALLET_CONSTS.IndexerType[key];
      return {
        name: capitalize(type),
        type,
        endpoint: this.indexersData[type].endpoint,
        online: this.indexersData[type].status === WALLET_TYPES.ConnectionStatus.Available,
      };
    });
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
    return this.ceresFiatValuesUsage;
  }

  set useCeresApi(flag: boolean) {
    this.useCeresApiForFiatValues(flag);
  }

  get selectedIndexerType(): WALLET_CONSTS.IndexerType {
    return this.indexerType ?? '';
  }

  set selectedIndexerType(type: WALLET_CONSTS.IndexerType) {
    if (type === this.indexerType) return;

    const indexer = this.findIndexerInListByType(type);

    this.handleIndexer(indexer);
  }

  async handleIndexer(indexer: Indexer): Promise<void> {
    await this.selectIndexer(indexer.type);

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
