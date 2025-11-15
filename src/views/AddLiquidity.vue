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
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';

import { Components } from '@/consts';
import { useLoading } from '@/composables/useLoading';
import { useSelectedTokensRoute } from '@/composables/useSelectedTokensRoute';
import { useTranslation } from '@/composables/useTranslation';
import { PoolComponents, PoolPageNames } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import router, { lazyComponent } from '@/router';
import store from '@/store';

import type { Nullable } from '@/types/common';
import type { LiquidityParams } from '@/store/pool/types';
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

const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const firstToken = computed(() => store.getters.addLiquidity.firstToken as Nullable<AccountAsset>);
const secondToken = computed(() => store.getters.addLiquidity.secondToken as Nullable<AccountAsset>);

const setDataFromLiquidity = (params: LiquidityParams) => store.dispatch.addLiquidity.setDataFromLiquidity(params);
const resetData = () => store.dispatch.addLiquidity.resetData();

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

    const firstAddress = isValidRoute.value && firstRouteAddress.value ? firstRouteAddress.value : XOR.address;
    const secondAddress = isValidRoute.value && secondRouteAddress.value ? secondRouteAddress.value : '';

    await setDataFromLiquidity({ firstAddress, secondAddress });
  });
});

onBeforeUnmount(() => {
  void resetData();
});
</script>
