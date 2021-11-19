<template>
  <div class="technical-work">
    <div class="technical-work-title">Technical Work in Progress</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class TechnicalWork extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped>
.technical-work {
  max-width: 650px;
  text-align: center;

  &-title {
    color: white;
    font-size: 80px;
    font-weight: 800;
    line-height: 72px;
  }
}
</style>
