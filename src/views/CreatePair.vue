<template>
  <div></div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'

@Component
export default class CreatePair extends Mixins(TranslationMixin) {

}
</script>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';
</style>
