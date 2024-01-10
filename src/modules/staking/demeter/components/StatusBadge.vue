<template>
  <status-badge-shared
    :active="hasStake"
    :stopped="!activeStatus"
    :apr="apr"
    :reward-asset="rewardAsset"
    @click.native="handleBadgeClick"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import PoolStatusMixin from '../mixins/PoolStatusMixin';

@Component({
  components: {
    StatusBadgeShared: lazyComponent(Components.StatusBadge),
  },
})
export default class StatusBadge extends Mixins(PoolStatusMixin) {
  handleBadgeClick(event: Event): void {
    if (this.depositDisabled) return;

    event.stopPropagation();

    this.add();
  }
}
</script>
