<template>
  <dialog-base :visible.sync="isVisible" title="Privacy Policy">
    <div>
      <iframe :src="`https://soracard.com/privacy/`" width="100%" height="100" frameborder="0"> </iframe>
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
export default class PrivacyPolicyDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {}
</script>
