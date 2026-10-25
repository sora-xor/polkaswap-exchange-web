<template>
  <div class="wallet-settings-create-token">
    <s-input
      v-model="tokenContentLink"
      :placeholder="t('createToken.nft.link.placeholder')"
      :minlength="1"
      :maxlength="200"
      :disabled="loading"
      @update:model-value="handleInputLinkChange"
    >
      <template #suffix>
        <s-tooltip
          popper-class="ipfs-tooltip"
          :content="t('createToken.nft.link.tooltip')"
          placement="bottom"
          tabindex="-1"
        >
          <s-icon class="ipfs-tooltip__icon" name="info-16" size="18px"></s-icon>
        </s-tooltip>
      </template>
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
      <div v-if="imageLoading" v-loading="imageLoading"></div>
      <div v-else-if="fileExceedsLimit" class="placeholder">
        <s-icon class="preview-image-create-nft__icon icon--error" name="basic-clear-X-24" size="32px"></s-icon>
        <span>{{ t('createToken.nft.image.placeholderFileLimit', { value: FILE_SIZE_LIMIT }) }}</span>
        <s-button class="preview-image-create-nft__btn">{{ t('createToken.nft.source.limit') }}</s-button>
      </div>
      <div v-else-if="!tokenContentLink && !file" class="placeholder">
        <s-icon class="preview-image-create-nft__icon" name="camera-16" size="32px"></s-icon>
        <span class="preview-image-create-nft__placeholder">{{ t('createToken.nft.image.placeholderNoImage') }}</span>
      </div>
      <div v-else-if="badSource && !file" class="placeholder">
        <s-icon class="preview-image-create-nft__icon icon--error" name="basic-clear-X-24" size="32px"></s-icon>
        <span class="preview-image-create-nft__placeholder">{{
          t('createToken.nft.image.placeholderBadSource')
        }}</span>
      </div>
      <div v-else class="image">
        <img class="preview-image-create-nft__content" :src="contentSrcLink" />
      </div>
    </file-uploader>
    <s-input
      :placeholder="t('createToken.tokenSymbol.placeholder')"
      :minlength="1"
      :maxlength="7"
      :disabled="loading"
      v-maska="tokenSymbolMask"
      v-model="tokenSymbol"
    ></s-input>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenSymbol.desc') }}</p>
    <s-input
      :placeholder="t('createToken.tokenName.placeholder')"
      :minlength="1"
      :maxlength="33"
      :disabled="loading"
      v-maska="tokenNameMask"
      v-model="tokenName"
    ></s-input>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.tokenName.desc') }}</p>
    <s-input
      v-model="tokenDescription"
      class="input-textarea"
      type="textarea"
      :placeholder="t('createToken.nft.description.placeholder')"
      :disabled="loading"
      :maxlength="200"
      @keypress="handleTextAreaInput"
    ></s-input>
    <s-float-input
      v-model="tokenSupply"
      :placeholder="t('createToken.nft.supply.placeholder')"
      :decimals="decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="maxTotalSupply"
      :disabled="loading"
    ></s-float-input>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.nft.supply.desc') }}</p>
    <div class="wallet-settings-create-token_supply-block">
      <s-switch v-model="extensibleSupply" :disabled="loading"></s-switch>
      <span>{{ t('createToken.extensibleSupply.placeholder') }}</span>
    </div>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.extensibleSupply.desc') }}</p>
    <div class="delimiter"></div>
    <div class="wallet-settings-create-token_divisible-block">
      <s-switch v-model="divisible" :disabled="loading" @change="handleChangeDivisible"></s-switch>
      <span>{{ t('createToken.divisible.placeholder') }}</span>
    </div>
    <p class="wallet-settings-create-token_desc">{{ t('createToken.divisible.desc') }}</p>
  </div>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { api } from '@/lib/soraneo-wallet/src/api';
import FileUploader from '@/lib/soraneo-wallet/src/components/FileUploader.vue';
import { IMAGE_MIME_TYPES } from '@/lib/soraneo-wallet/src/util/image';
import { IpfsStorage } from '@/lib/soraneo-wallet/src/util/ipfsStorage';
import { useWalletStore } from '@/stores/wallet';

import type { NFTStorage } from 'nft.storage';

withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const { t } = useTranslation();
const { formatStringValue, getCorrectSupply } = useNumberFormatter();
const walletStore = useWalletStore();

