<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div class="wrapper" v-loading="loadingPaywings">
      <div id="field"></div>
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
    loadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js')
      .then(() => {
        // @ts-expect-error injected class
        Paywiser.SimplePayment.create({
          // Your Hosted Fields API Key found in PG Dashboard. ("View Merchant" > "View Account" > "Edit WebPayments" > "Hosted fields API key")
          apiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',

          // Your confirmation sequence found in PG Dashboard. ("View Merchant" > "View Account" > "Edit Account" > "Confirmation sequence")
          // Note: while this property is not specifically required, it must be specified if you require 3DSecure verification of credit cards or sofort payments.
          confirmationSequence: 'ConfirmationSequence',

          // Set this property to "true" if you wish to test payment process.
          // Default: false
          testMode: true,

          // Set this property to "true" if you wish to display payment forms in a modal popup box.
          usePopup: false,

          // Used to specify a container where the payment form should be embedded into.
          // Note: If usePopup property has not been defined or is set to false then this property is required
          formContainer: '#field',

          // Used to specify language used on form at initialization.
          // Currently supported languages: 'en', 'de', 'da', 'it', 'sl', 'hr'.
          // Default: 'en'
          language: 'en',

          paymentData: {
            // Your own unique reference string
            ReferenceID: 'UniqueReferenceID',
            // Amount of payment in minor units (eg.: cents)
            Amount: 100,

            // ISO 4217 3-letter currency code
            Currency: 'EUR',

            // Merchant descriptor string
            StatementText: 'Statement text',

            // Purchase description
            StatementDescription: 'Statement description',
          },
        })
          .on('payment-complete', function () {
            // Everything you put inside this block will run if your payment is successfull.
            // In this case it will display an alert box. After clicking OK, you will be redirected to another webpage.
            alert('Your payment was successfull.');
            window.location.replace('https://www.google.com/');
          })
          .on('payment-failure', function (data) {
            // Everything you put inside this block will run if your payment fails.
            // In this case it will display alert box with Error Status Code and Description. After clicking OK, you will be redirected to another webpage.
            alert(
              'Your payment has failed. Error: ' +
                data.StatusCode +
                ' - ' +
                data.StatusDescription +
                '. Click OK to continue to another page.'
            );
            window.location.replace('https://www.bing.com/');
          });

        setTimeout(() => {
          this.loadingPaywings = false;
        }, 1500);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  unloadPaywings(): void {
    unloadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').catch(() => {});
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog {
  .wrapper {
    min-height: 420px;
  }
}
</style>
