<template>
  <div class="fix-issues-dialog">
    <dialog-base :visible.sync="isVisible" :title="`Fix or remove issues`" custom-class="dialog__fix-issues">
      <div class="issues-iterator">
        <button @click="changeIssueIdx(-1)">
          <s-icon class="icon-status" name="chevron-left-16" />
        </button>
        <div>{{ `Issue ${currentIssueIdx + 1}/${totalIssuesCount}` }}</div>
        <button @click="changeIssueIdx(1)">
          <s-icon class="icon-status" name="chevron-right-16" />
        </button>
      </div>
      <s-form :model="model" class="kyc-form">
        <s-form-item prop="name">
          <s-input :placeholder="'Recipient'" v-model="model.name" />
        </s-form-item>
        <s-form-item prop="wallet">
          <s-input :placeholder="'Wallet'" v-model="model.wallet" />
          <!-- <p v-if="walletError" class="error-message">wallet ADDRESS incorrect</p> -->
          <div class="error-message" :class="!walletError ? 'error-message_valid' : 'error-message_invalid'">
            <div>{{ `wallet ADDRESS ${walletError ? 'incorrect' : 'correct'}` }}</div>
            <div>
              <s-icon class="icon-status" :name="!walletError ? 'basic-check-marks-24' : 'basic-clear-X-xs-24'" />
            </div>
          </div>
        </s-form-item>
        <s-form-item prop="usd">
          <s-input :placeholder="'USD'" v-model="model.usd" />
          <div class="error-message" :class="!usdError ? 'error-message_valid' : 'error-message_invalid'">
            <div>{{ `USD number is ${usdError ? 'incorrect' : 'correct'}` }}</div>
            <div>
              <s-icon class="icon-status" :name="!usdError ? 'basic-check-marks-24' : 'basic-clear-X-xs-24'" />
            </div>
          </div>
        </s-form-item>
      </s-form>
      <div class="field">
        <p class="field__label">{{ 'ASSET' }}</p>
        <div class="field__status">
          <div>{{ assetSymbol }}</div>
          <div>
            <token-logo class="token-logo" :token="model.asset" />
          </div>
        </div>
        <!-- <p class="field__status">{{ item.status }}</p> -->
      </div>
      <s-divider />
      <div class="field">
        <p class="field__label">{{ 'estimated amount' }}</p>
        <div class="field__status">
          <div>{{ amount }}</div>
          <div>{{ assetSymbol }}</div>
          <div>
            <token-logo class="token-logo" :token="model.asset" />
          </div>
        </div>
        <warning-message v-if="amountError" class="warning-message" :text="amountError" :isError="amountError" />
        <!-- <p class="field__status">{{ item.status }}</p> -->
      </div>
      <s-divider />
      <s-button
        type="primary"
        class="s-typography-button--big browse-button"
        @click.stop="onSaveClick"
        :disabled="submitIsDisabled"
      >
        {{ 'Fix issue' }}
      </s-button>
      <s-button type="primary" class="s-typography-button--big browse-button" @click.stop="onDeleteClick">
        {{ 'Delete recipient' }}
      </s-button>
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util/build';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import { action, mutation, state } from '@/store/decorators';
import { Recipient } from '@/store/routeAssets/types';
import validate from '@/store/routeAssets/utils';

import WarningMessage from './WarningMessage.vue';

const initModel: any = {
  name: '',
  wallet: '',
  asset: XOR,
  amount: 0,
  id: '',
  usd: 0,
};
@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    WarningMessage,
  },
})
export default class FixIssuesDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  // @mutation.routeAssets.editRecipient editRecipient!: any;
  @action.routeAssets.editRecipient editRecipient!: any;
  @action.routeAssets.deleteRecipient deleteRecipient!: any;
  @Prop() readonly recipient!: Recipient;
  @Prop() readonly currentIssueIdx!: number;
  @Prop() readonly totalIssuesCount!: number;

  model: any = { ...initModel };
  resetState(): void {
    this.model = { ...initModel };
  }

  get assetSymbol() {
    return this.model.asset?.symbol;
  }

  get amount() {
    return this.localTokenAmount;
  }

  get walletError() {
    return !api.validateAddress(this.model.wallet);
  }

  get usdError() {
    return !validate.usd(this.model.usd) ? 'Should be a number' : null;
  }

  get amountError() {
    return !validate.amount(this.model.amount) ? "Token price hasn't been found" : '';
  }

  changeIssueIdx(delta) {
    const newValue = this.currentIssueIdx + delta;
    if (newValue >= this.totalIssuesCount || newValue < 0) return;
    this.$emit('changeIssueIdx', newValue);
  }

  get localTokenAmount() {
    return (Number(this.model.usd) / Number(this.assetUSDPrice)).toLocaleString('en-US', {
      maximumFractionDigits: 4,
    });
  }

  get assetUSDPrice() {
    if (!this.model.asset?.address) return 0;
    return FPNumber.fromCodecValue(this.fiatPriceObject[this.model.asset.address] ?? 0, 18).toFixed(8);
  }

  get submitIsDisabled() {
    return !validate.validate(this.model);
  }

  onDeleteClick() {
    this.deleteRecipient(this.recipient.id);
  }

  onSaveClick() {
    this.editRecipient({
      name: this.model.name,
      wallet: this.model.wallet,
      usd: this.model.usd,
      id: this.recipient.id,
      asset: this.model.asset,
    });
  }

  @Watch('recipient', { immediate: true, deep: true })
  onRecipientChanged(newVal) {
    if (newVal) {
      Object.assign(this.model, this.recipient);
    } else {
      this.resetState();
    }
  }
}
</script>

<style lang="scss">
.dialog__fix-issues {
  .el-dialog {
    max-width: 468px;
    &__body {
      > div > div {
        margin-bottom: $inner-spacing-medium;
      }
    }
  }
  .token-logo {
    > span {
      width: 16px;
      height: 16px;
    }
  }

  .el-divider {
    margin: 0;
  }
}
</style>

<style lang="scss" scoped>
.browse-button {
  width: 100%;
  margin-bottom: 16px;
  margin-left: 0;
  margin-right: 0;

  &:first {
    margin-top: 24px;
  }
}

.field {
  text-transform: uppercase;
  font-weight: 300;
  font-size: 13px;
  @include flex-between;
  position: relative;

  &__status {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    font-weight: 600;
  }
}

.error-message {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;

  &_invalid {
    color: var(--s-color-status-error);
    fill: var(--s-color-status-error);
  }

  &_valid {
    color: var(--s-color-status-success);
    fill: var(--s-color-status-success);
  }

  i {
    font-size: 16px !important;
    color: inherit;
  }
}

.issues-iterator {
  @include flex-center;
  width: 120px;
  margin-left: auto;
  margin-right: auto;
  height: 40px;
  background: var(--s-color-base-content-primary);
  color: white;
  gap: 8px;
  border-radius: 12px;
  i {
    color: inherit;
  }

  button {
    background: var(--s-color-base-content-primary);
    padding: 0;
    border: 0;
    color: white;
    cursor: pointer;
  }
}

.warning-message {
  position: absolute;
  bottom: 0;
  margin-bottom: -12px;
}
</style>
