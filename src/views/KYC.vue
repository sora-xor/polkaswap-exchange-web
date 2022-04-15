<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header :title="t('adar.kyc.title')" />
    <s-form :model="model" class="kyc-form" @submit.native.prevent="submitForm">
      <s-form-item prop="name">
        <s-input :placeholder="t('adar.kyc.form.name')" v-model="model.name" />
      </s-form-item>
      <s-form-item prop="surname">
        <s-input :placeholder="t('adar.kyc.form.surname')" v-model="model.surname" />
      </s-form-item>
      <s-form-item prop="address">
        <s-input :placeholder="t('adar.kyc.form.address')" v-model="model.address" />
      </s-form-item>
      <s-form-item prop="dob">
        <s-date-picker
          :placeholder="t('adar.kyc.form.dob')"
          v-model="model.dob"
          size="big"
          :clearable="false"
          class="kyc-form-datepicker"
        />
      </s-form-item>
      <s-form-item prop="id">
        <s-input :placeholder="t('adar.kyc.form.id')" v-model="model.id" />
      </s-form-item>
      <s-form-item prop="country">
        <s-input :placeholder="t('adar.kyc.form.country')" v-model="model.country" />
      </s-form-item>

      <s-button
        type="primary"
        native-type="submit"
        class="kyc-form-button s-typography-button--large"
        :disabled="!formDataChanged"
      >
        {{ t('adar.kyc.save') }}
      </s-button>
      <s-button type="secondary" class="kyc-form-button s-typography-button--large" @click="resetForm">{{
        t('adar.kyc.reset')
      }}</s-button>
    </s-form>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { state, mutation } from '@/store/decorators';

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
  @mutation.settings.setKYCData private setKycData!: (model: any) => void;
  @state.settings.kycData private kycData!: any;

  model: any = { ...KYCModel };

  async created(): Promise<void> {
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
      message: this.t('adar.kyc.notification.saved'),
      type: 'success',
      title: '',
    });
  }

  resetForm(): void {
    this.model = { ...KYCModel };
    this.setKycData(this.model);
    this.$notify({
      message: this.t('adar.kyc.notification.reset'),
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
