<template>
  <div class="validator-avatar">
    <img v-if="avatar" :src="avatar" />
    <wallet-avatar v-else :address="validator.address" :size="14" class="account-gravatar" />
    <div class="icon">
      <slot name="icon" />
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import StakingMixin from '../mixins/StakingMixin';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
  },
})
export default class ValidatorsList extends Mixins(StakingMixin, mixins.LoadingMixin) {
  @Prop({ required: true, type: Object }) readonly validator!: ValidatorInfoFull;

  get avatar() {
    return this.validator.identity?.info.image;
  }
}
</script>

<style lang="scss" scoped>
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
