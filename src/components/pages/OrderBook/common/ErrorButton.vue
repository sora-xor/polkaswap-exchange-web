<template>
  <span>
    <span> {{ t('orderBook.cantPlaceOrder') }}</span>
    <s-icon name="info-16" class="book-inform-icon-btn" />
  </span>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class ErrorButton extends Mixins(TranslationMixin) {
  @Prop({ default: '', type: String }) readonly error!: string;
}
</script>
