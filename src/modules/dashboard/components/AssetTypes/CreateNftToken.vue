<template>
  <wallet-base :title="t('createToken.titleCommon')" @back="handleBack" show-back>
    <div class="dashboard-create">
      <template v-if="step === Step.FillMetaInfo">
        <s-input
          :placeholder="t('createToken.tokenSymbol.placeholder')"
          :minlength="1"
          :maxlength="7"
          :disabled="loading"
          v-maska="tokenSymbolMask"
          v-model="tokenSymbol"
        />
        <p class="dashboard-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
        <s-input
          :placeholder="t('createToken.tokenName.placeholder')"
          :minlength="1"
          :maxlength="33"
          :disabled="loading"
          v-maska="tokenNameMask"
          v-model="tokenName"
        />
        <p class="dashboard-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
        <s-input
          class="input-textarea"
          type="textarea"
          :placeholder="t('createToken.nft.description.placeholder')"
          :disabled="loading"
          :maxlength="200"
          v-model="tokenDescription"
          @keypress.native="handleTextAreaInput($event)"
        />
        <s-divider class="dashboard-create-token_divider" />
      </template>
      <template v-else-if="step === Step.AttachImage">
        <file-uploader
          ref="uploader"
          class="preview-image-create-nft"
          :is-link-provided="!!contentSrcLink"
          @upload="upload"
          @clear="clear"
          @show-limit="showLimit"
          @hide-limit="hideLimit"
        >
          <div v-if="imageLoading" v-loading="imageLoading" />
          <div v-else-if="fileExceedsLimit" class="placeholder">
            <s-icon class="preview-image-create-nft__icon icon--error" name="basic-clear-X-24" size="32px" />
            <span>{{ t('createToken.nft.image.placeholderFileLimit', { value: FILE_SIZE_LIMIT }) }}</span>
            <s-button class="preview-image-create-nft__btn">{{ t('createToken.nft.source.limit') }}</s-button>
          </div>
          <div v-else-if="!tokenContentLink && !file" class="placeholder">
            <s-icon class="preview-image-create-nft__icon" name="camera-16" size="32px" />
            <span class="preview-image-create-nft__placeholder">{{
              t('createToken.nft.image.placeholderNoImage')
            }}</span>
          </div>
          <div v-else-if="badSource && !file" class="placeholder">
            <s-icon class="preview-image-create-nft__icon icon--error" name="basic-clear-X-24" size="32px" />
            <span class="preview-image-create-nft__placeholder">{{
              t('createToken.nft.image.placeholderBadSource')
            }}</span>
          </div>
          <div v-else class="image">
            <img class="preview-image-create-nft__content" :src="contentSrcLink" />
          </div>
        </file-uploader>
      </template>
    </div>
    <s-button
      type="primary"
      class="s-typography-button--large action-button dashboard-create__button"
      :disabled="disabled"
      @click="onCreate"
    >
      <template v-if="isInsufficientXorForFee">
        {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
      </template>
      <template v-else>{{ title }}</template>
    </s-button>

    <!-- <wallet-fee v-if="!isCreateDisabled && showFee" :value="fee" /> -->
  </wallet-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR, MaxTotalSupply } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { ZeroStringValue } from '@/consts';
import { getter, state } from '@/store/decorators';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

export enum Step {
  FillMetaInfo = 'FillMetaInfo',
  AttachImage = 'AttachImage',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    // WalletFee: components.WalletFee,
  },
})
export default class CreateNftToken extends Mixins(
  mixins.TransactionMixin,
  mixins.FormattedAmountMixin,
  mixins.NetworkFeeWarningMixin
) {
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
  readonly xorSymbol = XOR.symbol;
  readonly decimals = FPNumber.DEFAULT_PRECISION;
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly maxTotalSupply = MaxTotalSupply;
  readonly TokenTabs = WALLET_CONSTS.TokenTabs;
  readonly Step = Step;

  step: Step = Step.FillMetaInfo;
  tokenSymbol = '';
  tokenName = '';
  tokenSupply = '';
  tokenDescription = '';
  extensibleSupply = false;
  showFee = true;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  currentTab = WALLET_CONSTS.TokenTabs.Token;

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Create asset';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RegisterAsset];
  }

  get fee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFees.RegisterAsset);
  }

  get isCreateDisabled(): boolean {
    return !(this.tokenSymbol && this.tokenName.trim() && +this.tokenSupply);
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee;
  }

  get hasEnoughXor(): boolean {
    const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
    if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
      return false;
    }
    const fpAccountXor = this.getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
    return FPNumber.gte(fpAccountXor, this.fee);
  }

  handleChangeTab(value: WALLET_CONSTS.TokenTabs): void {
    this.currentTab = value;
  }

  handleTextAreaInput(e: KeyboardEvent): boolean | void {
    if (/^[A-Za-z0-9 _',.#]+$/.test(e.key)) return true;
    e.preventDefault();
  }

  async registerAsset(): Promise<void> {
    return api.assets.register(this.tokenSymbol, this.tokenName.trim(), this.tokenSupply, this.extensibleSupply);
  }

  async onCreate(): Promise<void> {
    if (!this.tokenSymbol.length || !this.tokenSupply.length || !this.tokenName.length) {
      return;
    }

    this.tokenSupply = this.getCorrectSupply(this.tokenSupply, this.decimals);

    if (this.allowFeePopup && this.hasEnoughXor && !this.isXorSufficientForNextTx({ type: Operation.RegisterAsset })) {
      this.showFee = false;
      // TODO: show warning
      return;
    }

    await this.withNotifications(async () => {
      if (!this.hasEnoughXor) {
        throw new Error('walletSend.badAmount');
      }
      await this.registerAsset();
      // TODO: choose where to follow
      // this.navigate({ name: RouteNames.Wallet });
    });
  }

  handleBack(): void {
    this.$emit('go-back');
  }
}
</script>

<style lang="scss">
.dashboard-create {
  @include custom-tabs;

  &__tab {
    margin: 8px 0 #{$basic-spacing-mini} 0;
  }

  .el-textarea {
    height: 78px;

    &__inner {
      resize: none;
      scrollbar-width: none; /* Firefox - not customizable */

      &:hover::-webkit-scrollbar {
        width: 4px;

        &-thumb {
          background-color: var(--s-color-base-content-tertiary);
          border-radius: 6px;
        }
      }

      &::-webkit-scrollbar {
        width: 4px;

        &-track {
          margin-bottom: calc(var(--s-size-small) * 0.25);
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.dashboard-create {
  &-token {
    &_desc {
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-extra-small);
      font-weight: 300;
      line-height: var(--s-line-height-base);
      padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
    }
    &_supply-block {
      @include switch-block;
      padding: 0 #{$basic-spacing-small};
    }
    &_action {
      margin-top: #{$basic-spacing-medium};
      width: 100%;
    }
    &_type {
      margin-left: 8px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--s-color-base-content-secondary);
    }
    &_divider {
      margin: 0 0 20px 0;
    }
  }

  .input-textarea {
    margin-bottom: 16px;
  }

  .el-textarea {
    height: 54px;

    &__inner {
      resize: none;
      scrollbar-width: none; /* Firefox - not customizable */

      &:hover::-webkit-scrollbar {
        width: 4px;

        &-thumb {
          background-color: var(--s-color-base-content-tertiary);
          border-radius: 6px;
        }
      }

      &::-webkit-scrollbar {
        width: 4px;

        &-track {
          margin-bottom: calc(var(--s-size-small) * 0.25);
        }
      }
    }
  }

  &__button {
    width: 100%;
    margin-bottom: 16px;
  }
}
</style>
