<template>
  <div class="container">
    {{ t('comingSoon') }}
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class Rewards extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped>
</style>
