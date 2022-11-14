<template>
  <dialog-base :visible.sync="isVisible" title="Non-Disclosure Agreement"> NonDisclosureAgreement </dialog-base>
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
export default class NonDisclosureAgreementDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {}
</script>
