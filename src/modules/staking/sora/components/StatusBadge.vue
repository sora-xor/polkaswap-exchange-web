<template>
  <status-badge-shared
    :active="stakingInitialized"
    :stopped="false"
    :apr="soraStakingAPYFormatted"
    :reward-asset="rewardAsset"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { formatDecimalPlaces, asZeroValue } from '@/utils';

import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    StatusBadgeShared: lazyComponent(Components.StatusBadge),
  },
})
export default class StatusBadge extends Mixins(StakingMixin) {
  get soraStakingAPYFormatted(): string {
    return asZeroValue(this.maxApy) ? this.t('calculatingText') : formatDecimalPlaces(this.maxApy, true);
  }
}
</script>
