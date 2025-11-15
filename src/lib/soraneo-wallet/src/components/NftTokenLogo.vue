<template>
  <img
    v-show="asset.content && showNftImage"
    ref="nftImage"
    class="asset-logo nft-image"
    :src="nftImageUrl"
    @load="handleNftImageLoad"
    @error="hideNftImage"
  />
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import { IpfsStorage } from '../util/ipfsStorage';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const props = defineProps<{
  asset: Asset;
}>();

const nftImage = ref<HTMLImageElement | null>(null);
const showNftImage = ref(false);

const nftImageUrl = computed(() => (props.asset?.content ? IpfsStorage.constructFullIpfsUrl(props.asset.content) : ''));

function handleNftImageLoad(): void {
  const imgElement = nftImage.value;
  showNftImage.value = Boolean(imgElement && imgElement.complete && imgElement.naturalHeight !== 0);
}

function hideNftImage(): void {
  showNftImage.value = false;
}

defineExpose({
  nftImage,
  showNftImage,
  nftImageUrl,
  handleNftImageLoad,
  hideNftImage,
});
</script>

<style></style>
