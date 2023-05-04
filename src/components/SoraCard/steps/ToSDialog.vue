<template>
  <dialog-base :visible.sync="isVisible" class="terms-of-service-dialog" :title="title">
    <widget v-if="srcLink" class="tos__section" with-border :src="srcLink" />
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
import { countryCodeEmoji } from 'country-code-emoji';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    DialogBase: components.DialogBase,
    Widget: lazyComponent(Components.Widget),
  },
})
export default class TermsAndConditionsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @Prop({ default: '', type: String }) readonly srcLink!: string;
  @Prop({ default: '', type: String }) readonly title!: string;

  @state.settings.displayRegions private displayRegions!: Nullable<Intl.DisplayNames>;

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

  blacklistedCountries = {
    dz: 'Algeria',
    bd: 'Bangladesh',
    bb: 'Barbados',
    by: 'Belarus',
    bo: 'Bolivia',
    bf: 'Burkina Faso',
    kh: 'Cambodia',
    ky: 'Cayman Islands',
    cd: 'Congo',
    cn: 'China',
    cu: 'Cuba',
    gi: 'Gibraltar',
    gh: 'Ghana',
    ht: 'Haiti',
    ir: 'Iran',
    jm: 'Jamaica',
    jo: 'Jordan',
    kp: 'Korea',
    kg: 'Kyrgyzstan',
    mk: 'Macedonia',
    ml: 'Mali',
    mz: 'Mozambique',
    mm: 'Myanmar',
    np: 'Nepal',
    ng: 'Nigeria',
    pa: 'Panama',
    ph: 'Philippines',
    ru: 'Russian Federation',
    sn: 'Senegal',
    za: 'South Africa',
    ss: 'South Sudan',
    sy: 'Syria',
    tz: 'Tanzania',
    tr: 'Turkey',
    th: 'Thailand',
    ug: 'Uganda',
    ae: 'United Arab Emirates',
    us: 'United States',
    ye: 'Yemen',
  } as const;
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
      font-size: 18px;

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
