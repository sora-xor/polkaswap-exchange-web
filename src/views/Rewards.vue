<template>
  <!-- TODO: add parentLoading -->
  <div class="container rewards" v-loading="false">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box :symbol="gradientSymbol">
      123
    </gradient-box>
    <div class="rewards-hint">
      {{ t('rewards.hint.connectAccountsText') }}
    </div>
    <s-button class="rewards-action-button" type="primary">
      {{ t('rewards.action.connectWallet') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    GradientBox: lazyComponent(Components.GradientBox)
  }
})
export default class Rewards extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  // TODO: check reward tokens
  get gradientSymbol () {
    return ''
  }
}
</script>

<style lang="scss" scoped>
.rewards {
  &-hint {
    margin: $inner-spacing-medium 0;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary)
  }

  @include full-width-button('rewards-action-button', 0);
}
</style>
