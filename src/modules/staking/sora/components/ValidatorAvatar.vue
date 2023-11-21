<template>
  <div class="validator-avatar">
    <img :src="avatar" />
    <div class="icon">
      <slot name="icon" />
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import StakingMixin from '../mixins/StakingMixin';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

@Component
export default class ValidatorsList extends Mixins(StakingMixin, mixins.LoadingMixin) {
  @Prop({ required: true, type: Object }) readonly validator!: ValidatorInfoFull;

  get avatar() {
    return this.validator.identity?.info.image ?? '/staking/validator-avatar.svg';
  }
}
</script>

<style lang="scss" scoped>
.validator-avatar {
  position: relative;
  border-radius: 50%;
  width: 36px;
  height: 36px;

  img {
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
