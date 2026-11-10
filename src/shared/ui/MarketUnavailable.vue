<template>
  <span class="market-unavailable" :aria-label="label" :title="label">—</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

const { t } = useTranslation();
const label = computed(() => t('rewards.analytics.market.unavailable'));
</script>
