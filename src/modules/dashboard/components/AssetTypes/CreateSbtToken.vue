<template>
  <wallet-base :title="t('createToken.titleCommon')" @back="handleBack" show-back>
    <div class="dashboard-create">
      <div v-if="step === Step.AssetsChoice">
        <search-input
          ref="search"
          v-model="query"
          class="select-currency__search"
          autofocus
          :placeholder="t('addAsset.searchInputText')"
          @clear="query = ''"
        />
        <div class="dashboard-create-regulated-asset">
          <s-button
            class="el-dialog__close"
            type="action"
            icon="plus-16"
            :disabled="loading"
            @click="createRegulatedAsset"
          />
          <span class="create">{{ 'Create new regulated asset' }}</span>
        </div>
        <div v-if="ownerRegulatedAssets?.length" class="dashboard-regulated-assets">
          <div class="delimiter">{{ 'OR SELECT EXISTING' }}</div>
          <div v-if="ownerRegulatedAssets?.length">
            <div v-for="(asset, index) in ownerRegulatedAssets" :key="index" class="assets-list">
              <el-checkbox-group v-model="checkList">
                <el-checkbox :label="asset.address">
                  <asset-list-item :asset="asset">
                    <template #default>
                      <span class="label">Regulated asset</span>
                    </template>
                  </asset-list-item>
                  <s-divider v-if="index < ownerRegulatedAssets.length - 1" />
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="step === Step.SbtMetaDescription">
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
      </div>
      <div v-else-if="step === Step.SbtMetaImage">
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
        <s-input :placeholder="'URL'" :minlength="1" :maxlength="80" :disabled="loading" v-model="ownerExternalUrl" />
        <p class="dashboard-create-token_desc">{{ 'This URL leads to your financial institution website' }}</p>
      </div>
      <div v-else-if="step === Step.SbtTxSign">
        <div class="dashboard-create-sbt-preview">
          <span>SBT</span>
          <span>SBTname</span>
        </div>
      </div>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-create__button"
        :disabled="disabledBtn"
        @click="handleCreate"
      >
        Continue
      </s-button>
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { mixins, components, WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action, getter, state } from '@/store/decorators';
import type { IMAGE_MIME_TYPES } from '@/types/image';
import { IpfsStorage } from '@/utils/ipfsStorage';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

enum Step {
  AssetsChoice = 'AssetsChoice',
  SbtMetaDescription = 'SbtMetaDescription',
  SbtMetaImage = 'SbtMetaImage',
  SbtTxSign = 'SbtTxSign',
}

@Component({
  components: {
    WalletBase: components.WalletBase,
    SearchInput: components.SearchInput,
    AssetListItem: components.AssetListItem,
    FileUploader: components.FileUploader,
  },
})
export default class CreateSbtToken extends Mixins(mixins.TransactionMixin, SubscriptionsMixin) {
  @state.dashboard.ownedAssetIds ownedAssetIds!: any;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;
  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @action.dashboard.requestOwnedAssetIds private requestOwnedAssetIds!: AsyncFnWithoutArgs;

  @Ref('fileInput') readonly fileInput!: HTMLInputElement;
  @Ref('uploader') readonly uploader!: HTMLFormElement;

  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
  readonly Step = Step;

  // meta info
  tokenSymbol = '';
  tokenName = '';
  tokenDescription = '';
  ownerExternalUrl = '';

  // image
  showFee = true;
  imageLoading = false;
  fileExceedsLimit = false;
  badSource = false;
  contentSrcLink = '';
  tokenContentIpfsParsed = '';
  tokenContentLink = '';
  file: Nullable<File> = null;

  step: Step = Step.AssetsChoice;
  query = '';
  selectedAssetsList = [];

  get ownerRegulatedAssets(): any {
    return [this.selectedAssetsList[0], this.xor];
  }

  get disabledBtn(): boolean {
    return false;
  }

  get checkList(): any {
    return this.selectedAssetsList;
  }

  set checkList(list) {
    this.selectedAssetsList = list;
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

  handleCreate(): void {
    // TODO: add condition on assets choice
    if (this.step === Step.AssetsChoice) {
      this.step = Step.SbtMetaDescription;
      return;
    }

    if (
      this.tokenSymbol.length &&
      this.tokenDescription &&
      this.tokenName.length &&
      this.step === Step.SbtMetaDescription
    ) {
      this.step = Step.SbtMetaImage;
      return;
    }

    // TODO: improve condition
    if (this.tokenContentLink && this.step === Step.SbtMetaImage) {
      this.step = Step.SbtTxSign;
    }
  }

  handleBack(): void {
    switch (this.step) {
      case Step.AssetsChoice:
        this.$emit('go-back');
        return;
      case Step.SbtMetaDescription:
        this.step = Step.AssetsChoice;
        return;
      case Step.SbtMetaImage:
        this.step = Step.SbtMetaDescription;
        return;
      case Step.SbtTxSign:
        this.step = Step.SbtMetaImage;
        return;
      default:
        this.$emit('go-back');
        break;
    }
  }

  createRegulatedAsset(): void {
    this.$emit('go-to-create');
  }

  created(): void {
    this.requestOwnedAssetIds();
    this.selectedAssetsList = this.ownedAssetIds.map((address) => this.getAsset(address));
  }
}
</script>

<style lang="scss">
.dashboard-create {
  &-regulated-asset {
    margin-top: 24px;

    .create {
      margin-left: calc(var(--s-basic-spacing) * 1.5);
      font-size: var(--s-font-size-medium);
      font-weight: 500;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
    }
  }

  .dashboard-regulated-assets {
    .label {
      text-transform: uppercase;
      background-color: var(--s-color-base-on-accent);
      color: var(--s-color-base-content-secondary);
      font-weight: 650;
      font-size: 13px;
      border-radius: 16px;
      padding: 4px 8px;
    }

    .assets-list {
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;

      .el-checkbox {
        display: flex;
        align-items: center;

        &__inner {
          border-radius: 50%;
        }
      }
    }
  }

  &-sbt-preview {
    background-color: var(--s-color-base-border-secondary);
    padding: 16px;
  }

  &__button {
    margin-top: 16px;
    width: 100%;
  }

  .delimiter {
    display: flex;
    flex-direction: row;
    color: var(--s-color-base-content-secondary);
    text-transform: uppercase;
    margin-top: $basic-spacing;
    margin-bottom: $basic-spacing;
    font-weight: 600;
  }

  .delimiter::before,
  .delimiter::after {
    content: '';
    flex: 1 1;
    border-bottom: 2px solid var(--s-color-base-border-primary);
    margin: auto;
  }

  .el-divider {
    margin: 0;
  }
}
</style>
