<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" class="token-logo first-logo" :size="size" />
    <token-logo :token="secondToken" class="token-logo second-logo" :size="size" />
  </div>
</template>

<script lang="ts">
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ObjectInit } from '@/consts';

import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class PairTokenLogo extends Mixins(TranslationMixin) {
  @Prop({ type: Object, default: ObjectInit }) readonly firstToken!: AccountAsset | Asset;
  @Prop({ type: Object, default: ObjectInit }) readonly secondToken!: AccountAsset | Asset;
  @Prop({ type: String, default: WALLET_CONSTS.LogoSize.MEDIUM, required: false })
  readonly size!: WALLET_CONSTS.LogoSize;

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
  display: inline-block;
  margin-right: $inner-spacing-mini;
  flex-shrink: 0;

  .token-logo {
    position: absolute;

    &:first-child {
      top: 0;
      left: 0;
    }
    &:last-child {
      bottom: 0;
      right: 0;
    }
  }
}

@include element-size('pair-logo--mini', 24px);
@include element-size('pair-logo--small', 36px);
@include element-size('pair-logo--medium', 44px);
</style>
