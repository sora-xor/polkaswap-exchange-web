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
import { useI18n } from 'vue-i18n';

import { Components } from '@/consts';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { lazyComponent } from '@/router';
import { asZeroValue, formatDecimalPlaces } from '@/utils';

const { t } = useI18n();
const { stakingInitialized, maxApy, rewardAsset } = useSoraStaking();

const StatusBadgeShared = lazyComponent(Components.StatusBadge);

const soraStakingApyFormatted = computed(() =>
  asZeroValue(maxApy.value) ? t('calculatingText') : formatDecimalPlaces(maxApy.value, true)
);

defineExpose({ soraStakingApyFormatted });
</script>
