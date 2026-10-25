<template>
  <div class="nft-details-container">
    <div class="preview-image-confirm-nft">
      <div v-if="imageLoading" v-loading="imageLoading"></div>
      <div v-else-if="badLink" class="placeholder">
        <s-icon
          v-if="isAssetDetails && !isNotImage"
          v-button
          class="preview-image-confirm-nft__icon-refresh"
          name="refresh-16"
          size="64px"
          @click="handleRefresh"
        ></s-icon>
        <span class="preview-image-confirm-nft__placeholder">{{
          t('createToken.nft.image.placeholderBadSource')
        }}</span>
        <span v-if="isAssetDetails" class="preview-image-confirm-nft__placeholder">{{
          t('createToken.nft.image.placeholderBadSourceAddition')
        }}</span>
      </div>
      <s-image
        v-else
        class="preview-image-confirm-nft__content"
        :src="image"
        fit="cover"
        :src-list="imagePreview"
      ></s-image>
    </div>
    <div class="nft-info">
      <div class="nft-info__header">
        <div v-if="isAssetDetails" :class="nftDetailsSectionClasses" @click="handleDetailsClick">
          <span>{{ tokenSymbol }}</span>
          <s-icon name="chevron-down-rounded-16" size="18"></s-icon>
        </div>
        <template v-else>
          <span class="nft-info__name">{{ tokenName }}</span>
          <span class="nft-info__symbol">{{ tokenSymbol }}</span>
        </template>
      </div>
      <div class="nft-info__desc">{{ tokenDescription }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { useWalletTranslation } from '../composables/useWalletTranslation';

const UrlCreator = globalThis.URL || (globalThis as typeof globalThis & { webkitURL?: typeof URL }).webkitURL;

const props = withDefaults(
  defineProps<{
    contentLink?: string;
    tokenName?: string;
    tokenSymbol?: string;
    tokenDescription?: string;
    isAssetDetails?: boolean;
  }>(),
  {
    contentLink: '',
    tokenName: '',
    tokenSymbol: '',
    tokenDescription: '',
    isAssetDetails: false,
  }
);

const emit = defineEmits<{
  'click-details': [];
}>();

const { t } = useWalletTranslation();
const nftDetailsClicked = ref(false);
const badLink = ref(false);
const imageLoading = ref(true);
const isNotImage = ref(false);
const image = ref('');

const nftDetailsSectionClasses = computed(() => {
  const cssClasses = ['nft-info__header--clickable'];
  if (nftDetailsClicked.value) {
    cssClasses.push('nft-info__header--clicked');
  }
  return cssClasses;
});

const imagePreview = computed(() => [image.value]);

async function checkImageAvailability(): Promise<void> {
  if (!props.contentLink) {
    return;
  }

  try {
    const response = await fetch(props.contentLink);
    const buffer = await response.blob();

    if (!buffer.type.startsWith('image/')) {
      isNotImage.value = true;
      badLink.value = true;
      imageLoading.value = false;
      return;
    }

    imageLoading.value = false;
    image.value = UrlCreator?.createObjectURL(buffer) ?? '';
  } catch {
    badLink.value = true;
  }
}

function handleDetailsClick(): void {
  nftDetailsClicked.value = !nftDetailsClicked.value;
  emit('click-details');
}

function handleRefresh(): void {
  badLink.value = false;
  imageLoading.value = true;
  void checkImageAvailability();
}

onMounted(() => {
  void nextTick().then(() => checkImageAvailability());
});

onBeforeUnmount(() => {
  if (image.value) {
    UrlCreator?.revokeObjectURL(image.value);
  }
});
</script>

<style lang="scss">
.preview-image-confirm-nft {
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-bottom: var(--s-size-mini);
  height: 250px;

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__content {
    margin: 0 auto;
    height: 250px !important;
    width: 250px !important;
    object-fit: cover;
    border-radius: calc(var(--s-border-radius-mini) * 0.75);
  }

  &__icon-refresh {
    color: var(--s-color-base-content-tertiary) !important;
    font-size: var(--s-size-small) !important;
    margin-bottom: calc(var(--s-size-small) / 2);
    cursor: pointer;
    &:hover {
      color: var(--s-color-base-content-secondary) !important;
    }
  }

  &__placeholder {
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-primary);
    font-size: calc(var(--s-size-small) / 2);
    text-align: center;
    padding: 0 50px;
  }
}

.nft-details-container {
  width: 100%;
}

.nft-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &__header {
    font-weight: 700;
    font-size: var(--s-font-size-large);
    text-transform: capitalize;

    &--clickable {
      cursor: pointer;
    }

    .s-icon-chevron-down-rounded-16 {
      display: inline-block;
      margin-left: var(--s-basic-spacing);
      height: var(--s-icon-font-size-small);
      width: var(--s-icon-font-size-small);
      transition: transform 0.3s;
      background-color: var(--s-color-base-content-secondary);
      color: var(--s-color-base-on-accent) !important;
      border-radius: 50%;
      text-align: left;
    }

    &--clicked .s-icon-chevron-down-rounded-16 {
      padding-right: #{$basic-spacing-small};
      transform: rotate(180deg);
    }
  }

  &__name {
    display: inline-block;
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 6px;
    line-height: var(--s-size-mini);
  }

  &__symbol {
    display: inline-block;
    font-weight: 400;
    overflow: hidden;
    font-size: calc(var(--s-size-small) / 2);
    color: var(--s-color-brand-day);
    line-height: calc(var(--s-size-mini) / 1.2);
  }

  &__desc {
    font-size: 14px;
    color: var(--s-color-brand-day);
    text-align: center;
    margin-bottom: 10px;
    max-width: 100%;
    overflow: hidden;
  }

  &__supply {
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: 10px;
    border-bottom: none;
    margin-bottom: 20px;
  }
}
</style>
