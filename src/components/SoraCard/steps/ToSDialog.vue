<template>
  <dialog-base :visible.sync="isVisible" class="terms-of-service-dialog" :title="title">
    <div v-if="!srcLink" class="sora-card__excuse">
      Unfortunately, at this moment we’re not able to support the following countries:
    </div>
    <div v-if="srcLink" v-loading="loading" class="tos__section">
      <iframe @load="onIFrameLoad" :src="srcLink" width="100%" height="600px" frameborder="0"></iframe>
    </div>
    <div v-else class="tos__section">
      <ul class="sora-card__unsupported-countries">
        <li v-for="(country, index) in Object.values(unsupportedCountries)" :key="country">
          <span class="flags">{{ Object.keys(unsupportedCountries).map(countryCodeEmoji)[index] }} </span> {{ country }}
        </li>
      </ul>
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

  unsupportedCountries = {
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
  // background-color: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  border-radius: 10px;
  padding: 0;
  padding-left: 20px;
  padding-right: 4px;
  overflow: hidden;
}

.sora-card {
  &__unsupported-countries {
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;

    li {
      list-style: none;
      margin: 10px;
      font-weight: 600;
      font-size: 18px;

      .flags {
        margin-right: 4px;
      }
    }
  }

  &__excuse {
    margin-bottom: 16px;
    font-size: 18px;
  }
}
</style>
