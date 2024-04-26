<template>
  <div @click="openCurrencyDialog" class="notif-option el-dropdown-menu__item header-menu__item">
    <div class="icon-currency-wrapper">
      <span class="symbol">{{ symbol }}</span>
    </div>
    <span class="notif-option__text">{{ 'Select currency' }}</span>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import { getter, mutation, state } from '@/store/decorators';

import type { Currency, CurrencyFields } from '@soramitsu/soraneo-wallet-web/lib/types/currency';

@Component
export default class CurrencyOption extends Vue {
  @state.wallet.settings.currency currency!: Currency;
  @state.wallet.settings.currencies currencies!: Array<CurrencyFields>;

  @getter.wallet.settings.currencySymbol private currencySymbol!: string;

  @mutation.settings.setSelectCurrencyDialogVisibility private setCurrencyDialogVisibility!: (flag: boolean) => void;

  get symbol(): string | undefined {
    return this.currencySymbol;
  }

  openCurrencyDialog(): void {
    this.setCurrencyDialogVisibility(true);
  }
}
</script>

<style lang="scss">
.icon-currency-wrapper {
  width: 28px;
  height: 28px;
  background-color: var(--s-color-base-content-tertiary);
  color: white;
  border-radius: 50%;
  margin-right: 4px;

  .symbol {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: -6px;
    font-size: 12px;
  }
}
.notif-option {
  display: flex;
  $icon-size: 28px;

  &__bell {
    width: $icon-size;
    height: $icon-size;
    margin: auto 0;
    fill: var(--s-color-base-content-tertiary);

    &--dropdown {
      margin-top: $inner-spacing-mini;
      margin-right: $basic-spacing-mini;
    }
  }

  &:hover {
    .icon-currency-wrapper {
      background-color: var(--s-color-base-content-secondary);
    }
  }
}
</style>
