<template>
  <dialog-base :visible.sync="isVisible" :title="t('aboutNetworkDialog.title')" custom-class="about-network-dialog">
    <div v-for="({ title, description, link }, index) in aboutBlocks" :key="index" class="about-network-block">
      <h4>{{ title }}</h4>
      <p class="p4">{{ description }}</p>
      <external-link :title="t('aboutNetworkDialog.learnMore')" :href="link" />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from './mixins/TranslationMixin';

import { Components, Links, app } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    DialogBase: components.DialogBase,
    ExternalLink: lazyComponent(Components.ExternalLink),
  },
})
export default class AboutNetworkDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  get aboutBlocks() {
    return [
      {
        title: this.t('aboutNetworkDialog.network.title', { sora: this.TranslationConsts.Sora }),
        description: this.t('aboutNetworkDialog.network.description', {
          sora: this.TranslationConsts.Sora,
          polkaswap: app.name,
          ethereum: this.TranslationConsts.Ethereum,
        }),
        link: Links.about.sora,
      },
      {
        title: this.t('aboutNetworkDialog.polkadot.title', { polkadotJs: this.TranslationConsts.PolkadotJs }),
        description: this.t('aboutNetworkDialog.polkadot.description', {
          polkadotJs: this.TranslationConsts.PolkadotJs,
          sora: this.TranslationConsts.Sora,
          polkadot: this.TranslationConsts.Polkadot,
          kusama: this.TranslationConsts.Kusama,
        }),
        link: Links.about.polkadot,
      },
    ];
  }
}
</script>

<style lang="scss">
.dialog-wrapper.about-network-dialog {
  .el-dialog {
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-mini * 4;
    }
  }
}
</style>

<style scoped lang="scss">
.about-network {
  &-block {
    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }

    &:not(:last-child) {
      margin-bottom: $inner-spacing-medium;
    }
  }

  &-link {
    display: inline-block;
    text-decoration: none;

    & > * {
      color: var(--s-color-button-tertiary-color);
    }

    &-icon {
      margin-left: $inner-spacing-mini / 2;
      font-size: 0.75em !important;
    }
  }
}
</style>
