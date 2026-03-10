<template>
  <div class="logo">
    <span :class="iconClasses" :style="iconStyles"></span>
    <nft-token-logo v-if="isNft" class="asset-logo__nft-image" :class="iconClasses" :asset="token"></nft-token-logo>
  </div>
</template>

<script lang="ts" setup>
import { computed, type CSSProperties } from 'vue';

import { api } from '@/api';
import { LogoSize } from '@/consts';
import { requireLegacyStore } from '@/utils/legacy-store';
import type { WhitelistIdsBySymbol } from '@/types/common';
import { buildCssUrl, sanitizeIconSource } from '@/util/image';

import NftTokenLogo from './NftTokenLogo.vue';

import type { AccountAsset, Asset, Whitelist, WhitelistItem } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(
  defineProps<{
    tokenSymbol?: string;
    token?: Nullable<AccountAsset | Asset>;
    size?: LogoSize;
    withClickableLogo?: boolean;
  }>(),
  {
    tokenSymbol: '',
    token: null,
    size: LogoSize.MEDIUM,
    withClickableLogo: false,
  }
);

const store = requireLegacyStore();

const whitelist = computed<Whitelist>(() => {
  const value = store.getters['wallet/account/whitelist'] as Nullable<Whitelist>;
  return value ?? {};
});

const whitelistIdsBySymbol = computed<WhitelistIdsBySymbol>(() => {
  const value = store.getters['wallet/account/whitelistIdsBySymbol'] as Nullable<WhitelistIdsBySymbol>;
  return value ?? {};
});

const normalizeTokenSymbol = (value?: string): string => (value ?? '').replace(/\s+/g, '').toUpperCase().trim();

const normalizedWhitelistIdsBySymbol = computed<WhitelistIdsBySymbol>(() => {
  return Object.entries(whitelistIdsBySymbol.value).reduce<WhitelistIdsBySymbol>((result, [symbol, address]) => {
    if (symbol) {
      result[symbol] = address;
    }

    const normalized = normalizeTokenSymbol(symbol);
    if (normalized) {
      result[normalized] = address;
    }

    return result;
  }, {});
});

const isNft = computed(() => {
  const maybeAsset = props.token as AccountAsset | Asset | null;
  if (!maybeAsset) return false;

  const isNftChecker = api?.assets?.isNft;

  return typeof isNftChecker === 'function' ? isNftChecker(maybeAsset) : false;
});

const assetAddress = computed<Nullable<string>>(() => {
  const tokenAddress = props.token?.address ?? null;
  if (tokenAddress) return tokenAddress;

  const normalizedSymbol = normalizeTokenSymbol(props.tokenSymbol);
  if (!normalizedSymbol) return null;

  return normalizedWhitelistIdsBySymbol.value[normalizedSymbol] ?? null;
});

const whitelistedItem = computed<Nullable<WhitelistItem>>(() => {
  if (!props.token && !props.tokenSymbol) {
    return null;
  }

  const address = assetAddress.value;
  if (!address) {
    return null;
  }

  return whitelist.value[address] ?? null;
});

const sanitizedIcon = computed(() => {
  const icon = whitelistedItem.value?.icon;
  return sanitizeIconSource(icon ?? '');
});

const iconStyles = computed<CSSProperties>(() => {
  const icon = sanitizedIcon.value;

  if (!icon) {
    return {};
  }

  return {
    'background-size': '100%',
    'background-image': buildCssUrl(icon),
  };
});

const iconClasses = computed(() => {
  const questionMark = 's-icon-notifications-info-24';
  const tokenLogoClass = 'asset-logo';
  const classes = [tokenLogoClass];
  const hasIcon = Boolean(sanitizedIcon.value);

  if (!assetAddress.value) {
    classes.push(questionMark);
  } else if (!whitelistedItem.value) {
    classes.push(isNft.value ? 'asset-logo-nft' : questionMark);
  } else if (!isNft.value && !hasIcon) {
    classes.push(questionMark);
  }

  classes.push(`${tokenLogoClass}--${props.size.toLowerCase()}`);

  if (props.withClickableLogo) {
    classes.push('asset-logo--clickable');
  }

  return classes;
});

defineExpose({
  iconStyles,
  iconClasses,
});
</script>

<style lang="scss" scoped>
$token-background-color: var(--s-color-base-on-accent);
$token-color: var(--s-color-base-content-tertiary);

.logo {
  position: relative;
}
.asset-logo {
  &__nft-image {
    border-radius: 50%;
    object-fit: cover;
    position: absolute !important;
    top: 0;
    left: 0;
  }

  &--clickable {
    cursor: pointer;
  }
}

@mixin token-logo-size($size: '') {
  $className: 'asset-logo';
  @if ($size == 'mini') {
    $size-px: 16px;
    $classNameMini: '#{$className}--mini';
    @include element-size($classNameMini, $size-px);
    .#{$classNameMini} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 12px;
      color: var(--s-color-base-content-tertiary);
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 6px;
      }
    }
  } @else if ($size == 'small') {
    $size-px: 24px;
    $classNameSmall: '#{$className}--small';
    @include element-size($classNameSmall, $size-px);
    .#{$classNameSmall} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 18px;
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 8px;
        font-weight: 800;
      }
    }
  } @else if ($size == 'medium') {
    $size-px: 32px;
    $classNameMedium: '#{$className}--medium';
    @include element-size($classNameMedium, $size-px);
    .#{$classNameMedium} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 24px;
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 12px;
        font-weight: 800;
      }
    }
  } @else if ($size == 'big') {
    $size-px: var(--s-size-medium);
    $classNameBig: '#{$className}--big';
    @include element-size($classNameBig, $size-px);
    .#{$classNameBig} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 32px;
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 14px;
        font-weight: 800;
      }
    }
  } @else if ($size == 'bigger') {
    $size-px: 48px;
    $classNameBig: '#{$className}--bigger';
    @include element-size($classNameBig, $size-px);
    .#{$classNameBig} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 32px;
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 14px;
        font-weight: 800;
      }
    }
  } @else if ($size == 'large') {
    $size-px: 80px;
    $classNameLarge: '#{$className}--large';
    @include element-size($classNameLarge, $size-px);
    .#{$classNameLarge} {
      @include asset-logo-styles;
      line-height: $size-px;
      font-size: 64px;
      &.#{$className}-nft::before {
        content: 'NFT';
        font-size: 28px;
        font-weight: 800;
      }
    }
  }
}

@include token-logo-size('mini');
@include token-logo-size('small');
@include token-logo-size('medium');
@include token-logo-size('big');
@include token-logo-size('bigger');
@include token-logo-size('large');
</style>
