<template>
  <dialog-base :visible.sync="isVisible" class="terms-of-service-dialog" :title="title">
    <div v-if="srcLink" v-loading="loading" class="tos__section">
      <iframe @load="onIFrameLoad" :src="srcLink" width="100%" height="600px" frameborder="0"></iframe>
    </div>
    <div v-else>
      <div class="sora-card__excuse">
        {{ t('card.blacklistedCountriesExcuse') }}
      </div>
      <div class="tos__section">
        <ul class="sora-card__unsupported-countries">
          <li v-for="[key, value] in unsupportedCountries" :key="key">
            <span class="flags">{{ countryCodeEmoji(key) }} </span> {{ value }}
          </li>
        </ul>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { countryCodeEmoji } from 'country-code-emoji';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class TermsAndConditionsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  @Prop({ default: '', type: String }) readonly srcLink!: string;
  @Prop({ default: '', type: String }) readonly title!: string;

  loading = true;
  flags: string[] = [];

  countryCodeEmoji = countryCodeEmoji;

  get unsupportedCountries(): Array<string>[] {
    return Object.entries(this.blacklistedCountries);
  }

  blacklistedCountries = {
    dz: 'Algeria',
    bd: 'Bangladesh',
    by: 'Belarus',
    bo: 'Bolivia',
    kh: 'Cambodia',
    cn: 'China',
    cu: 'Cuba',
    gh: 'Ghana',
    ir: 'Iran',
    jo: 'Jordan',
    kp: 'Korea',
    kg: 'Kyrgyzstan',
    mk: 'Macedonia',
    np: 'Nepal',
    ng: 'Nigeria',
    ru: 'Russian Federation',
    sd: 'Sudan',
    sy: 'Syria',
    th: 'Thailand',
    us: 'United States',
  };

  onIFrameLoad(): void {
    this.loading = false;
  }
}
</script>

<style lang="scss">
.terms-of-service-dialog .el-dialog {
  margin-top: 12vh !important;
  max-width: 1000px !important;
}
</style>

<style lang="scss" scoped>
.tos__section {
  width: 100%;
  height: 600px;
  background-color: transparent;
  box-shadow: var(--s-shadow-element);
  border-radius: 10px;
  padding: 0;
  padding-left: $basic-spacing;
  padding-right: $inner-spacing-tiny;
  padding-top: $inner-spacing-mini;
  overflow: hidden;
}

.sora-card {
  &__unsupported-countries {
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;

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
