<template>
  <dialog-base :visible.sync="visibility" custom-class="redeem-dialog-wrapper">
    <div :class="['redeem-dialog', currentStep]">
      <template v-if="currentStep === Steps.Agreement">
        <div class="cart__row m-b-14">
          <div class="h3 t-a-c p-t-14">Redeem</div>
        </div>

        <div class="cart__row text-2 t-a-c m-b-16">
          Terms of service agreement
          <br />
          November 18,2021
        </div>

        <div class="cart__row m-b-26 text-1">
          <s-scrollbar class="custom-scroll">
            <div class="max-h-300">
              <p>
                1. The Sale of Alcoholic Beverages The Company does not sell alcohol to persons under the age of 21. By
                using this site you are representing that you are over the age of 21. The Company makes every effort to
                ensure that alcoholic beverages are not delivered to anyone who is under the age of 21. By using this
                site you are representing that the person receiving a shipment of alcoholic beverages from the Company
                is over the age of 21.
              </p>

              <p>
                2. Eligible Countries for Direct Shipment This list is current as of November, 2021. This list may
                change at any time, so please make sure that your country is eligible for shipment. It may be possible
                for other arrangements to occur. Please see point 5 below. If your country is not listed below, please
                contact our service email to enquire.
                <br />
                -Argentina
                <br />
                -Australia
              </p>
            </div>
          </s-scrollbar>
        </div>

        <div class="cart__row m-b-32 df-jcc">
          <label class="checkbox">
            <input class="checkbox__input" type="checkbox" name="" id="" v-model="agreementModel" />

            <div class="checkbox__pseudo">
              <img src="img/ok.png" class="checkbox__ok-img" loading="lazy" alt="" />
            </div>

            <div class="checkbox__descr">
              <div class="vl"></div>
              <div class="text-title-1 checkbox__text">I Agree</div>
            </div>
          </label>
        </div>

        <div class="cart__row">
          <s-button type="primary" size="big" class="btn w-100" :disabled="!agreementModel" @click="handleAgreement">
            Continue
          </s-button>
        </div>
      </template>

      <template v-else-if="currentStep === Steps.SelectCount">
        <div class="cart__row text-title-1 p-t-20 t-a-c m-b-46">
          You must have a balance greater
          <br />
          than 1 NOIR to redeem.
        </div>

        <div class="cart__row m-b-36">
          <big-counter v-model="redeemedCount" :min="1" :max="max" />
        </div>

        <div class="cart__row text-1 t-a-c m-b-38">
          How many Noir would you like to
          <br />
          redeem at this time?
        </div>

        <div class="cart__row">
          <s-button type="secondary" size="big" class="btn w-100" @click="handleCount">Redeem</s-button>
        </div>
      </template>

      <template v-else-if="isFormVisible">
        <s-form :model="form" :rules="validationRules" ref="form" @submit.native.prevent="submitTransaction">
          <div class="cart__row m-b-20">
            <div class="h3 t-a-c">DHL Shipping Info</div>
          </div>

          <div class="cart-row t-a-c m-b-20 text-1">
            If you wish to arrange for pickup, storage, or
            <br />
            courier service, it is fine to leave just an email.
          </div>

          <div class="cart__row m-b-20">
            <s-form-item prop="name">
              <s-input placeholder="Name" size="medium" v-model="form.name" />
            </s-form-item>
            <s-form-item prop="address">
              <s-input placeholder="Address" size="medium" type="textarea" v-model="form.address" />
            </s-form-item>
            <s-form-item prop="email">
              <s-input placeholder="Email" size="medium" v-model="form.email" />
            </s-form-item>
            <s-form-item prop="phone">
              <s-input placeholder="Phone" size="medium" v-model="form.phone" />
            </s-form-item>
          </div>

          <div class="cart__row df-jcc m-b-20">
            <table class="table">
              <tr>
                <td class="t-a-r text-2 p-r-20">NOIR Redeemed</td>
                <td class="text-title-1 color-pink">{{ redeemedCount }} NOIR</td>
              </tr>
              <tr>
                <td class="t-a-r text-2 p-r-20">XOR Transaction fee</td>
                <td class="text-title-1 color-pink">{{ formatCodecNumber(transferNetworkFee) }} XOR</td>
              </tr>
            </table>
          </div>

          <div class="cart__row m-b-12">
            <s-button
              v-if="currentStep === Steps.ConfirmTx"
              native-type="submit"
              type="primary"
              size="big"
              class="btn w-100"
              :disabled="isInsufficientXorForFee"
            >
              <template v-if="isInsufficientXorForFee"> INSUFFICIENT XOR BALANCE </template>
              <template v-else> CONFIRM </template>
            </s-button>
            <a
              v-else
              class="btn w-100"
              :href="googleFormLink"
              target="_blank"
              rel="nofollow noopener"
              @click="handleSubmitGoogleForm"
            >
              <s-button type="primary" size="big" class="btn w-100">SUBMIT FORM</s-button>
            </a>
          </div>

          <div class="cart-row t-a-c text-1">
            Acknowledge that I am over 21 years of age and
            <br />
            I am not acting in violation of my country's laws.
          </div>
        </s-form>
      </template>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Operation } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { action, mutation, state, getter } from '@/store/decorators';
