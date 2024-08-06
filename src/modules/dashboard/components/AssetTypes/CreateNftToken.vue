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
        <s-button
          type="primary"
          class="s-typography-button--large action-button dashboard-create__button"
          :disabled="isNextDisabled"
          @click="onNext"
        >
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
          </template>
          <template v-else-if="!tokenSymbol">{{ t('createToken.enterSymbol') }}</template>
          <template v-else-if="!tokenName.trim()">{{ t('createToken.enterName') }}</template>
          <template v-else-if="!tokenDescription">{{ t('createToken.enterTokenDescription') }}</template>
          <template v-else>{{ 'NEXT' }}</template>
        </s-button>
      </template>
      <template v-else-if="step === Step.AttachImage">
        <s-input
          :placeholder="t('createToken.nft.link.placeholder')"
          :minlength="1"
          :maxlength="200"
          :disabled="loading"
          v-model="tokenContentLink"
          @input="handleInputLinkChange"
        >
          <s-tooltip
            slot="suffix"
            popper-class="ipfs-tooltip"
            :content="t('createToken.nft.link.tooltip')"
            placement="bottom"
            tabindex="-1"
          >
            <s-icon class="ipfs-tooltip__icon" name="info-16" size="18px" />
          </s-tooltip>
        </s-input>
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
        <s-button
          type="primary"
          class="s-typography-button--large action-button dashboard-create__button"
          :disabled="isCreateDisabled"
          @click="onCreate"
        >
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
          </template>
          <template v-else-if="badSource || !tokenContentLink">{{ t('createToken.provideContent') }}</template>
          <template v-else>{{ t('createToken.actionNFT') }}</template>
        </s-button>
      </template>
    </div>

    <wallet-fee v-if="!isCreateDisabled && showFee && step === Step.AttachImage" :value="fee" />
  </wallet-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR, MaxTotalSupply } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { File as ImageNFT } from 'nft.storage';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import { DashboardPageNames } from '@/modules/dashboard/consts';
import router from '@/router';
import { state, action } from '@/store/decorators';
import { IMAGE_MIME_TYPES } from '@/types/image';
import { IpfsStorage } from '@/utils/ipfsStorage';

import type { CodecString } from '@sora-substrate/util';
import type { NFTStorage } from 'nft.storage';

export enum Step {
  FillMetaInfo = 'FillMetaInfo',
  AttachImage = 'AttachImage',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    WalletFee: components.WalletFee,
    FileUploader: components.FileUploader,
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
  readonly FILE_SIZE_LIMIT = 100; // in megabytes
  readonly Step = Step;

  @Ref('fileInput') readonly fileInput!: HTMLInputElement;
  @Ref('uploader') readonly uploader!: HTMLFormElement;

  step: Step = Step.FillMetaInfo;
  tokenSymbol = '';
  tokenName = '';
  tokenDescription = '';
  showFee = true;
  imageLoading = false;
  fileExceedsLimit = false;
  badSource = false;
  contentSrcLink = '';
  tokenContentIpfsParsed = '';
  tokenContentLink = '';
  file: Nullable<File> = null;

  @state.settings.nftStorage private nftStorage!: NFTStorage;
  @action.settings.createNftStorageInstance private createNftStorageInstance!: AsyncFnWithoutArgs;

