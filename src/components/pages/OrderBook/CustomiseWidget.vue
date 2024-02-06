<template>
  <div class="customise-widget">
    <span>Customise page</span>
    <s-icon name="arrow-left-16" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class CustomiseWidget extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped></style>
