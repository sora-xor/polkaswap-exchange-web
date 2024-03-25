<template>
  <dialog-base :visible.sync="isVisible" class="terms-of-service-dialog" :title="title">
    <i-frame-widget v-if="srcLink" class="tos__section" with-border :src="srcLink" />
    <template v-else>
      <div class="sora-card__excuse">
        {{ t('card.blacklistedCountriesExcuse') }}
      </div>
      <div class="tos__section">
        <ul class="sora-card__unsupported-countries">
          <li v-for="[key, value] in unsupportedCountries" :key="key">
            <span class="flags flag-emodji">{{ countryCodeEmoji(key) }}</span> {{ formatCountryName(key, value) }}
          </li>
        </ul>
      </div>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { countryCodeEmoji } from 'country-code-emoji';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';

const BLACKLIST_URL = 'https://whitelist.polkaswap2.io/card/blacklist.json';

@Component({
  components: {
    DialogBase: components.DialogBase,
    IFrameWidget: lazyComponent(Components.IFrameWidget),
  },
})
export default class TermsAndConditionsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @Prop({ default: '', type: String }) readonly srcLink!: string;
  @Prop({ default: '', type: String }) readonly title!: string;

  @state.settings.displayRegions private displayRegions!: Nullable<Intl.DisplayNames>;
  private blacklistedCountries: Record<string, string> = {};

  countryCodeEmoji = countryCodeEmoji;

  formatCountryName(key: string, defaultValue: string): string {
    try {
      const isoCode = key.toUpperCase();
      if (!this.displayRegions) {
        return defaultValue;
      }
      const name = this.displayRegions.of(isoCode);
      return name ?? defaultValue;
    } catch (error) {
      console.warn('Unsupported format of SORA Card Blacklisted Country', error);
      return defaultValue;
    }
  }

  get unsupportedCountries(): Array<string>[] {
    return Object.entries(this.blacklistedCountries);
  }

  async getBlacklistedCountries(): Promise<void> {
    try {
      const response = await fetch(BLACKLIST_URL, { cache: 'no-cache' });
      const data = await response.json();
      this.blacklistedCountries = data;
    } catch (error) {
      this.blacklistedCountries = {};
    }
  }

  mounted(): void {
    this.getBlacklistedCountries();
  }
}
</script>

<style lang="scss">
.dialog-wrapper.terms-of-service-dialog .el-dialog:not(.is-fullscreen) {
  max-width: 1000px;
}
</style>

<style lang="scss" scoped>
.tos__section {
  width: 100%;
  background-color: transparent;
  overflow: hidden;
  margin-bottom: calc(var(--s-basic-spacing) * 2);
}

.sora-card {
  &__unsupported-countries {
    padding-left: 0;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;

    li {
      list-style: none;
      margin: $basic-spacing-small;
      font-weight: 600;
      font-size: var(--s-font-size-medium);

      .flags {
        margin-right: $inner-spacing-tiny;
      }
    }
  }

  &__excuse {
    margin-bottom: $basic-spacing;
    font-size: 18px;
  }
}
</style>
