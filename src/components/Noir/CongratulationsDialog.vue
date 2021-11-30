<template>
  <dialog-base :visible.sync="visibility" custom-class="cart--8">
    <div class="cart__row m-b-32">
      <div class="corner">
        <div class="wrap-confetti active">
          <canvas ref="confetti" id="confetti" class="confetti"></canvas>
        </div>
        <div class="corner__inner">
          <div class="corner__circle">
            <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke first" />
            <img src="img/corner-circle-stroke.png" loading="lazy" alt="" class="corner__circle-stroke second" />
          </div>
        </div>
      </div>
    </div>

    <div class="cart__row m-b-10 t-a-c">
      <div class="h3">- Noir</div>
    </div>

    <div class="cart__row m-b-26 text-2 t-a-c">We will contact you shortly</div>

    <div class="cart__row m-b-44 text-1 t-a-c">
      Congratulations on your purchase of the
      <br />
      world's first sparkling wine
    </div>

    <div class="cart__row">
      <s-button type="secondary" size="big" class="btn w-100">Join the Noir Telegram Group</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Action, State } from 'vuex-class';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import confetti from './confetti.js';

@Component({
  components: {
    DialogBase,
  },
})
export default class CongratulationsDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @State((state) => state.noir.congratulationsDialogVisibility) dialogVisibility!: boolean;
  @Action('setCongratulationsDialogVisibility', { namespace: 'noir' }) setVisibility!: (flag: boolean) => Promise<void>;

  get visibility(): boolean {
    return this.dialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setVisibility(flag);
  }

  confetti: any = null;

  mounted(): void {
    this.$watch('visibility', (flag) => {
      this.updateConfetti(flag);
    });
  }

  async updateConfetti(flag: boolean): Promise<void> {
    if (!this.confetti) {
      this.confetti = confetti();
    }

    await this.$nextTick();

    if (flag) {
      this.confetti.run();
    } else {
      this.confetti.stop();
    }
  }
}
</script>
