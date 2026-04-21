<template>
  <div class="wallet-settings-create-token">
    <template v-if="step === Step.CreateNftToken">
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
      <s-input
        v-model="tokenDescription"
        class="input-textarea"
        type="textarea"
        :placeholder="t('createToken.nft.description.placeholder')"
        :disabled="loading"
        :maxlength="200"
        @keypress="handleTextAreaInput($event)"
      ></s-input>
      <s-float-input
        v-model="tokenSupply"
        has-locale-string
        :placeholder="t('createToken.nft.supply.placeholder')"
        :decimals="decimals"
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
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :loading="loading"
        :disabled="isCreateDisabled"
        @click="onCreate"
      >
        <template v-if="!tokenContentLink.trim() && !file">{{ t('createToken.provideContent') }}</template>
        <template v-else-if="!tokenSymbol">{{ t('createToken.enterSymbol') }}</template>
        <template v-else-if="!tokenName.trim()">{{ t('createToken.enterName') }}</template>
        <template v-else-if="!+tokenSupply">{{ t('createToken.enterSupply') }}</template>
        <template v-else-if="!tokenDescription">{{ t('createToken.enterTokenDescription') }}</template>
        <template v-else-if="badSource">{{ t('createToken.provideContent') }}</template>
        <template v-else>{{ t('createTokenTextNFT') }}</template>
      </s-button>
    </template>
    <template v-else-if="step === Step.Warn">
      <network-fee-warning-dialog :fee="formattedFee" @confirm="confirmNextTxFailure"></network-fee-warning-dialog>
    </template>
    <template v-else-if="step === Step.ConfirmNftToken">
      <nft-details
        :content-link="contentSrcLink"
        :token-name="tokenName"
        :token-symbol="tokenSymbol"
        :token-description="tokenDescription"
      ></nft-details>
      <div class="info-line-container">
        <info-line :label="t('createToken.nft.source.label')" :value="contentSource"></info-line>
        <info-line :label="t('createToken.nft.supply.quantity')" :value="tokenSupply"></info-line>
      </div>
      <account-confirmation-option with-hint class="wallet-settings-create-token_action"></account-confirmation-option>
      <s-button
        class="wallet-settings-create-token_action s-typography-button--large"
        type="primary"
        :disabled="!hasEnoughXor"
        :loading="loading"
        @click="onConfirm"
      >
        <template v-if="!hasEnoughXor">{{ t('insufficientBalanceText', { symbol: XOR_SYMBOL }) }}</template>
        <template v-else>{{ t('confirmText') }}</template>
      </s-button>
    </template>

    <wallet-fee v-if="!isCreateDisabled && showFee" :value="fee"></wallet-fee>
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { MaxTotalSupply, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { File as ImageNFT } from 'nft.storage';
import { computed, ref, type PropType } from 'vue';

import type { WalletNavigationTarget } from '@/platform/wallet/navigation';
import { useWalletStore } from '@/stores/wallet';

import { useNetworkFeeWarning } from '../composables/useNetworkFeeWarning';
import { useNumberFormatter } from '../composables/useNumberFormatter';
import { useTransaction } from '../composables/useTransaction';
import { api } from '../api';
import { RouteNames, Step } from '../consts';
import { IMAGE_MIME_TYPES } from '../util/image';
import { IpfsStorage } from '../util/ipfsStorage';

import AccountConfirmationOption from './Account/Settings/ConfirmationOption.vue';
import FileUploader from './FileUploader.vue';
import InfoLine from './InfoLine.vue';
import NetworkFeeWarningDialog from './NetworkFeeWarning.vue';
import NftDetails from './NftDetails.vue';
import WalletFee from './WalletFee.vue';

import type { NFTStorage } from 'nft.storage';

export default {
  components: {
    InfoLine,
    WalletFee,
    NftDetails,
    NetworkFeeWarningDialog,
    FileUploader,
    AccountConfirmationOption,
  },
  props: {
    step: {
      default: Step.CreateSimpleToken,
      type: String as PropType<Step>,
    },
  },
  emits: ['showTabs', 'showHeader', 'stepChange'],
  setup(props, { emit }) {
    const walletStore = useWalletStore();
    const { t, withNotifications, loading } = useTransaction();
    const { getCorrectSupply, getFPNumberFromCodec } = useNumberFormatter();
    const { allowFeePopup, networkFees, xorBalance, isXorSufficientForNextTx } = useNetworkFeeWarning();

    const uploader = ref<{ resetFileInput?: () => void }>();
    const tokenSymbolMask = 'AAAAAAA';
    const tokenNameMask = { mask: 'Z*', tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
    const maxTotalSupply = MaxTotalSupply;
    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const XOR_SYMBOL = XOR.symbol;
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
    const showFee = ref(true);
    const file = ref<Nullable<File>>(null);
    const extensibleSupply = ref(false);
    const divisible = ref(false);

    const nftStorage = computed(() => walletStore.nftStorage);
    const isConfirmTxDisabled = computed(() => walletStore.isConfirmTxDialogDisabled);
    const decimals = computed(() => calcDecimals(divisible.value));
    const isCreateDisabled = computed(() => {
      return (
        !(tokenSymbol.value && tokenName.value.trim() && +tokenSupply.value && tokenDescription.value.trim()) ||
        badSource.value ||
        !(file.value || tokenContentLink.value)
      );
    });
    const fee = computed((): FPNumber => getFPNumberFromCodec(networkFees.value.RegisterAsset));
    const formattedFee = computed(() => fee.value.toLocaleString());
    const contentSource = computed(() => {
      if (file.value) return t('createToken.nft.source.value');
      return IpfsStorage.getStorageHostname(tokenContentLink.value);
    });
    const hasEnoughXor = computed(() => FPNumber.gte(xorBalance.value, fee.value));

    const createNftStorageInstance = () => walletStore.createNftStorageInstance();

    const navigate = (options: WalletNavigationTarget): void => {
      walletStore.navigate(options);
    };

    function calcDecimals(isDivisible: boolean): number {
      return isDivisible ? FPNumber.DEFAULT_PRECISION : 0;
    }

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

    function handleChangeDivisible(value: boolean): void {
      if (!value && tokenSupply.value) {
        const nextDecimals = calcDecimals(value);
        tokenSupply.value = getCorrectSupply(tokenSupply.value, nextDecimals);
      }
    }

    function resetFileInput(): void {
      file.value = null;
      imageLoading.value = false;
    }

    function isValidType(type: string): boolean {
      return Object.values(IMAGE_MIME_TYPES).includes(type);
    }

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
        }
      } catch {
        badSource.value = true;
        contentSrcLink.value = '';
      }

      resetFileInput();
    }

    function handleInputLinkChange(link: string): void {
      uploader.value?.resetFileInput?.();
      resetFileInput();
      fileExceedsLimit.value = false;
      contentSrcLink.value = '';

      try {
        new URL(link);
      } catch {
        badSource.value = true;
        return;
      }

      void checkImageFromSource(link);
    }

    function handleTextAreaInput(e: KeyboardEvent): boolean | void {
      if (/^[A-Za-z0-9 _',.#]+$/.test(e.key)) return true;
      e.preventDefault();
    }

    function clear(): void {
      tokenContentLink.value = '';
      contentSrcLink.value = '';
      resetFileInput();
    }

    async function storeNftImage(imageFile: File): Promise<void> {
      const content = (await IpfsStorage.fileToBuffer(imageFile)) as ArrayBuffer;

      if (!(nftStorage.value as NFTStorage | null)) {
        await createNftStorageInstance();
      }

      try {
        const metadata = await (nftStorage.value as NFTStorage).store({
          name: imageFile.name,
          description: tokenDescription.value,
          image: new ImageNFT([content], imageFile.name, { type: imageFile.type }),
        });

        tokenContentIpfsParsed.value = IpfsStorage.getIpfsPath(metadata.embed().image.href);
      } catch (error) {
        console.error('Error while storing NFT content:', error);
      }
    }

    async function registerNftAsset(): Promise<void> {
      if (!tokenContentIpfsParsed.value.trim()) {
        throw new Error('IPFS Token issue');
      }
      return api.assets.register(
        tokenSymbol.value,
        tokenName.value.trim(),
        tokenSupply.value,
        extensibleSupply.value,
        !divisible.value,
        { content: tokenContentIpfsParsed.value, description: tokenDescription.value.trim() }
      );
    }

    async function onCreate(): Promise<void> {
      if (
        !tokenSymbol.value.length ||
        !tokenSupply.value.length ||
        !tokenDescription.value.length ||
        !tokenName.value.length ||
        badSource.value
      ) {
        return;
      }

      tokenSupply.value = getCorrectSupply(tokenSupply.value, decimals.value);

      emit('showTabs');

      if (allowFeePopup.value && hasEnoughXor.value && !isXorSufficientForNextTx({ type: Operation.RegisterAsset })) {
        emit('showHeader');
        showFee.value = false;
        emit('stepChange', Step.Warn);
        return;
      }

      if (isConfirmTxDisabled.value) {
        await onConfirm();
      } else {
        showFee.value = true;
        emit('stepChange', Step.ConfirmNftToken);
      }
    }

    async function onConfirm(): Promise<void> {
      await withNotifications(async () => {
        if (!hasEnoughXor.value) {
          throw new Error('insufficientBalanceText');
        }
        if (file.value) {
          await storeNftImage(file.value);
        }
        await registerNftAsset();
        navigate({ name: RouteNames.Wallet });
      });
    }

    function confirmNextTxFailure(): void {
      emit('showHeader');
      showFee.value = true;
      emit('stepChange', Step.ConfirmNftToken);
    }

    return {
      t,
      loading,
      uploader,
      tokenSymbolMask,
      tokenNameMask,
      maxTotalSupply,
      delimiters,
      Step,
      XOR_SYMBOL,
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
      showFee,
      file,
      extensibleSupply,
      divisible,
      isConfirmTxDisabled,
      decimals,
      isCreateDisabled,
      fee,
      formattedFee,
      contentSource,
      hasEnoughXor,
      upload,
      showLimit,
      hideLimit,
      handleChangeDivisible,
      handleInputLinkChange,
      handleTextAreaInput,
      clear,
      onCreate,
      onConfirm,
      confirmNextTxFailure,
    };
  },
};
</script>

<style lang="scss" scoped>
.info-line-container {
  text-transform: uppercase;
  margin-bottom: calc(var(--s-size-small) / 2);
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
  &_desc {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) #{$basic-spacing-small} #{$basic-spacing-medium};
  }

  &_action {
    margin-top: #{$basic-spacing-medium};
    width: 100%;
  }

  &_supply-block,
  &_divisible-block {
    @include switch-block;
    & {
      padding: 0 #{$basic-spacing-small};
    }
  }
}

.s-textarea {
  margin-bottom: #{$basic-spacing-medium};
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

.preview-image-create-nft {
  margin: #{$basic-spacing-medium} 0;
  height: 200px;

  @include drag-drop-content;

  .image {
    margin: 0 auto;
    height: 176px;
  }

  &__content {
    height: 176px;
    width: 176px;
    object-fit: cover;
    border-radius: calc(var(--s-border-radius-mini) * 0.75);
  }
}

.delimiter {
  background-color: var(--s-color-base-border-secondary);
  margin-bottom: calc(var(--s-size-small) / 2);
  height: 1px;
}
</style>
