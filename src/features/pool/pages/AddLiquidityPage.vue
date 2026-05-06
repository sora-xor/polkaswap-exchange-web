<template>
  <div v-loading="containerLoading" class="container">
    <GenericPageHeader
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    ></GenericPageHeader>
    <AddLiquidityForm @back="handleBack"></AddLiquidityForm>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useSelectedTokensRoute } from '@/shared/navigation/useSelectedTokensRoute';
import { usePoolStore } from '@/stores/pool';
import type { LiquidityParams } from '@/stores/pool/types';
import { useWalletStore } from '@/stores/wallet';

import type { Nullable } from '@/types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import AddLiquidityForm from '@/modules/pool/components/AddLiquidity/Form.vue';
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';
import { PoolPageNames } from '@/features/pool/consts';

defineOptions({
  name: 'AddLiquidityPage',
  inheritAttrs: false,
  components: {
    GenericPageHeader,
    AddLiquidityForm,
  },
});

const props = withDefaults(defineProps<{ parentLoading?: boolean }>(), { parentLoading: false });

const router = useRouter();
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
