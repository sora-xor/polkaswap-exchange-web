<template>
  <div class="wallet-settings-create-token">
    <template v-if="step === Step.CreateSimpleToken">
      <s-input
        v-model="tokenSymbol"
        v-maska="tokenSymbolMask"
        :placeholder="t('createToken.tokenSymbol.placeholder')"
        :minlength="1"
        :maxlength="7"
        :disabled="loading"
      ></s-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
      <s-input
        v-model="tokenName"
        v-maska="tokenNameMask"
        :placeholder="t('createToken.tokenName.placeholder')"
        :minlength="1"
        :maxlength="33"
        :disabled="loading"
      ></s-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
      <s-float-input
        v-model="tokenSupply"
        :placeholder="t('createToken.tokenSupply.placeholder')"
        :decimals="decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="maxTotalSupply"
        :disabled="loading"
      ></s-float-input>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSupply.desc') }}</p>
      <div class="wallet-settings-create-token_supply-block">
        <s-switch v-model="extensibleSupply" :disabled="loading"></s-switch>
        <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
      </div>
      <p class="wallet-settings-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :loading="loading"
        :disabled="isCreateDisabled"
        @click="onCreate"
      >
        <template v-if="!tokenSymbol">{{ t('createToken.enterSymbol') }}</template>
        <template v-else-if="!tokenName.trim()">{{ t('createToken.enterName') }}</template>
        <template v-else-if="!+tokenSupply">{{ t('createToken.enterSupply') }}</template>
        <template v-else>{{ t('createTokenText') }}</template>
      </s-button>
    </template>
    <template v-else-if="step === Step.Warn">
      <network-fee-warning-dialog :fee="formattedFee" @confirm="confirmNextTxFailure"></network-fee-warning-dialog>
    </template>
    <template v-else-if="step === Step.ConfirmSimpleToken">
      <info-line :label="t('createToken.tokenSymbol.placeholder')" :value="tokenSymbol"></info-line>
      <info-line :label="t('createToken.tokenName.placeholder')" :value="tokenName.trim()"></info-line>
      <info-line :label="t('createToken.tokenSupply.placeholder')" :value="formattedTokenSupply"></info-line>
      <info-line
        :label="t('createToken.extensibleSupply.placeholder')"
        :value="extensibleSupply ? 'Yes' : 'No'"
      ></info-line>
      <account-confirmation-option with-hint class="wallet-settings-create-token_action"></account-confirmation-option>
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :disabled="!hasEnoughXor"
        :loading="loading"
        @click="onConfirm"
      >
        <template v-if="!hasEnoughXor">{{ t('insufficientBalanceText', { symbol: XOR }) }}</template>
        <template v-else>{{ t('confirmText') }}</template>
      </s-button>
    </template>
    <wallet-fee v-if="!isCreateDisabled && showFee" :value="fee"></wallet-fee>
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { MaxTotalSupply, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { defineComponent, type PropType } from 'vue';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { RouteNames, Step } from '../consts';

import AccountConfirmationOption from './Account/Settings/ConfirmationOption.vue';
import InfoLine from './InfoLine.vue';
import NetworkFeeWarningMixin from './mixins/NetworkFeeWarningMixin';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
import TransactionMixin from './mixins/TransactionMixin';
import NetworkFeeWarningDialog from './NetworkFeeWarning.vue';
import WalletFee from './WalletFee.vue';

import type { Route } from '@/stores/router/types';

export default defineComponent({
  components: {
    InfoLine,
    WalletFee,
    NetworkFeeWarningDialog,
    AccountConfirmationOption,
  },
  mixins: [TransactionMixin, NumberFormatterMixin, NetworkFeeWarningMixin],
  props: {
    step: {
      default: Step.CreateSimpleToken,
      type: String as PropType<Step>,
    },
  },
  emits: ['showTabs', 'showHeader', 'stepChange'],
  data() {
    return {
      XOR: XOR.symbol,
      Step,
      decimals: FPNumber.DEFAULT_PRECISION,
      delimiters: FPNumber.DELIMITERS_CONFIG,
      maxTotalSupply: MaxTotalSupply,
      tokenSymbolMask: 'AAAAAAA',
      tokenNameMask: { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } },
      tokenSymbol: '',
      tokenName: '',
      tokenSupply: '',
      extensibleSupply: false,
      showFee: true,
    };
  },
  computed: {
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
    walletStore(this: any) {
      return useWalletStore(this.$pinia);
    },
    isConfirmTxDisabled(this: any): boolean {
      return this.walletStore.isConfirmTxDialogDisabled;
    },
    fee(this: any): FPNumber {
      return this.getFPNumberFromCodec(this.networkFees.RegisterAsset);
    },
    formattedFee(this: any): string {
      return this.fee.toLocaleString();
    },
    isCreateDisabled(this: any): boolean {
      return !(this.tokenSymbol && this.tokenName.trim() && +this.tokenSupply);
    },
    formattedTokenSupply(this: any): string {
      return this.formatStringValue(this.tokenSupply, this.decimals);
    },
    hasEnoughXor(this: any): boolean {
      const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
      if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
        return false;
      }
      const fpAccountXor = this.getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
      return FPNumber.gte(fpAccountXor, this.fee);
    },
  },
  methods: {
    navigate(this: any, options: Route): void {
      this.routerStore.navigate(options);
    },
    async registerAsset(this: any): Promise<void> {
      return api.assets.register(this.tokenSymbol, this.tokenName.trim(), this.tokenSupply, this.extensibleSupply);
    },
    async onCreate(this: any): Promise<void> {
      if (!this.tokenSymbol.length || !this.tokenSupply.length || !this.tokenName.length) {
        return;
      }

      this.tokenSupply = this.getCorrectSupply(this.tokenSupply, this.decimals);

      this.$emit('showTabs');

      if (
        this.allowFeePopup &&
        this.hasEnoughXor &&
        !this.isXorSufficientForNextTx({ type: Operation.RegisterAsset })
      ) {
        this.$emit('showHeader');
        this.showFee = false;
        this.$emit('stepChange', Step.Warn);
        return;
      }

      if (this.isConfirmTxDisabled) {
        await this.onConfirm();
      } else {
        this.showFee = true;
        this.$emit('stepChange', Step.ConfirmSimpleToken);
      }
    },
    async onConfirm(this: any): Promise<void> {
      await this.withNotifications(async () => {
        if (!this.hasEnoughXor) {
          throw new Error('insufficientBalanceText');
        }
        await this.registerAsset();
        this.navigate({ name: RouteNames.Wallet });
      });
    },
    confirmNextTxFailure(this: any): void {
      this.$emit('showHeader');
      this.showFee = true;
      this.$emit('stepChange', Step.ConfirmSimpleToken);
    },
  },
});
</script>

<style scoped lang="scss">
.wallet-settings-create-token {
  &_desc {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
  }
  &_supply-block {
    @include switch-block;
    & {
      padding: 0 #{$basic-spacing-small};
    }
  }
  &_action {
    margin-top: #{$basic-spacing-medium};
    width: 100%;
  }
  &_divider {
    margin: unset;
  }
}
</style>
