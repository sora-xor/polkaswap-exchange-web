<template>
  <span>
    <span> {{ t('orderBook.cantPlaceOrder') }}</span>
    <s-icon name="info-16" class="book-inform-icon-btn"></s-icon>
  </span>
</template>

<script setup lang="ts">
import { useTranslation } from '@/composables/useTranslation';

withDefaults(
  defineProps<{
    error?: string;
  }>(),
  {
    error: '',
  }
);

const { t } = useTranslation();
</script>
