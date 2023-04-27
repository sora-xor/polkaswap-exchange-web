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

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { Components, Links } from '@/consts';
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
        title: this.t('aboutNetworkDialog.network.title'),
        description: this.t('aboutNetworkDialog.network.description'),
        link: Links.about.sora,
      },
      {
        title: this.t('aboutNetworkDialog.polkadot.title'),
        description: this.t('aboutNetworkDialog.polkadot.description'),
        link: Links.about.polkadot,
      },
    ];
  }
}
</script>

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
      margin-left: $inner-spacing-tiny;
      font-size: 0.75em !important;
    }
  }
}
</style>
