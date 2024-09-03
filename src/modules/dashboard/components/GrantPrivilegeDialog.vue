<template>
  <dialog-base :title="'Issue SBT Access'" :visible.sync="isVisible">
    <div class="dashboard-give-access">
      <p class="p3 dashboard-give-access__text">ENTER AN ADDRESS FOR ISSUANCE</p>
      <address-book-input
        class="dashboard-give-access__address"
        v-model="address"
        :is-valid="validAddress"
        :disabled="loading"
      />
      <p class="p3 dashboard-give-access__text">SELECT WHEN ACCESS WILL END</p>
      <s-date-picker
        v-model="value"
        value-format="timestamp"
        type="date"
        :placeholder="datePlaceholder"
        @change="handleDatePickerChange"
      />
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-give-access__button"
        :disabled="disabled"
        @click="handleGiveAccess"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyAddress">
          {{ t('walletSend.enterAddress') }}
        </template>
        <template v-else-if="emptyValue">
          {{ 'Select date' }}
        </template>
        <template v-else>{{ 'Issue access' }}</template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    AddressBookInput: components.AddressBookInput,
  },
})
export default class GrantPrivilegeDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  @Prop({ type: String, default: '' }) readonly sbtAddress!: string;

  readonly xorSymbol = XOR.symbol;

  address = '';
  value = '';
  datePlaceholder = 'Pick a day';

  get validAddress(): boolean {
    return !this.emptyAddress && api.validateAddress(this.address);
  }

  get emptyAddress(): boolean {
    return !this.address.trim();
  }

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.SetAccessExpiration];
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.emptyValue || !this.validAddress;
  }

  get emptyValue(): boolean {
    return !+this.value;
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  handleDatePickerChange(): void {
    this.emptyValue ? (this.datePlaceholder = 'Pick a day') : (this.datePlaceholder = '');
  }

  async handleGiveAccess(): Promise<void> {
    try {
      await this.withNotifications(async () => {
        const sbtAsset = await api.assets.getAssetInfo(this.sbtAddress);
        await api.extendedAssets.givePrivilege(this.address, sbtAsset, Number(this.value));
        this.isVisible = false;
      });
    } catch (error) {
      console.error(error);
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-give-access {
  @include full-width-button('action-button');

  &__address,
  &__button,
  &__text {
    margin-bottom: 16px;
  }

  &__text {
    font-weight: 600;
    color: var(--s-color-base-content-secondary);
  }
}
</style>

<style lang="scss">
.dashboard-give-access {
  .s-date-picker {
    .el-date-editor {
      .el-input__inner {
        box-shadow: var(--s-shadow-element);
      }
    }
  }
}
</style>
