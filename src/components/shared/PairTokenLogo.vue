<template>
  <div :class="computedClasses">
    <token-logo :token="firstToken" class="token-logo first-logo" :size="size"></token-logo>
    <token-logo :token="secondToken" class="token-logo second-logo" :size="size"></token-logo>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { LogoSize, ObjectInit } from '@/consts';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

defineOptions({
  name: 'PairTokenLogo',
  components: {
    TokenLogo: WalletComponentTokenLogo,
  },
});

const props = withDefaults(
  defineProps<{
    firstToken?: AccountAsset | Asset;
    secondToken?: AccountAsset | Asset;
    size?: LogoSize;
  }>(),
  {
    firstToken: ObjectInit,
    secondToken: ObjectInit,
    size: LogoSize.MEDIUM,
  }
);

const computedClasses = computed(() => {
  const componentClass = 'pair-logo';
  const classes = [componentClass];

  if (props.size) {
    classes.push(`${componentClass}--${String(props.size).toLowerCase()}`);
  }

  return classes.join(' ');
});
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
