<template>
  <dialog-base :visible.sync="visibility" :before-close="beforeClose" custom-class="redeem-dialog-wrapper">
    <div class="redeem">
      <template v-if="currentStep === Steps.Agreement">
        <div class="redeem-title">Redeem</div>
        <div class="redeem-subtitle">Terms of service agreement<br />November 18,2021</div>
        <div class="redeem-text">
          <p>
            1. The Sale of Alcoholic Beverages<br />
            The Company does not sell alcohol to persons under the age of 21. By using this site you are representing
            that you are over the age of 21. The Company makes every effort to ensure that alcoholic beverages are not
            delivered to anyone who is under the age of 21. By using this site you are representing that the person
            receiving a shipment of alcoholic beverages from the Company is over the age of 21.
          </p>
          <p>
            2. Eligible Countries for Direct Shipment<br />
            This list is current as of November, 2021. This list may change at any time, so please make sure that your
            country is eligible for shipment. It may be possible for other arrangements to occur. Please see point 5
            below. If your country is not listed below, please contact our service email to enquire.<br />
            -Argentina<br />
            -Australia
          </p>
        </div>
        <div class="redeem-check">
          <s-checkbox v-model="agreementSigned" size="big">I Agree</s-checkbox>
        </div>
        <s-button
          type="primary"
          size="big"
          class="btn w-100"
          :disabled="!agreementSigned"
          @click="handleStep(Steps.Agreement)"
        >Continue</s-button>
      </template>

      <template v-else-if="currentStep === Steps.SelectCount">
        <s-button type="secondary" size="big" class="btn w-100" @click="handleStep(Steps.SelectCount)">
          Redeem
        </s-button>
      </template>

      <template v-else-if="currentStep === Steps.AddressForm">
        <!-- Google Form Here -->
        <s-button type="primary" size="big" class="btn w-100" @click="handleStep(Steps.AddressForm)">
          CONFIRM
        </s-button>
      </template>

      <template v-else>
        <!-- Congratulations -->
        <s-button type="secondary" size="big" class="btn w-100" @click="handleStep()"> Close </s-button>
      </template>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Action, State } from 'vuex-class';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

enum Steps {
  Agreement = 'Agreement',
  SelectCount = 'SelectCount',
  AddressForm = 'AddressForm',
  Congratulations = 'Congratulations',
}

@Component({
  components: {
    DialogBase,
  },
})
export default class RedeemDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @State((state) => state.noir.redeemDialogVisibility) redeemDialogVisibility!: boolean;
  @Action('setRedeemDialogVisibility', { namespace: 'noir' }) setRedeemDialogVisibility!: (
    flag: boolean
  ) => Promise<void>;

  agreementSigned = false;

  Steps = Steps;
  currentStep = Steps.Agreement;

  get visibility(): boolean {
    return this.redeemDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setRedeemDialogVisibility(flag);
  }

  beforeClose(): void {
    this.currentStep = Steps.Agreement;
  }

  handleStep(step: Steps): void {
    switch (step) {
      case Steps.Agreement: {
        this.currentStep = Steps.SelectCount;
        break;
      }
      case Steps.SelectCount: {
        this.currentStep = Steps.AddressForm;
        break;
      }
      case Steps.AddressForm: {
        this.currentStep = Steps.Congratulations;
        break;
      }
      default: {
        // close dialog
        this.setRedeemDialogVisibility(false);
        break;
      }
    }
  }
}
</script>

<style lang="scss">
.redeem-dialog-wrapper.dialog-wrapper .el-dialog > .el-dialog__body .dialog-content {
  padding: 48px 54px;
}

.redeem {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;

  &-title {
    font-size: 27px;
    line-height: 40px;
  }

  &-subtitle {
    font-size: 12px;
    line-height: 20px;
    margin: 14px 0 26px;
    text-align: center;
  }

  &-text {
    font-size: 12px;
    line-height: 20px;
    color: var(--s-color-base-content-secondary);

    p + p {
      margin-top: 20px;
    }
  }
}
</style>
