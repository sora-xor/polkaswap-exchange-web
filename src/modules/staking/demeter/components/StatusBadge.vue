<template>
  <status-badge-shared
    :active="hasStake"
    :stopped="!activeStatus"
    :apr="apr"
    :reward-asset="rewardAssetValue"
    @click="handleBadgeClick"
  ></status-badge-shared>
</template>

<script lang="ts" setup>
import { computed, toRefs, type PropType } from 'vue';

import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import { useDemeterPoolStatus } from '../composables/useDemeterPoolStatus';

import type { DemeterAsset, DemeterPool, DemeterAccountPool } from '../types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Nullable } from '@/types/common';

defineOptions({
  components: {
    StatusBadgeShared: lazyComponent(Components.StatusBadge),
  },
});

const props = defineProps({
  liquidity: { type: Object as PropType<Nullable<AccountLiquidity>>, default: null },
  pool: { type: Object as PropType<Nullable<DemeterPool>>, default: null },
  accountPool: { type: Object as PropType<Nullable<DemeterAccountPool>>, default: null },
  poolAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  rewardAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  apr: { type: String, default: ZeroStringValue },
});

const emit = defineEmits<{
  (event: 'add', payload: { baseAsset: string; poolAsset: string; rewardAsset: string }): void;
}>();

const { liquidity, pool, accountPool, poolAsset, rewardAsset } = toRefs(props);

const statusApi = useDemeterPoolStatus({
  liquidity,
  pool,
  accountPool,
  poolAsset,
  rewardAsset,
});

const apr = computed(() => props.apr);
const rewardAssetValue = computed(() => rewardAsset.value);
const hasStake = computed(() => statusApi.hasStake.value);
const activeStatus = computed(() => statusApi.activeStatus.value);
const depositDisabled = computed(() => statusApi.depositDisabled.value);

const handleBadgeClick = (event: Event) => {
  if (depositDisabled.value) return;

  event.stopPropagation();
  emit('add', statusApi.emitParams.value);
};
</script>
