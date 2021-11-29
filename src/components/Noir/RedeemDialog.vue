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
        <s-button type="primary" size="big" class="btn w-100" :disabled="!agreementModel" @click="handleAgreement">
          Continue
        </s-button>
      </template>

      <template v-else-if="currentStep === Steps.SelectCount">
        <div class="redeem-dialog-subtitle">You must have a balance greater than 1 NOIR to redeem.</div>

        <count-input v-model="redeemedCount" :min="1" :max="max" />

        <div class="redeem-dialog-text">How many Noir would you like to redeem at this time?</div>

        <s-button type="secondary" size="big" class="btn w-100" @click="handleCount"> Redeem </s-button>
      </template>

      <template v-else-if="currentStep === Steps.AddressForm">
        <s-form :model="form" :rules="validationRules" ref="form" @submit.native.prevent="submitForm">
          <div class="redeem-dialog-title">DHL Shipping Info</div>
          <div class="redeem-dialog-text">
            If you wish to arrange for pickup, storage, or courier service, it is fine to leave just an email.
          </div>

          <div class="redeem-dialog-form">
            <s-form-item prop="name">
              <s-input placeholder="Name" v-model="form.name" />
            </s-form-item>
            <s-form-item prop="address">
              <s-input placeholder="Address" type="textarea" v-model="form.address" />
            </s-form-item>
            <s-form-item prop="email">
              <s-input placeholder="Email" v-model="form.email" />
            </s-form-item>
            <s-form-item prop="phone">
              <s-input placeholder="Phone" v-model="form.phone" />
            </s-form-item>
          </div>

          <div class="redeem-dialog-table">
            <div class="redeem-dialog-row">
              <div class="redeem-dialog-cell">NOIR Redeemed</div>
              <div class="redeem-dialog-cell redeem-dialog-cell--value">{{ redeemedCount }} NOIR</div>
            </div>
            <div class="redeem-dialog-row">
              <div class="redeem-dialog-cell">XOR Transaction fee</div>
              <div class="redeem-dialog-cell redeem-dialog-cell--value">
                {{ formatCodecNumber(transferNetworkFee) }} XOR
              </div>
            </div>
          </div>

          <s-button native-type="submit" type="primary" size="big" class="btn w-100"> CONFIRM </s-button>

          <div class="redeem-dialog-text">
            Acknowledge that I am over 21 years of age and am not acting in violation of my country's laws.
          </div>
        </s-form>
      </template>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, State, Getter } from 'vuex-class';
import { Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset, CodecString, NetworkFeesObject } from '@sora-substrate/util';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getMaxValue } from '@/utils';
import { NoirFormData } from '@/types/noir';

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
export default class RedeemDialog extends Mixins(DialogMixin, mixins.TransactionMixin, mixins.NumberFormatterMixin) {
  @State((state) => state.noir.redeemDialogVisibility) redeemDialogVisibility!: boolean;
  @State((state) => state.noir.agreementSigned) agreementSigned!: boolean;

  @Getter networkFees!: NetworkFeesObject;
  @Getter('tokenTo', { namespace: 'swap' }) token!: AccountAsset;

  @Action('setRedeemDialogVisibility', { namespace: 'noir' }) setVisibility!: (flag: boolean) => Promise<void>;
  @Action('setAgreement', { namespace: 'noir' }) setAgreement!: (flag: boolean) => Promise<void>;
  @Action('redeem', { namespace: 'noir' }) redeem!: (count: number) => Promise<void>;
  @Action('submitGoogleForm', { namespace: 'noir' }) submitGoogleForm!: (form: NoirFormData) => Promise<void>;

  readonly validationRules = {
    name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
    address: [{ required: true, message: 'Address is required', trigger: 'blur' }],
    email: [
      {
        required: true,
        trigger: 'blur',
        validator: (rule, value, callback) => {
          if (!/^\S+@\S+\.\S+$/.test(value)) {
            return callback(new Error('Email address is invalid'));
          }
          callback();
        },
      },
    ],
    phone: [
      {
        required: true,
        trigger: 'blur',
        validator: (rule, value, callback) => {
          if (!/^\+?[0-9]+$/.test(value)) {
            return callback(new Error('Phone number is invalid'));
          }
          callback();
        },
      },
    ],
  };

  Steps = Steps;
  currentStep = Steps.Agreement;

  agreementModel = false;
  redeemedCount = 1;

  form: NoirFormData = {
    name: '',
    address: '',
    email: '',
    phone: '',
  };

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

  handleAgreement(): void {
    this.setAgreement(true);
    this.currentStep = Steps.SelectCount;
  }

  handleCount(): void {
    this.currentStep = Steps.AddressForm;
  }

  async submitForm(): Promise<void> {
    try {
      await (this.$refs.form as any).validate();
      await this.transfer();
      await this.submitGoogleForm(this.form);
    } catch (error) {
      console.warn(error);
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

.redeem-dialog-form {
  .s-input {
    border-radius: 0px !important;
    border-bottom: 1px solid #fff !important;
    padding: 18px 0px !important;
    height: 70px !important;
  }
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

  &-form {
    width: 100%;
  }

  &-table {
    width: 100%;
    font-size: 12px;
    line-height: 14.4px;
  }

  &-row {
    display: flex;
    align-items: center;

    & + & {
      margin-top: 15px;
    }
  }

  &-cell {
    width: 50%;
    padding: 0 10px;
    text-align: right;
    white-space: nowrap;

    &--value {
      text-align: left;
      color: var(--s-color-theme-accent);
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

  &.form {
    .el-form > *:not(:last-child) {
      margin-bottom: 20px;
    }

    #{$base} {
      &-text {
        text-align: center;
      }
    }
  }
}
</style>
