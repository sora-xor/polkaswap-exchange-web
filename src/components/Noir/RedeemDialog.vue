<template>
  <dialog-base :visible.sync="visibility" custom-class="redeem-dialog-wrapper">
    <div :class="['redeem-dialog', currentStep]">
      <template v-if="currentStep === Steps.Agreement">
        <div class="redeem-dialog-title">Redeem</div>
        <div class="redeem-dialog-subtitle">Terms of service agreement<br />November 18,2021</div>
        <div class="redeem-dialog-text">
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
        <div class="redeem-dialog-check">
          <s-checkbox v-model="agreementModel" size="big">I Agree</s-checkbox>
        </div>
        <s-button
          type="primary"
          size="big"
          class="btn w-100"
          :disabled="!agreementModel"
          @click="handleStep(Steps.Agreement)"
        >Continue</s-button>
      </template>

      <template v-else-if="currentStep === Steps.SelectCount">
        <div class="redeem-dialog-subtitle">You must have a balance greater than 1 NOIR to redeem.</div>

        <count-input v-model="redeemedCount" :min="1" :max="max" />

        <div class="redeem-dialog-text">How many Noir would you like to redeem at this time?</div>

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
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Action, State, Getter } from 'vuex-class';
import { Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset, CodecString, NetworkFeesObject } from '@sora-substrate/util';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components, NOIR_TOKEN_ADDRESS, NOIR_ADDRESS_ID } from '@/consts';
import { getMaxValue } from '@/utils';

enum Steps {
  Agreement = 'agreement',
  SelectCount = 'count',
  AddressForm = 'form',
}

@Component({
  components: {
    DialogBase,
    CountInput: lazyComponent(Components.CountInput),
  },
})
export default class RedeemDialog extends Mixins(DialogMixin, mixins.TransactionMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @State((state) => state.noir.redeemDialogVisibility) redeemDialogVisibility!: boolean;
  @State((state) => state.noir.agreementSigned) agreementSigned!: boolean;

  @Getter networkFees!: NetworkFeesObject;
  @Getter('tokenTo', { namespace: 'swap' }) token!: AccountAsset;

  @Action('setRedeemDialogVisibility', { namespace: 'noir' }) setVisibility!: (flag: boolean) => Promise<void>;
  @Action('setAgreement', { namespace: 'noir' }) setAgreement!: (flag: boolean) => Promise<void>;
  @Action('redeem', { namespace: 'noir' }) redeem!: (count: number) => Promise<void>;

  Steps = Steps;
  currentStep = Steps.Agreement;

  agreementModel = false;
  redeemedCount = 1;

  get visibility(): boolean {
    return this.redeemDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setVisibility(flag);
    this.reset();
  }

  get max(): number {
    if (!this.token) return 0;

    return Math.floor(+getMaxValue(this.token, this.transferNetworkFee));
  }

  get transferNetworkFee(): CodecString {
    return this.networkFees[Operation.Transfer];
  }

  reset(): void {
    this.redeemedCount = 1;

    if (this.agreementSigned) {
      this.currentStep = Steps.SelectCount;
    }
  }

  async handleStep(step: Steps): Promise<void> {
    switch (step) {
      case Steps.Agreement: {
        this.setAgreement(true);
        this.currentStep = Steps.SelectCount;
        break;
      }
      case Steps.SelectCount: {
        this.currentStep = Steps.AddressForm;
        break;
      }
      case Steps.AddressForm: {
        await this.transfer();
        break;
      }
      default: {
        // close dialog
        this.visibility = false;
        break;
      }
    }
  }

  async transfer() {
    try {
      await this.withNotifications(async () => await this.redeem(this.redeemedCount));
    } catch (error) {
      console.error(error);
    }

    this.visibility = false;
  }
}
</script>

<style lang="scss">
.redeem-dialog-wrapper.dialog-wrapper .el-dialog > .el-dialog__body .dialog-content {
  padding: 48px 54px;
}
</style>

<style lang="scss" scoped>
$base: '.redeem-dialog';

#{$base} {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;

  &-title {
    font-size: 27px;
    line-height: 40px;
    text-align: center;
  }

  &-subtitle {
    font-size: 12px;
    line-height: 20px;
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

  &.agreement {
    #{$base} {
      &-subtitle {
        margin: 14px 0 26px;
      }
    }
  }

  &.count {
    #{$base} {
      &-subtitle {
        font-size: 15px;
        line-height: 25px;
        max-width: 260px;
        margin-bottom: 40px;
      }

      &-text {
        margin: 40px 0;
        max-width: 205px;
        text-align: center;
      }
    }
  }
}
</style>
