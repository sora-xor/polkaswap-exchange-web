<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" class="token-logo" :size="size" />
    <token-logo :token="secondToken" class="token-logo" :size="size" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { LogoSize, ObjectInit } from '@/consts';

import { components } from '@soramitsu/soraneo-wallet-web';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
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
@include element-size('pair-logo--small', 36px);
@include element-size('pair-logo--medium', 44px);
@include element-size('pair-logo--big', 64px);
</style>
