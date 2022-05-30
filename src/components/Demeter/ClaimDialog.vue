<template>
  <dialog-base :visible.sync="isVisible" :title="t('demeterFarming.actions.claim')"> </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class ClaimDialog extends Mixins(TranslationMixin, DialogMixin) {}
</script>
