<template>
  <wallet-base :title="titleText" @back="handleBack" show-back>
    <div class="dashboard-create">
      <div v-if="step === Step.AssetsChoice">
        <search-input
          ref="search"
          v-model="query"
          class="regulated-assets__search"
          autofocus
          :placeholder="t('addAsset.searchInputText')"
          @clear="handleClearSearch"
        />
        <div v-if="!isOnlyAttach" class="dashboard-create-button">
          <s-button type="action" icon="plus-16" :disabled="loading" @click="createRegulatedAsset" />
          <span class="create">{{ t('assetOwner.createRegulatedAsset') }}</span>
        </div>
        <div v-if="ownerAssetsList?.length" class="dashboard-regulated-assets">
          <div class="delimiter">
            {{ !isOnlyAttach ? t('assetOwner.orSelectExisting') : t('assetOwner.selectExisting') }}
          </div>
          <div v-if="filteredRegulatedAssets?.length">
            <s-scrollbar class="dashboard-regulated-assets__scrollbar">
              <div class="assets-list">
                <div v-for="(asset, index) in filteredRegulatedAssets" :key="index" class="assets-list__item">
                  <el-checkbox-group v-model="checkList">
                    <el-checkbox :label="asset.address">
                      <asset-list-item :asset="asset" :pinnable="false">
                        <template #default>
                          <span class="label">Regulated</span>
                        </template>
                      </asset-list-item>
                      <s-divider v-if="index < filteredRegulatedAssets.length - 1" />
                    </el-checkbox>
                  </el-checkbox-group>
                </div>
              </div>
            </s-scrollbar>
          </div>
          <div v-else class="dashboard-regulated-assets--not-found">{{ t('addAsset.empty') }}</div>
        </div>
        <div v-else-if="isOnlyAttach" class="dashboard-regulated-assets--not-found">{{ t('addAsset.empty') }}</div>
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
          :disabled="true"
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
          @click.native="openFileUpload"
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
            <img
              class="preview-image-create-nft__content"
              :src="contentSrcLink"
              :alt="WALLET_CONSTS.TranslationConsts.SBT"
            />
          </div>
        </file-uploader>
        <!-- <s-input :placeholder="'URL'" :minlength="1" :maxlength="80" :disabled="loading" v-model="ownerExternalUrl" />
        <p class="dashboard-create-token_desc">{{ 'This URL leads to your financial institution website' }}</p> -->
      </div>
      <div v-else-if="step === Step.SbtTxSign">
        <div class="dashboard-create-sbt-preview">
          <div class="preview-image">
            <img src="" :alt="WALLET_CONSTS.TranslationConsts.SBT" />
          </div>
          <div class="meta">
            <span class="symbol">{{ tokenSymbol }}</span>
            <span class="name">{{ tokenName }}</span>
          </div>
        </div>
        <div class="dashboard-regulated-assets-attached">
          <div class="assets-list-subtitle">
            {{ t('assetOwner.attachedRegulatedAssets') }} <span class="number">{{ selectedAssetsIds.length }}</span>
          </div>
          <s-scrollbar class="dashboard-regulated-assets__scrollbar" :key="scrollbarComponentKey">
            <div class="selected-assets">
              <div v-for="(asset, index) in selectedRegulatedAssets" :key="index" class="assets-list">
                <asset-list-item :asset="asset" :pinnable="false">
                  <template #default>
                    <s-icon class="delete-icon" name="basic-trash-24" @click.native="removeAsset(asset)" />
                  </template>
                </asset-list-item>
                <s-divider v-if="index < selectedRegulatedAssets.length - 1" />
              </div>
            </div>
          </s-scrollbar>
          <div class="dashboard-create-button">
            <s-button
              class="el-dialog__close"
              type="action"
              icon="plus-16"
              :disabled="loading"
              @click="step = Step.AssetsChoice"
            />
            <span class="create">{{ t('assetOwner.addRegulatedAsset') }}</span>
          </div>
        </div>
      </div>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-create__button"
        :disabled="disabledBtn"
        @click="handleCreate"
      >
        {{
          step === Step.SbtTxSign
            ? t('assetOwner.createSbt', { type: WALLET_CONSTS.TranslationConsts.SBT })
            : t('continueText')
        }}
      </s-button>
      <wallet-fee v-if="step === Step.SbtTxSign" :value="fee" />
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { AssetTypes, Asset } from '@sora-substrate/sdk/build/assets/types';
import { mixins, components, api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import difference from 'lodash/fp/difference';
import { Component, Mixins, Ref, Prop } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import router from '@/router';
import { action, getter, state } from '@/store/decorators';
import { IMAGE_MIME_TYPES } from '@/types/image';
import { IpfsStorage } from '@/utils/ipfsStorage';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

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
    WalletFee: components.WalletFee,
  },
})
export default class CreateSbtToken extends Mixins(
  mixins.TransactionMixin,
  mixins.NetworkFeeWarningMixin,
  SubscriptionsMixin
) {
  @state.wallet.account.assets private assets!: Asset[];
  @state.dashboard.ownedAssetIds ownedAssetIds!: string[];
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;
  @getter.assets.xor xor!: Nullable<AccountAsset>;

  @action.dashboard.requestOwnedAssetIds private requestOwnedAssetIds!: AsyncFnWithoutArgs;
  @action.dashboard.subscribeOnOwnedAssets private subscribeOnOwnedAssets!: AsyncFnWithoutArgs;

  @Prop({ type: Boolean, default: false }) readonly isOnlyAttach!: boolean;
  @Prop({ type: String, default: '' }) readonly sbtAddress!: string;
  @Ref('fileInput') readonly fileInput!: HTMLInputElement;
  @Ref('uploader') readonly uploader!: HTMLFormElement;

  readonly WALLET_CONSTS = WALLET_CONSTS;
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
  readonly FILE_SIZE_LIMIT = 100; // in megabytes
  readonly Step = Step;

  // meta info
  tokenSymbol = '';
  tokenName = '';
  tokenDescription = '';
  ownerExternalUrl = '';

  // image
  imageLoading = false;
  fileExceedsLimit = false;
  badSource = false;
  contentSrcLink = '';
  tokenContentIpfsParsed = '';
  tokenContentLink = '';
  file: Nullable<File> = null;

  step: Step = Step.AssetsChoice;
  query = '';
  ownerAssetsList: Asset[] = [];
  selectedAssetsIds: Array<string> = [];
  scrollbarComponentKey = 0;
  requlatedAssetsInterval: Nullable<ReturnType<typeof setInterval>> = null;

  get checkList(): string[] {
    return this.selectedAssetsIds;
  }

  set checkList(list: string[]) {
    this.selectedAssetsIds = list;
  }

  get filteredRegulatedAssets() {
    const ownerAssetsList = this.ownerAssetsList;

    if (this.query) {
      const query = this.query.toLowerCase().trim();

      return ownerAssetsList.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.symbol.toLowerCase().includes(query) ||
          item.address.toLowerCase().includes(query)
      );
    }

    return ownerAssetsList;
  }

  get selectedRegulatedAssets() {
    return this.ownerAssetsList.filter((asset) => this.selectedAssetsIds.includes(asset.address));
  }

  get fee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFees.IssueSoulBoundToken);
  }

  get showFee(): boolean {
    return (
      !(this.tokenSymbol && this.tokenName.trim() && this.tokenDescription.trim()) ||
      this.badSource ||
      !(this.file || this.tokenContentLink)
    );
  }

  get disabledBtn(): boolean {
    if (this.step === Step.AssetsChoice) {
      if (!this.selectedAssetsIds.length) return true;
    }

    if (this.step === Step.SbtMetaDescription) {
      if (!(this.tokenSymbol.length && this.tokenDescription && this.tokenName.length)) return true;
    }

    if (this.step === Step.SbtMetaImage) {
      // TODO: uncomment when storage available;
      // if (!this.ownerExternalUrl) return true;
    }

    return false;
  }

  get hasEnoughXor(): boolean {
    const accountXor = api.assets.accountAssets.find((asset) => asset.address === XOR.address);
    if (!accountXor || !accountXor.balance || !+accountXor.balance.transferable) {
      return false;
    }
    const fpAccountXor = this.getFPNumberFromCodec(accountXor.balance.transferable, accountXor.decimals);
    return FPNumber.gte(fpAccountXor, this.fee);
  }

  get titleText(): string {
    switch (this.step) {
      case Step.AssetsChoice:
        return this.t('assetOwner.sbtCreation.addAssets');
      case Step.SbtMetaDescription:
        return this.t('assetOwner.sbtCreation.addDescription');
      case Step.SbtMetaImage:
        return this.t('assetOwner.sbtCreation.addMeta');
      case Step.SbtTxSign:
        return this.t('assetOwner.sbtCreation.preview');
      default:
        return this.t('createToken.titleCommon');
    }
  }

  openFileUpload(e: Event): void {
    // Prevent opening while storage solution is missing
    e.preventDefault();
  }

  handleClearSearch(): void {
    this.query = '';
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

  async handleCreate(): Promise<void> {
    if (this.step === Step.AssetsChoice) {
      if (this.selectedAssetsIds.length) {
        if (this.isOnlyAttach) {
          await this.withNotifications(async () => {
            if (!this.hasEnoughXor) {
              throw new Error('walletSend.badAmount');
            }
            await this.attachRegulatedAssetsToSbt(this.sbtAddress, this.selectedAssetsIds);
            router.push({ name: DashboardPageNames.AssetOwnerDetailsSBT, params: { asset: this.sbtAddress } });
          });
          return;
        }

        this.step = Step.SbtMetaDescription;
        return;
      }
    }

    if (this.step === Step.SbtMetaDescription) {
      if (this.tokenSymbol.length && this.tokenDescription && this.tokenName.length) {
        this.step = Step.SbtMetaImage;
        return;
      }
    }

    if (this.step === Step.SbtMetaImage) {
      this.step = Step.SbtTxSign;
      return;
    }

    if (this.step === Step.SbtTxSign) {
      if (this.selectedRegulatedAssets.length) {
        await this.withNotifications(async () => {
          if (!this.hasEnoughXor) {
            throw new Error('walletSend.badAmount');
          }
          await this.createSbt();
          router.push({ name: DashboardPageNames.AssetOwner });
        });
      }
    }
  }

  async attachRegulatedAssetsToSbt(sbtAddress, selectedAssetsIds) {
    return await api.extendedAssets.bindRegulatedAssetToSBT(sbtAddress, selectedAssetsIds);
  }

  async createSbt(): Promise<void> {
    return await api.extendedAssets.issueSbt(
      this.tokenSymbol,
      this.tokenName.trim(),
      this.tokenDescription,
      '', // missing image
      this.ownerExternalUrl,
      this.selectedAssetsIds
    );
  }

  removeAsset(asset: AccountAsset): void {
    this.selectedAssetsIds = this.selectedAssetsIds.filter((id) => id !== asset.address);
    this.scrollbarComponentKey += 1;
  }

  handleBack(): void {
    if (this.sbtAddress) {
      router.push({ name: DashboardPageNames.AssetOwnerDetailsSBT, params: { asset: this.sbtAddress } });
      return;
    }

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

  resetInterval(): void {
    clearInterval(this.requlatedAssetsInterval as NodeJS.Timeout);
  }

  async requestRegulatedAssets(exclude = false): Promise<void> {
    const ownRegulatedAssets: Array<Asset> = [];
    let regulatedAssetsAttached = [] as Array<string>;
    await this.requestOwnedAssetIds();

    if (exclude) {
      regulatedAssetsAttached = (await api.extendedAssets.getSbtMetaInfo(this.sbtAddress)).regulatedAssets as string[];
    }

    // not to show already attached ones when only attachment is needed
    const filtered = difference(this.ownedAssetIds, regulatedAssetsAttached);

    // TODO: [Rustem] Check this code for feasibility instead of refetching
    // const regulatedAssets = this.assets.filter((asset) => {
    //   return filtered.includes(asset.address) && asset.type === AssetTypes.Regulated;
    // });

    // TODO: move to lib, migrate to assetInfosV2
    const assetInfos = filtered.map(async (address) => {
      const result: any = await api.api.query.assets.assetInfosV2(address);
      return [address, result];
    });
    for await (const [address, assetInfo] of assetInfos) {
      const { assetType, symbol, name } = (assetInfo as any).toHuman();
      if (assetType === 'Regulated') {
        ownRegulatedAssets.push({ symbol, address, name } as Asset);
      }
    }

    this.ownerAssetsList = ownRegulatedAssets;
  }

  async created(): Promise<void> {
    this.requestRegulatedAssets(this.isOnlyAttach);

    this.requlatedAssetsInterval = setInterval(() => {
      this.requestRegulatedAssets(this.isOnlyAttach);
    }, 6_000); // block creation
  }

  updated(): void {
    if (this.step !== Step.AssetsChoice) {
      this.resetInterval();
    }
  }

  beforeDestroy(): void {
    this.resetInterval();
  }
}
</script>

<style lang="scss">
.dashboard-create {
  .dashboard-regulated-assets {
    .label {
      text-transform: uppercase;
      background-color: var(--s-color-base-on-accent);
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      border-radius: $basic-spacing;
      font-weight: 650;
      padding: 4px $inner-spacing-mini;
    }

    .assets-list {
      height: 320px;

      &__item {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;

        .el-checkbox {
          display: flex;
          align-items: center;
          width: 100%;

          &-group {
            width: 100%;
          }

          &__label {
            width: 100%;
          }

          &__inner {
            border-radius: 50%;
          }
        }
      }
    }

    &--not-found {
      text-align: center;
      color: var(--s-color-base-content-secondary);
      margin-top: $basic-spacing;
    }

    &__scrollbar {
      @include scrollbar(-8px);

      .el-scrollbar__view {
        padding-right: $basic-spacing;
      }
    }

    &__scrollbar.el-scrollbar {
      margin-left: -8px;
      margin-right: -24px;
    }
  }

  &-button {
    margin-top: $inner-spacing-big;

    .create {
      margin-left: calc(var(--s-basic-spacing) * 1.5);
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
      font-size: var(--s-font-size-medium);
      font-weight: 500;
    }

    .el-button {
      .s-icon-plus-16 {
        color: var(--s-color-theme-accent);
      }
    }
  }

  &-sbt-preview {
    display: flex;
    background-color: var(--s-color-base-background-hover);
    padding: $basic-spacing;
    border-radius: $basic-spacing;

    .preview-image {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: 8px;
      background-color: var(--s-color-base-on-accent);
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: $basic-spacing;

      img {
        width: 64px;
      }

      &::before {
        content: 'SBT';
        position: absolute;
        font-size: var(--s-font-size-big);
        border-radius: 8px;
        padding-top: 20px;
        color: white;
        background-color: var(--s-color-base-content-tertiary);
        bottom: 0;
        text-align: center;
        left: 0;
        right: 0;
        top: 0;
      }
    }

    .symbol {
      font-size: var(--s-font-size-big);
      font-weight: 700;
      display: block;
    }

    .name {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-medium);
      display: block;
    }
  }

  .dashboard-regulated-assets-attached {
    .selected-assets {
      height: 250px;
    }

    .assets-list-subtitle {
      margin-top: $inner-spacing-big;
      text-transform: uppercase;
      align-self: flex-start;
      font-weight: 650;
      color: var(--s-color-base-content-secondary);

      .number {
        margin-left: $inner-spacing-mini;
        color: var(--s-color-base-content-tertiary);
      }
    }

    .delete-icon {
      margin-right: $inner-spacing-mini;
      color: var(--s-color-theme-accent);

      &:hover {
        cursor: pointer;
      }
    }
  }

  &__button {
    margin-top: $basic-spacing;
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

  // TODO: remove when IPFS uploads allowed
  .drop-zone.preview-image-create-nft {
    &:hover {
      cursor: no-drop;
    }
  }
}
</style>
