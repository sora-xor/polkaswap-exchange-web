<template>
  <div class="switcher">
    <s-switch v-model="model" />
    <span>
      {{ t('explore.showOnly') }}
      <external-link default-class="p3" :title="t('explore.synthetics')" :href="SYNTHS_LINK" />
    </span>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    ExternalLink: lazyComponent(Components.ExternalLink),
  },
})
export default class SyntheticSwitcher extends Mixins(TranslationMixin) {
  @ModelSync('value', 'input', { type: Boolean })
  readonly model!: boolean;

  readonly SYNTHS_LINK =
    'https://medium.com/polkaswap/unveiling-synthetic-assets-a-game-changer-in-the-financial-landscape-1720e5858422';
}
</script>

<style lang="scss" scoped>
.switcher {
  display: flex;
  align-items: center;

  & > span {
    margin-left: $inner-spacing-small;
  }
}
</style>
