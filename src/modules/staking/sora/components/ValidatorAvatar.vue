<template>
  <div class="validator-avatar">
    <img v-if="avatar" alt="avatar" :src="avatar" />
    <WalletAvatar v-else :address="validator.address" :size="14" class="account-gravatar"></WalletAvatar>
    <div class="icon">
      <slot name="icon"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { resolveValidatorAvatarUrl } from '@/modules/staking/sora/utils/validatorAvatar';

import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

const props = defineProps<{
  validator: ValidatorInfoFull;
}>();

const WalletAvatar = components.WalletAvatar;

const avatar = computed(() => resolveValidatorAvatarUrl(props.validator));

defineExpose({ avatar });
</script>

<style scoped lang="scss">
.validator-avatar {
  position: relative;
  border-radius: 50%;
  width: 36px;
  height: 36px;

  img,
  svg {
    width: 100%;
    height: 100%;
  }

  .icon {
    position: absolute;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    right: -6px;
    bottom: -4px;
  }
}
</style>
