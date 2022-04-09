<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" :size="size" class="first-logo" />
    <token-logo :token="secondToken" :size="size" class="second-logo" />
    <nft-token-logo :asset="secondToken" class="nft-logo" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';
import { components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { LogoSize, Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    NftTokenLogo: components.NftTokenLogo,
  },
})
export default class PairTokenLogo extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: ObjectInit }) readonly firstToken!: AccountAsset | Asset;
  @Prop({ type: Object, default: ObjectInit }) readonly secondToken!: AccountAsset | Asset;
  @Prop({ type: String, default: LogoSize.MEDIUM, required: false }) readonly size!: LogoSize;

  get computedClasses(): string {
    const componentClass = 'pair-logo';
    const classes = [componentClass];

    if (this.size) {
      classes.push(`${componentClass}--${this.size.toLowerCase()}`);
    }

    return classes.join(' ');
  }
}
</script>

<style lang="scss" scoped>
.pair-logo {
  position: relative;
  display: block;
  margin-right: $inner-spacing-mini;
  flex-shrink: 0;
  height: calc(var(--s-size-mini) * 1.5);
  width: var(--s-size-mini);

  .first-logo {
    top: 0;
  }
  .second-logo {
    bottom: 0;
  }

  .nft-logo {
    border-radius: 50%;
    object-fit: cover;
    width: var(--s-size-mini);
    height: var(--s-size-mini);
    bottom: 0;
    position: absolute;
    background-color: var(--s-color-base-background);
  }

  .token-logo {
    position: absolute;

    &:first-child {
      top: 0;
      left: 0;
      z-index: 1;
    }
    &:last-child {
      bottom: 0;
      right: 0;
    }
  }
}

@include element-size('pair-logo--mini', 24px);
</style>
