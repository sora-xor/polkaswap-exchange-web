<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('aboutNetworkDialog.title')"
    custom-class="about-network-dialog"
  >
    <div v-for="({ title, description, link }, index) in aboutBlocks" :key="index" class="about-network-block">
      <h4>{{ title }}</h4>
      <p class="p4">{{ description }}</p>
      <a class="about-network-link p4" :href="link" target="_blank" rel="nofollow noopener">
        <span>{{ t('aboutNetworkDialog.learnMore') }}</span>
        <s-icon class="about-network-link-icon" name="external-link-16" />
      </a>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from './mixins/TranslationMixin'
import DialogMixin from './mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

import { Links } from '@/consts'

@Component({
  components: {
    DialogBase
  }
})
export default class AboutNetworkDialog extends Mixins(TranslationMixin, DialogMixin) {
  get aboutBlocks (): Array<object> {
    return [{
      title: this.t('aboutNetworkDialog.network.title'),
      description: this.t('aboutNetworkDialog.network.description'),
      link: Links.about.sora
    }, {
      title: this.t('aboutNetworkDialog.polkadot.title'),
      description: this.t('aboutNetworkDialog.polkadot.description'),
      link: Links.about.polkadot
    }]
  }
}
</script>

<style lang="scss">
.dialog-wrapper.about-network-dialog {
  .el-dialog {
    width: 448px !important;

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
