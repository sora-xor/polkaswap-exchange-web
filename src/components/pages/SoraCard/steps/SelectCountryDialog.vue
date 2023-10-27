<template>
  <dialog-base :visible.sync="isVisible" class="select-country-dialog" :title="t('card.selectCountryText')">
    <search-input
      ref="search"
      v-model="query"
      class="select-country__search"
      autofocus
      :placeholder="t('card.filterCountries')"
      @clear="handleClearSearch"
    />
    <s-scrollbar class="select-country__scrollbar">
      <div class="select-country__list">
        <div
          class="p1 select-country__item s-flex"
          v-for="item in filteredCountries"
          :key="item.key"
          @click="selectCountry(item)"
        >
          <span class="flags flag-emodji">{{ item.flag }}</span>
          <span class="text">
            <p class="p1 text__name">{{ item.translatedName }}</p>
            <p class="p3 text__name">{{ item.name }}</p>
          </span>
          <span class="p1 code">{{ item.dialCode }}</span>
        </div>
      </div>
    </s-scrollbar>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { countryCodeEmoji } from 'country-code-emoji';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SearchInputMixin from '@/components/mixins/SearchInputMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import type { CountryInfo, PhoneCode } from '@/types/card';
import { getPhoneCodes } from '@/utils/card';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
  },
})
export default class SelectCountryDialog extends Mixins(TranslationMixin, mixins.DialogMixin, SearchInputMixin) {
  @state.settings.displayRegions private displayRegions!: Nullable<Intl.DisplayNames>;
  private countriesObject: Record<string, PhoneCode> = {};

  private get countries(): Array<CountryInfo> {
    return Object.entries(this.countriesObject)
      .map(([key, value]) => {
        const flag = this.getFlag(key);
        const translatedName = this.formatCountryName(key, value.name);
        return {
          key,
          name: value.name,
          dialCode: value.dial_code,
          flag,
          translatedName,
        };
      })
      .sort((a, b) => (a.translatedName < b.translatedName ? -1 : a.translatedName > b.translatedName ? 1 : 0));
  }

  get filteredCountries() {
    const countries = this.countries;
    if (this.query) {
      const query = this.query.toLowerCase().trim();
      return countries.filter(
        (item) =>
          item.dialCode.includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.translatedName.toLowerCase().includes(query)
      );
    }
    return countries;
  }

  private getFlag(iso: string): string {
    try {
      return countryCodeEmoji(iso);
    } catch {
      return '';
    }
  }

  private formatCountryName(key: string, defaultValue: string): string {
    try {
      const isoCode = key.toUpperCase();
      if (!this.displayRegions) {
        return defaultValue;
      }
      const name = this.displayRegions.of(isoCode);
      return name ?? defaultValue;
    } catch (error) {
      console.warn('Unsupported format of SORA Card Phone Country', error);
      return defaultValue;
    }
  }

  async mounted(): Promise<void> {
    this.countriesObject = await getPhoneCodes();
  }

  @Watch('visible')
  private async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;
    this.clearAndFocusSearch();
  }

  public selectCountry(country: CountryInfo): void {
    this.handleClearSearch();
    this.$emit('select', country);
    this.closeDialog();
  }
}
</script>

<style lang="scss">
.select-country__scrollbar {
  @include scrollbar(-$inner-spacing-big);
}
</style>

<style lang="scss" scoped>
$item-height: 66px;
$list-items: 7;
$max-text-width: 370px;

.select-country {
  &__search {
    margin-bottom: $inner-spacing-medium;
  }
  &__list {
    height: calc(#{$item-height} * #{$list-items});
  }
  &__item {
    align-items: center;
    height: $item-height;
    padding: $inner-spacing-small $inner-spacing-big;

    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    .text {
      flex: 1;
      &__name {
        max-width: $max-text-width;
        @include text-ellipsis;
      }
    }
    .flags {
      margin-right: $inner-spacing-mini;
    }
  }
}
</style>
