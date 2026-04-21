<template>
  <StatusBadgeShared
    :active="stakingInitialized"
    :stopped="false"
    :apr="soraStakingApyFormatted"
    :reward-asset="rewardAsset"
  ></StatusBadgeShared>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusBadgeShared from '@/components/shared/StatusBadge.vue';
import { useTranslation } from '@/composables/useTranslation';

import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { asZeroValue, formatDecimalPlaces } from '@/utils';

const { t } = useTranslation();
const { stakingInitialized, maxApy, rewardAsset } = useSoraStaking();

const soraStakingApyFormatted = computed(() =>
  asZeroValue(maxApy.value) ? t('calculatingText') : formatDecimalPlaces(maxApy.value, true)
);

defineExpose({ soraStakingApyFormatted });
</script>
