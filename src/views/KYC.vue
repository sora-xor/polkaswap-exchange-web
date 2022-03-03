<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header :title="t('kyc.title')" />
    <s-form :model="model" class="kyc-form" @submit.native.prevent="submitForm">
      <s-form-item prop="name">
        <s-input :placeholder="t('kyc.form.name')" v-model="model.name" />
      </s-form-item>
      <s-form-item prop="surname">
        <s-input :placeholder="t('kyc.form.surname')" v-model="model.surname" />
      </s-form-item>
      <s-form-item prop="address">
        <s-input :placeholder="t('kyc.form.address')" v-model="model.address" />
      </s-form-item>
      <s-form-item prop="dob">
        <s-date-picker
          :placeholder="t('kyc.form.dob')"
          v-model="model.dob"
          size="big"
          :clearable="false"
          class="kyc-form-datepicker"
        />
      </s-form-item>
      <s-form-item prop="id">
        <s-input :placeholder="t('kyc.form.id')" v-model="model.id" />
      </s-form-item>
      <s-form-item prop="country">
        <s-input :placeholder="t('kyc.form.country')" v-model="model.country" />
      </s-form-item>

      <s-button
        type="primary"
        native-type="submit"
        class="kyc-form-button s-typography-button--large"
        :disabled="!formDataChanged"
      >{{ t('kyc.save') }}</s-button>
      <s-button type="secondary" class="kyc-form-button s-typography-button--large" @click="resetForm">{{
        t('kyc.reset')
      }}</s-button>
    </s-form>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Action, State } from 'vuex-class';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';

const KYCModel = {
  name: '',
  surname: '',
  address: '',
  country: '',
  dob: '',
  id: '',
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
})
export default class KYC extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @State((state) => state.settings.kycData) kycData!: any;
  @Action setKycData!: (model: any) => void;
  @Action getKYCData!: () => void;

  model: any = { ...KYCModel };

  async created(): Promise<void> {
    this.getKYCData();
    this.model = Object.keys(KYCModel).reduce(
      (result, key) => ({
        ...result,
        [key]: this.kycData[key] ?? KYCModel[key],
      }),
      {}
    );
  }

  get formDataChanged(): boolean {
    return JSON.stringify(this.kycData) !== JSON.stringify(this.model);
  }

  submitForm(): void {
    this.setKycData(this.model);
    this.$notify({
      message: this.t('kyc.notification.saved'),
      type: 'success',
      title: '',
    });
  }

  resetForm(): void {
    this.model = { ...KYCModel };
    this.setKycData(this.model);
    this.$notify({
      message: this.t('kyc.notification.reset'),
      type: 'success',
      title: '',
    });
  }
}
</script>

<style lang="scss">
.kyc-form-datepicker.s-date-picker.s-input-type {
  &,
  &:hover {
    .s-placeholder {
      background: transparent;
    }
    .el-input__inner {
      box-shadow: var(--s-shadow-element);
      font-size: var(--s-font-size-small);
    }
  }
}
</style>

<style lang="scss" scoped>
.kyc-form {
  > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-button {
    width: 100%;

    & + & {
      margin-left: 0;
    }
  }
}
</style>