const uploader = ref<{ resetFileInput?: () => void }>();
const tokenSymbolMask = 'AAAAAAA';
const tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
const maxTotalSupply = MaxTotalSupply;
const delimiters = FPNumber.DELIMITERS_CONFIG;
const FILE_SIZE_LIMIT = 100;

const imageLoading = ref(false);
const fileExceedsLimit = ref(false);
const badSource = ref(false);
const contentSrcLink = ref('');
const tokenContentIpfsParsed = ref('');
const tokenContentLink = ref('');
const tokenSymbol = ref('');
const tokenName = ref('');
const tokenDescription = ref('');
const tokenSupply = ref('');
const file = ref<Nullable<File>>(null);
const extensibleSupply = ref(false);
const divisible = ref(false);

const nftStorage = computed(() => walletStore.nftStorage);
const decimals = computed(() => calcDecimals(divisible.value));
const formattedTokenSupply = computed(() => formatStringValue(tokenSupply.value, decimals.value));
const hasPositiveSupply = computed(() => {
  try {
    const supply = new FPNumber(tokenSupply.value || '0', decimals.value);
    return supply.isFinity() && FPNumber.gt(supply, FPNumber.ZERO);
  } catch {
    return false;
  }
});
const hasContent = computed(() => Boolean(file.value || tokenContentLink.value.trim()));
const isCreateDisabled = computed(() => {
  return (
    !(hasContent.value && tokenSymbol.value.trim() && tokenName.value.trim() && tokenDescription.value.trim()) ||
    !hasPositiveSupply.value ||
    badSource.value ||
    imageLoading.value
  );
});
const buttonTitle = computed(() => {
  if (!hasContent.value) return t('createToken.provideContent');
  if (!tokenSymbol.value.trim()) return t('createToken.enterSymbol');
  if (!tokenName.value.trim()) return t('createToken.enterName');
  if (!hasPositiveSupply.value) return t('createToken.enterSupply');
  if (!tokenDescription.value.trim()) return t('createToken.enterTokenDescription');
  if (badSource.value) return t('createToken.provideContent');
  return t('createTokenTextNFT');
});

function calcDecimals(isDivisible: boolean): number {
  return isDivisible ? FPNumber.DEFAULT_PRECISION : 0;
}

/** Loads a local file into the NFT preview and uses it as the content source. */
async function upload(uploadedFile: File): Promise<void> {
  imageLoading.value = true;
  file.value = uploadedFile;
  contentSrcLink.value = await IpfsStorage.fileToBase64(uploadedFile);
  badSource.value = false;
  imageLoading.value = false;
  tokenContentLink.value = '';
}

function showLimit(): void {
  contentSrcLink.value = '';
  fileExceedsLimit.value = true;
}

function hideLimit(): void {
  contentSrcLink.value = '';
  fileExceedsLimit.value = false;
}

/** Keeps an indivisible NFT supply rounded to whole units. */
function handleChangeDivisible(value: boolean): void {
  if (!value && tokenSupply.value) {
    tokenSupply.value = getCorrectSupply(tokenSupply.value, calcDecimals(value));
  }
}

function resetFileInput(): void {
  file.value = null;
  imageLoading.value = false;
}

function isValidType(type: string): boolean {
  return Object.values(IMAGE_MIME_TYPES).includes(type);
}

/** Verifies that a provided URL resolves to an image that can be used as NFT content. */
async function checkImageFromSource(url: string): Promise<void> {
  imageLoading.value = true;
  badSource.value = false;

  try {
    const response = await fetch(url);
    const buffer = await response.blob();
    imageLoading.value = false;

    if (isValidType(buffer.type)) {
      badSource.value = false;
      contentSrcLink.value = url;
      tokenContentIpfsParsed.value = IpfsStorage.getIpfsPath(url);
    } else {
      badSource.value = true;
      contentSrcLink.value = '';
      tokenContentIpfsParsed.value = '';
    }
  } catch {
    badSource.value = true;
    contentSrcLink.value = '';
    tokenContentIpfsParsed.value = '';
  }

  resetFileInput();
}

function handleInputLinkChange(link: string): void {
  tokenContentLink.value = link;
  uploader.value?.resetFileInput?.();
  resetFileInput();
  fileExceedsLimit.value = false;
  contentSrcLink.value = '';
  tokenContentIpfsParsed.value = '';

  if (!link.trim()) {
    badSource.value = false;
    return;
  }

  try {
    new URL(link);
  } catch {
    badSource.value = true;
    return;
  }

  void checkImageFromSource(link);
}

