<template>
  <div class="order-book-widget">Market trades</div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class MarketTradesWidget extends Mixins(TranslationMixin) {}
</script>