import { lazyComponent } from '@/router';
import {
  Components,
  NOIR_ACCOUNT_ADDRESS,
  NOIR_FORM,
  NOIR_FORM_ADDRESS,
  NOIR_FORM_EMAIL,
  NOIR_FORM_NAME,
  NOIR_FORM_PHONE,
} from '@/consts';
import { getMaxValue, hasInsufficientXorForFee } from '@/utils';
import { NoirFormData } from '@/types/noir';

enum Steps {
  Agreement = 'agreement',
  SelectCount = 'count',
  ConfirmTx = 'confirm-tx',
  AddressForm = 'form',
}

@Component({
  components: {
    DialogBase,
    BigCounter: lazyComponent(Components.BigCounter),
  },
})
export default class RedeemDialog extends Mixins(DialogMixin, mixins.TransactionMixin, mixins.NumberFormatterMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.noir.redeemDialogVisibility redeemDialogVisibility!: boolean;
  @state.noir.agreementSigned agreementSigned!: boolean;

  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo token!: AccountAsset;

  @mutation.noir.setRedeemDialogVisibility private setVisibility!: (flag: boolean) => void;
  @mutation.noir.setCongratulationsDialogVisibility private setCongratulationsDialogVisibility!: (
    flag: boolean
  ) => void;

  @mutation.noir.setAgreement private setAgreement!: (flag: boolean) => void;

  @action.noir.redeem private redeem!: (count: number) => Promise<void>;

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

  get isFormVisible(): boolean {
    return [Steps.ConfirmTx, Steps.AddressForm].includes(this.currentStep);
  }

  get googleFormLink(): string {
    let link = `https://docs.google.com/forms/d/e/${NOIR_FORM}/formResponse`;
    link += `?entry.${NOIR_FORM_NAME}=${encodeURIComponent(this.form.name)}`;
    link += `&entry.${NOIR_FORM_ADDRESS}=${encodeURIComponent(this.form.address)}`;
    link += `&entry.${NOIR_FORM_EMAIL}=${encodeURIComponent(this.form.email)}`;
    link += `&entry.${NOIR_FORM_PHONE}=${encodeURIComponent(this.form.phone)}`;
    link += `&entry.${NOIR_ACCOUNT_ADDRESS}=${encodeURIComponent(this.account.address)}`;
    return link;
  }

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

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.tokenFrom, this.transferNetworkFee);
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
    this.currentStep = Steps.ConfirmTx;
  }

  async submitTransaction(): Promise<void> {
    try {
      await (this.$refs.form as any).validate();
      await this.transfer();
      this.currentStep = Steps.AddressForm;
    } catch (error) {
      console.warn(error);
    }
  }

  handleSubmitGoogleForm(): void {
    this.visibility = false;
    this.setCongratulationsDialogVisibility(true);
  }

  async transfer() {
    try {
      await this.withNotifications(async () => await this.redeem(this.redeemedCount));
    } catch (error) {
      console.error(error);
    }
  }
}
</script>
