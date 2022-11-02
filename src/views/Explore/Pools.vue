<template>
  <div>Pools</div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class ExplorePools extends Mixins(TranslationMixin) {}
</script>
