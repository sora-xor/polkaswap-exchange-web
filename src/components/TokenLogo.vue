<template>
  <span :class="tokenClasses" :style="tokenStyles" />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { Asset, AccountAsset, Whitelist, WhitelistItem } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { LogoSize, ObjectInit } from '@/consts';

// TODO: move to js lib
type WhitelistIdsBySymbol = {
  [key: string]: string;
};

@Component
export default class TokenLogo extends Mixins(TranslationMixin) {
  @Getter whitelist!: Whitelist;
  @Getter whitelistIdsBySymbol!: WhitelistIdsBySymbol;

  @Prop({ type: String, default: '' }) readonly tokenSymbol!: string;
  @Prop({ type: Object, default: ObjectInit }) readonly token!: AccountAsset | Asset;
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize;

  get assetAddress(): string {
    return this.tokenSymbol ? this.whitelistIdsBySymbol[this.tokenSymbol] : this.token.address;
  }

  get whitelistedItem(): Nullable<WhitelistItem> {
    if (!(this.token || this.tokenSymbol)) {
      return null;
    }
    const address = this.assetAddress;
    return this.whitelist[address];
  }

  get tokenClasses(): Array<string> {
    const tokenLogoClass = 'token-logo';
    const classes = [tokenLogoClass];
    classes.push(`${tokenLogoClass}--${this.size.toLowerCase()}`);

    const asset = this.whitelistedItem;
    if (!asset) {
      const isNft = this.token ? api.assets.isNft(this.token) : false;
      return [...classes, isNft ? 'token-logo-nft' : 's-icon-notifications-info-24'];
    }

    return classes;
  }

  get tokenStyles(): object {
    const asset = this.whitelistedItem;
    if (asset) {
      return {
        'background-size': '100%',
        'background-image': `url("${asset.icon}")`,
      };
    } else {
      return {};
    }
  }
}
</script>

<style lang="scss" scoped>
$token-background-color: var(--s-color-base-on-accent);
$token-color: var(--s-color-base-content-tertiary);

.token-logo {
  background-color: $token-background-color;
  background-size: 60%;
  background-repeat: no-repeat;
  background-position: 50%;
  border: none;
  box-shadow: none;
  border-radius: 50%;
  text-align: center;
  position: relative;
  font-style: unset;
  &::before {
    display: block;
    color: $token-color;
  }
  &-nft::before {
    font-weight: 800;
    content: 'NFT';
  }
}

@mixin token-logo-size($size: '') {
  $className: 'token-logo';
  @if ($size == 'mini') {
    $size-px: 16px;
    $classNameMini: '#{$className}--mini';
    @include element-size($classNameMini, $size-px);
    .#{$classNameMini} {
      line-height: $size-px;
      font-size: 12px;
      &.#{$className}-nft::before {
        font-size: 6px;
      }
    }
  } @else if ($size == 'small') {
    $size-px: 24px;
    $classNameSmall: '#{$className}--small';
    @include element-size($classNameSmall, $size-px);
    .#{$classNameSmall} {
      line-height: $size-px;
      font-size: 18px;
      &.#{$className}-nft::before {
        font-size: 8px;
      }
    }
  } @else if ($size == 'medium') {
    $size-px: 32px;
    $classNameMedium: '#{$className}--medium';
    @include element-size($classNameMedium, $size-px);
    .#{$classNameMedium} {
      line-height: $size-px;
      font-size: 24px;
      &.#{$className}-nft::before {
        font-size: 12px;
      }
    }
  } @else if ($size == 'big') {
    $size-px: var(--s-size-medium);
    $classNameBig: '#{$className}--big';
    @include element-size($classNameBig, $size-px);
    .#{$classNameBig} {
      line-height: $size-px;
      font-size: 32px;
      &.#{$className}-nft::before {
        font-size: 14px;
      }
    }
  } @else if ($size == 'large') {
    $size-px: 80px;
    $classNameLarge: '#{$className}--large';
    @include element-size($classNameLarge, $size-px);
    .#{$classNameLarge} {
      line-height: $size-px;
      font-size: 64px;
      &.#{$className}-nft::before {
        font-size: 28px;
      }
    }
  }
}

@include token-logo-size('mini');
@include token-logo-size('small');
@include token-logo-size('medium');
@include token-logo-size('big');
@include token-logo-size('large');
</style>
