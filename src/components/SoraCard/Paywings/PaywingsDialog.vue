<template>
  <dialog-base v-loading="loading" :visible.sync="isVisible" class="pw-dialog">
    <div class="wrapper">
      <form id="pw-creditcard-form" class="form form-horizontal" action="">
        <label for="card-number">Card number:</label>
        <div class="input-container" id="card-number"></div>

        <label for="card-cvv">Card CVV:</label>
        <div class="input-container" id="card-cvv"></div>

        <label for="card-date">Card date:</label>
        <div class="input-container" id="card-date"></div>

        <label for="card-holder">Card holder:</label>
        <div class="input-container" id="card-holder"></div>

        <label for="card-email">Card Email:</label>
        <div class="input-container" id="card-email"></div>

        <label for="card-address-name">Card Address name:</label>
        <div class="input-container" id="card-address-name"></div>

        <label for="card-address-street">Card Address Street:</label>
        <div class="input-container" id="card-address-street"></div>

        <label for="card-address-city">Card Address City:</label>
        <div class="input-container" id="card-address-city"></div>

        <label for="card-address-state">Card Address State:</label>
        <div class="input-container" id="card-address-state"></div>

        <label for="card-address-zip">Card Address Zip:</label>
        <div class="input-container" id="card-address-zip"></div>

        <label for="card-address-country">Card Address Country:</label>
        <div class="input-container" id="card-address-country"></div>

        <button type="submit">Pay</button>
      </form>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { getter, state } from '@/store/decorators';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { loadScript, unloadScript } from 'vue-plugin-load-script';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class PaywingsDialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @getter.soraCard.accountAddress accountAddress!: string;

  loadingPaywings = true;

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange(visible: boolean): void {
    if (visible) {
      this.loadPaywings();
    } else {
      this.unloadPaywings();
      this.loadingPaywings = true;
    }
  }

  loadPaywings(): void {
    loadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').then(() => {});
  }

  unloadPaywings(): void {
    unloadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js           ').catch(() => {});
  }
}
</script>

<style lang="scss">
.pw-dialog .el-dialog {
  .wrapper {
    min-height: 420px;
  }
}

#pw-creditcard-form {
  border: 1px solid #bbb;
  padding: 0.5rem;
  background-color: #fff;
}
.input-container {
  height: 1.5rem;
  border-bottom: 1px solid grey;
  margin-bottom: 1rem;
}
</style>