function handleTextAreaInput(event: KeyboardEvent): boolean | void {
  if (/^[A-Za-z0-9 _',.#]+$/.test(event.key)) return true;
  event.preventDefault();
}

function clear(): void {
  tokenContentLink.value = '';
  contentSrcLink.value = '';
  tokenContentIpfsParsed.value = '';
  badSource.value = false;
  resetFileInput();
}

/** Clears all NFT form fields when the parent dialog is reopened. */
function resetForm(): void {
  clear();
  tokenSymbol.value = '';
  tokenName.value = '';
  tokenDescription.value = '';
  tokenSupply.value = '';
  extensibleSupply.value = false;
  divisible.value = false;
  fileExceedsLimit.value = false;
}

function resolveContentIpfsPath(): string {
  if (tokenContentIpfsParsed.value.trim()) return tokenContentIpfsParsed.value.trim();

  try {
    return IpfsStorage.getIpfsPath(tokenContentLink.value).trim();
  } catch {
    return '';
  }
}

async function createNftStorageInstance(): Promise<void> {
  await walletStore.createNftStorageInstance();
}

/** Uploads local NFT content to NFT.storage before registering the asset on-chain. */
async function storeNftImage(imageFile: File): Promise<void> {
  const content = (await IpfsStorage.fileToBuffer(imageFile)) as ArrayBuffer;

  if (!(nftStorage.value as NFTStorage | null)) {
    await createNftStorageInstance();
  }

  const metadata = await (nftStorage.value as NFTStorage).store({
    name: imageFile.name,
    description: tokenDescription.value,
    image: await createNftStorageFile([content], imageFile.name, { type: imageFile.type }),
  });

  tokenContentIpfsParsed.value = IpfsStorage.getIpfsPath(metadata.embed().image.href);
}

/** Registers an NFT asset after normalizing supply and resolving the IPFS content path. */
async function registerAsset(): Promise<void> {
  if (isCreateDisabled.value) return;

  tokenSupply.value = getCorrectSupply(tokenSupply.value, decimals.value);

  if (file.value) {
    await storeNftImage(file.value);
  }

  const contentPath = resolveContentIpfsPath();

  if (!contentPath) {
    throw new Error('IPFS Token issue');
  }

  await api.assets.register(
    tokenSymbol.value.trim(),
    tokenName.value.trim(),
    tokenSupply.value,
    extensibleSupply.value,
    !divisible.value,
    { content: contentPath, description: tokenDescription.value.trim() }
  );
}

defineExpose({
  t,
  uploader,
  tokenSymbolMask,
  tokenNameMask,
  maxTotalSupply,
  delimiters,
  FILE_SIZE_LIMIT,
  imageLoading,
  fileExceedsLimit,
  badSource,
  contentSrcLink,
  tokenContentIpfsParsed,
  tokenContentLink,
  tokenSymbol,
  tokenName,
  tokenDescription,
  tokenSupply,
  file,
  extensibleSupply,
  divisible,
  decimals,
  formattedTokenSupply,
  hasPositiveSupply,
  isCreateDisabled,
  buttonTitle,
  upload,
  showLimit,
  hideLimit,
  handleChangeDivisible,
  handleInputLinkChange,
  handleTextAreaInput,
  clear,
  resetForm,
  registerAsset,
});

async function createNftStorageFile(
  fileBits: BlobPart[],
  fileName: string,
  options: FilePropertyBag
): Promise<import('nft.storage').File> {
  const { File: ImageNFT } = await import('nft.storage');
  return new ImageNFT(fileBits, fileName, options);
}
</script>

<style lang="scss" scoped>
.wallet-settings-create-token {
  &_desc {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
  }

  &_supply-block,
  &_divisible-block {
    // @include switch-block;
    padding: 0 #{$basic-spacing-small};
  }
}
</style>

<style lang="scss">
.wallet-settings-create-token {
  .ipfs-tooltip {
    font-size: 10px !important;
    padding: 10px 15px !important;

    &__icon {
      color: var(--s-color-base-content-tertiary);

      &:hover {
        cursor: pointer;
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}

.preview-image-create-nft {
  margin: #{$basic-spacing-medium} 0;
}
</style>
