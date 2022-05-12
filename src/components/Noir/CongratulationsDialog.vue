<template>
  <dialog-base :visible.sync="visibility" custom-class="cart--8" show-salute>
    <div class="cart__row m-b-26">
      <div class="wrap-confetti active">
        <canvas ref="confetti" id="confetti" class="confetti"></canvas>
      </div>
      <div class="congratulations-image">
        <img src="img/noir-nft.png" loading="lazy" alt="" />
      </div>
    </div>

    <div class="cart__row m-b-14 t-a-c">
      <div class="h3">Cheers!</div>
    </div>

    <div class="cart__row m-b-44 text-2 t-a-c t-t-u f-f-neuemontreal">
      Congratulations on your purchase of the
      <br />
      world's first sparkling wine
    </div>

    <div class="cart__row m-b-26 text-2 t-a-c t-t-u">We will contact you shortly</div>

    <div class="cart__row">
      <a target="_blank" href="https://t.me/noirdigitalgroup" class="el-button neumorphic s-secondary btn w-100">Join the Noir Telegram Group</a>
    </div>

    <!-- <video class="salute" loop="" muted="" autoplay="" playsinline="" src="video/confetti.webm"></video> -->
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { mutation, state } from '@/store/decorators';

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

  @state.noir.congratulationsDialogVisibility private dialogVisibility!: boolean;
  @mutation.noir.setCongratulationsDialogVisibility private setVisibility!: (flag: boolean) => Promise<void>;

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

<style scoped lang="scss">
.congratulations-image img {
  max-width: 100%;
}
</style>
