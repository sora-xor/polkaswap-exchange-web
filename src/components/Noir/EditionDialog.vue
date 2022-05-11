<template>
  <dialog-base :visible.sync="visibility">
    <div class="cart__row m-b-46 p-t-20">
      <div class="h3 t-a-c">$NOIR Edition 1</div>
    </div>

    <div class="cart__row m-b-46">
      <s-scrollbar class="custom-scroll">
        <div class="t-a-j text-1 t-t-u max-h-250 p-r-20">
          <p>
            There will only be 777 $NOIR tokens ever in existence.<br />
            SNOIR follows a token bonding curve. Thus, every SNOIR sold increases the cost of then ext, but $NOIR can
            also be sold back into the liquidity pool at any time,thus creating a speculative market for SNOIR.
          </p>
          <p>
            You can buy, sell, or redeem through noir.exchange. $NOIR is also fully tradable on polkaswap.io under
            SNOIR.
          </p>
          <p>
            1 $NOIR token can be redeemed for 1 of 777 limited edition bottles.shipped to you (or your wine broker)
            anywhere in the world. When a $NOIR holder wants to redeem their token for a physical bottle, the token is
            burned, reducing the total number in circulation.
          </p>
          <p>
            Those interested in getting exposure to $NOIR, but don't necessarily want to buy one full $NOIR can purchase
            fractional amounts via Polkaswap.
          </p>
          <p>To learn more about $NOIR, $NOIR, please read our Medium article.</p>
        </div>
      </s-scrollbar>
    </div>

    <div class="cart__row df-jcc m-b-32 text-title-1 pointer t-t-u">
      <a @click="setVisibility(false)">Buy $NOIR</a>
    </div>

    <!-- <div class="cart__row df-jcc m-b-38">
      <div class="short-line"></div>
    </div> -->

    <div class="cart__row">
      <s-button type="primary" size="big" class="btn w-100" @click="setVisibility(false)">Get In Touch</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { mutation, state } from '@/store/decorators';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class WalletDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @state.noir.editionDialogVisibility private dialogVisibility!: boolean;

  @mutation.noir.setEditionDialogVisibility private setVisibility!: (flag: boolean) => void;

  get visibility(): boolean {
    return this.dialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setVisibility(flag);
  }
}
</script>

<style lang="scss"></style>
