<template>
  <dialog-base :visible.sync="visibility" :title="t('selectLanguageDialog.title')" class="select-currency-dialog">
    <search-input
      ref="search"
      v-model="query"
      class="select-currency__search"
      autofocus
      :placeholder="'Search by currency name or symbol'"
      @clear="handleClearSearch"
    />
    <s-scrollbar class="select-currency-scrollbar">
      <s-radio-group v-model="selectedCurrency" class="select-currency-list s-flex">
        <s-radio
          v-for="currency in filteredCurrencies"
          :key="currency.key"
          :label="currency.key"
          :value="currency.key"
          :disabled="currency.disabled"
          size="medium"
          class="select-currency-list__item s-flex"
        >
          <div :ref="currency.key === selectedCurrency ? 'selectedEl' : undefined" class="select-currency-item s-flex">
            <div class="select-currency-item__value">
              {{ currency.name }}
            </div>
            <div class="select-currency-item__name">
              {{ currency.symbol }}
            </div>
          </div>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

import type { CurrencyFields } from '@soramitsu/soraneo-wallet-web/lib/types/currency';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
  },
})
export default class SelectCurrencyDialog extends Mixins(TranslationMixin) {
  @state.wallet.settings.currencies currencies!: Array<CurrencyFields>;

  query = '';

  @Ref('selectedEl') selectedEl!: Nullable<[HTMLDivElement]>;

  @state.settings.selectCurrencyDialogVisibility private selectCurrencyDialogVisibility!: boolean;
  @state.wallet.settings.currency private currency: any;

  @mutation.settings.setSelectCurrencyDialogVisibility private setDialogVisibility!: (flag: boolean) => void;
  @mutation.wallet.settings.setFiatCurrency private setCurrency!: (currency: any) => Promise<void>;

  get visibility(): boolean {
    return this.selectCurrencyDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setDialogVisibility(flag);
    if (flag) {
      this.$nextTick(() => {
        this.selectedEl?.[0]?.scrollIntoView?.({ behavior: 'smooth' });
      });
    }
  }

  get selectedCurrency(): any {
    return this.currency;
  }

  set selectedCurrency(value: any) {
    this.setCurrency(value);
  }

  get filteredCurrencies() {
    const currencies = this.currencies;

    if (this.query) {
      const query = this.query.toLowerCase().trim();
      return currencies.filter((item) => item.name.includes(query) || item.symbol.toLowerCase().includes(query));
    }

    return currencies;
  }

  public handleClearSearch(): void {
    this.query = '';
  }
}
</script>

<style lang="scss">
.dialog-wrapper.select-currency-dialog {
  .el-radio {
    margin-right: 0;
  }
}

.select-currency-scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$item-height: 66px;
$list-items: 7;

.select-currency-list {
  height: 600px;
  flex-direction: column;
  max-height: calc(#{$item-height} * #{$list-items});

  &__item {
    align-items: center;
    height: $item-height;
    padding: $inner-spacing-small $inner-spacing-big;
    border-radius: var(--s-border-radius-mini);
  }

  .select-currency-item {
    &__value {
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
      font-weight: 600;
    }
    &__name {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-medium);
      font-weight: 300;
    }
  }

  .select-currency-item {
    flex-direction: column;
  }
}

.select-currency__search {
  margin-bottom: $basic-spacing;
}
</style>
