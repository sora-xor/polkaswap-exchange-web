<template>
  <div class="bridge-header">
    <h3 class="bridge-header-title">{{ t('bridge.title') }}</h3>
    <div class="bridge-header-title-info">{{ t('bridge.info') }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class BridgeHeader extends Mixins(TranslationMixin) {
}
</script>

<style lang="scss" scoped>
.bridge-header {
  margin-top: $inner-spacing-large;
  &-title,
  &-title-info {
    text-align: center;
  }
  &-title {
    margin-bottom: $inner-spacing-small;
    line-height: $s-line-height-small;
    letter-spacing: $s-letter-spacing-small;
    font-feature-settings: $s-font-feature-settings-title;
  }
  &-title-info {
    line-height: $s-line-height-big;
  }
}
</style>
