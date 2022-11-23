<template>
  <dialog-base :visible.sync="isVisible" class="terms-of-service-dialog" title="Terms & Conditions">
    <div class="tos__section">
      <iframe :src="`https://soracard.com/terms/`" width="100%" height="600px" frameborder="0"> </iframe>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class TermsAndConditionsDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {}
</script>

<style lang="scss">
.terms-of-service-dialog .el-dialog {
  max-width: 1000px !important;
}
</style>

<style lang="scss" scoped>
.tos__section {
  width: 100%;
  height: 600px;
  background-color: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  border-radius: var(--s-border-radius-small);
  padding: 0;
  overflow: hidden;
}
</style>
