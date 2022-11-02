<template>
  <div>Farming</div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class ExploreFarming extends Mixins(TranslationMixin) {}
</script>
