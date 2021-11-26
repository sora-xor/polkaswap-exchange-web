<template>
  <dialog-base :visible.sync="visibility" custom-class="congratulations-dialog-wrapper">
    Congratulations on your purchase of the world's first sparkling wine!

    <s-button type="secondary" size="big" class="btn w-100"> Join Telegram Group </s-button>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Action, State } from 'vuex-class';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class WalletDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @State((state) => state.noir.congratulationsDialogVisibility) dialogVisibility!: boolean;
  @Action('setCongratulationsDialogVisibility', { namespace: 'noir' }) setVisibility!: (flag: boolean) => Promise<void>;

  get visibility(): boolean {
    return this.dialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setVisibility(flag);
  }
}
</script>