  get titleCreate(): string {
    return this.step === Step.FillMetaInfo ? 'Next' : 'Create NFT';
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RegisterAsset];
  }

  get fee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFees.RegisterAsset);
  }

  get isCreateDisabled(): boolean {
    return (
      !(this.tokenSymbol && this.tokenName.trim() && this.tokenDescription.trim()) ||
      this.badSource ||
      !(this.file || this.tokenContentLink)
    );
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

  get isNextDisabled(): boolean {
    return (
      !(this.tokenSymbol && this.tokenName.trim() && this.tokenDescription.trim()) ||
      this.loading ||
      this.isInsufficientXorForFee
    );
  }

  get hasEnoughXor(): boolean {
    const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
    if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
      return false;
    }
    const fpAccountXor = this.getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
    return FPNumber.gte(fpAccountXor, this.fee);
  }

  isValidType(type: string): boolean {
    return Object.values(IMAGE_MIME_TYPES).includes(type);
  }

  handleTextAreaInput(e: KeyboardEvent): boolean | void {
    if (/^[A-Za-z0-9 _',.#]+$/.test(e.key)) return true;
    e.preventDefault();
  }

  handleInputLinkChange(link: string): void {
    this.uploader.resetFileInput();
    this.resetFileInput();
    this.fileExceedsLimit = false;
    this.contentSrcLink = '';

    try {
      const url = new URL(link);
    } catch {
      this.badSource = true;
      return;
    }

    this.checkImageFromSource(link);
  }

  async checkImageFromSource(url: string): Promise<void> {
    this.imageLoading = true;
    this.badSource = false;

    try {
      const response = await fetch(url);
      const buffer = await response.blob();
      this.imageLoading = false;

      if (this.isValidType(buffer.type)) {
        this.badSource = false;
        this.contentSrcLink = url;
        this.tokenContentIpfsParsed = IpfsStorage.getIpfsPath(url);
      } else {
        this.badSource = true;
        this.contentSrcLink = '';
      }
    } catch (error) {
      this.badSource = true;
      this.contentSrcLink = '';
    }

    this.resetFileInput();
  }

  async upload(file: File): Promise<void> {
    this.imageLoading = true;
    this.file = file;
    this.contentSrcLink = await IpfsStorage.fileToBase64(file);
    this.badSource = false;
    this.imageLoading = false;
    this.tokenContentLink = '';
  }

  clear(): void {
    this.tokenContentLink = '';
    this.contentSrcLink = '';
    this.resetFileInput();
  }

  resetFileInput(): void {
    this.file = null;
    this.imageLoading = false;
  }

  showLimit(): void {
    this.contentSrcLink = '';
    this.fileExceedsLimit = true;
  }

  hideLimit(): void {
    this.contentSrcLink = '';
    this.fileExceedsLimit = false;
  }

  async storeNftImage(file: File): Promise<void> {
    const content = (await IpfsStorage.fileToBuffer(file)) as ArrayBuffer;

    if (!this.nftStorage) {
      await this.createNftStorageInstance();
    }

    try {
      const metadata = await this.nftStorage.store({
        name: file.name,
        description: this.tokenDescription,
        image: new ImageNFT([content], file.name, { type: file.type }),
      });

      this.tokenContentIpfsParsed = IpfsStorage.getIpfsPath(metadata.embed().image.href);
    } catch (error) {
      console.error('Error while storing NFT content:', error);
    }
  }

  async registerNftAsset(): Promise<void> {
    if (!this.tokenContentIpfsParsed.trim()) {
      throw new Error('IPFS Token issue');
    }
    return api.assets.register(this.tokenSymbol, this.tokenName.trim(), 1, false, false, {
      content: this.tokenContentIpfsParsed,
      description: this.tokenDescription.trim(),
    });
  }

  onNext(): void {
    if (this.tokenSymbol.length && this.tokenDescription && this.tokenName.length && this.step === Step.FillMetaInfo) {
      this.step = Step.AttachImage;
    }
  }

  async onCreate(): Promise<void> {
    if (!this.tokenSymbol.length || !this.tokenDescription.length || !this.tokenName.length || this.badSource) {
      return;
    }

    if (this.allowFeePopup && this.hasEnoughXor && !this.isXorSufficientForNextTx({ type: Operation.RegisterAsset })) {
      this.showFee = false;
      // TODO: show warning
      return;
    }

    await this.withNotifications(async () => {
      if (!this.hasEnoughXor) {
        throw new Error('walletSend.badAmount');
      }
      if (this.file) {
        await this.storeNftImage(this.file);
      }
      await this.registerNftAsset();
      router.push({ name: DashboardPageNames.AssetOwner });
    });
  }

  handleBack(): void {
    if (this.step === Step.AttachImage) {
      this.step = Step.FillMetaInfo;
      return;
    }

    this.$emit('go-back');
  }
}
</script>

<style lang="scss">
.dashboard-create {
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
