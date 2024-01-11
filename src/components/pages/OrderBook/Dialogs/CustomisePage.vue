<template>
  <dialog-base :visible.sync="isVisible">CustomisePage</dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class CustomisePage extends Mixins(mixins.DialogMixin, TranslationMixin) {}
</script>

<style lang="scss"></style>
