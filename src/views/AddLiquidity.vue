<template>
  <div v-loading="containerLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    ></generic-page-header>
    <add-liquidity-form @back="handleBack"></add-liquidity-form>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';

import { Components } from '@/consts';
import { useLoading } from '@/composables/useLoading';
import { useSelectedTokensRoute } from '@/composables/useSelectedTokensRoute';
import { useTranslation } from '@/composables/useTranslation';
import { PoolComponents, PoolPageNames } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import router, { lazyComponent } from '@/router';
import { usePoolStore } from '@/stores/pool';
import type { LiquidityParams } from '@/stores/pool/types';
import { useWalletStore } from '@/stores/wallet';

import type { Nullable } from '@/types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    AddLiquidityForm: poolLazyComponent(PoolComponents.AddLiquidityForm),
  },
});

const props = withDefaults(defineProps<{ parentLoading?: boolean }>(), { parentLoading: false });

const { t } = useTranslation();
const { loading, withParentLoading } = useLoading({ parentLoading: () => props.parentLoading });
const poolStore = usePoolStore();
const walletStore = useWalletStore();

const isLoggedIn = computed(() => walletStore.isLoggedIn);
const firstToken = computed(() => poolStore.addLiquidityFirstToken as Nullable<AccountAsset>);
const secondToken = computed(() => poolStore.addLiquiditySecondToken as Nullable<AccountAsset>);

const setDataFromLiquidity = async (params: LiquidityParams) => {
  await poolStore.setAddLiquidityDataFromLiquidity(params);
};
const resetData = () => poolStore.resetAddLiquidityData();

const { firstRouteAddress, secondRouteAddress, isValidRoute, parseCurrentRoute, updateRouteAfterSelectTokens } =
  useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
    await setDataFromLiquidity({ firstAddress, secondAddress });
  });

const containerLoading = computed(() => props.parentLoading || loading.value);

const handleBack = () => {
  router.push({ name: PoolPageNames.Pool });
};

watch(isLoggedIn, (current, previous) => {
  if (previous && !current) {
    handleBack();
  }
});

watch([firstToken, secondToken], ([first, second]) => {
  updateRouteAfterSelectTokens(first, second);
});

onMounted(async () => {
  await withParentLoading(async () => {
    parseCurrentRoute();

    const firstAddress = isValidRoute.value && firstRouteAddress.value ? firstRouteAddress.value : '';
    const secondAddress = isValidRoute.value && secondRouteAddress.value ? secondRouteAddress.value : '';

    await setDataFromLiquidity({ firstAddress, secondAddress });
  });
});

onBeforeUnmount(() => {
  void resetData();
});
</script>
