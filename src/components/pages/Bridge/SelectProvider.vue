<template>
  <dialog-base :title="t('createPair.connect')"> </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class BridgeSelectProvider extends Mixins(TranslationMixin) {}
</script>
