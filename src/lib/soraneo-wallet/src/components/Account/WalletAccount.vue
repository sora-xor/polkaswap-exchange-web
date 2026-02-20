<template>
  <account-card v-bind="$attrs">
    <template #avatar>
      <wallet-avatar class="account-gravatar" :address="address" :size="28"></wallet-avatar>
    </template>
    <template #name>
      <identity v-if="identity" :identity="identity" :local-name="name"></identity>
      <template v-else>{{ name }}</template>
    </template>
    <template #description>
      <formatted-address :value="address" :symbols="20" :tooltip-text="t('account.walletAddress')"></formatted-address>
    </template>
    <template #default>
      <slot></slot>
    </template>
  </account-card>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { api } from '@/api';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { getLegacyStore } from '@/utils/legacy-store';
import type { AccountIdentity, PolkadotJsAccount } from '@/types/common';
import { formatAccountAddress, getAccountIdentity } from '@/util';

import FormattedAddress from '../shared/FormattedAddress.vue';

import AccountCard from './AccountCard.vue';
import Identity from './Identity.vue';
import WalletAvatar from './WalletAvatar.vue';

import type { WithConnectionApi } from '@sora-substrate/sdk';

const DEFAULT_NAME = '<unknown>';
const resolveStore = () => getLegacyStore() ?? ((globalThis as Record<string, unknown>).__PS_APP_STORE__ as any);

const props = withDefaults(
  defineProps<{
    polkadotAccount?: Nullable<PolkadotJsAccount>;
    withIdentity?: boolean;
    chainApi?: Nullable<WithConnectionApi>;
  }>(),
  {
    polkadotAccount: null,
    withIdentity: false,
    chainApi: null,
  }
);

const emit = defineEmits<{
  (event: 'identity', identity: Nullable<AccountIdentity>): void;
}>();

const { t } = useTranslation();

const isWalletLoaded = computed(() => resolveStore()?.state?.wallet?.settings?.isWalletLoaded ?? false);
const { withApi } = useLoading({ isWalletLoaded });

const resolvedChainApi = computed<WithConnectionApi>(() => props.chainApi ?? api);

const connected = computed(() => resolveStore()?.getters?.['wallet/account/account'] as Nullable<PolkadotJsAccount>);

const account = computed<Nullable<PolkadotJsAccount>>(() => props.polkadotAccount ?? connected.value ?? null);

const address = computed(() => {
  const value = account.value?.address;

  return value ? formatAccountAddress(value, true, resolvedChainApi.value) : '';
});

const accountIdentity = ref<Nullable<AccountIdentity>>(null);

watch(
  address,
  async (value, oldValue) => {
    if (!props.withIdentity || value === oldValue || !value) return;

    await withApi(async () => {
      accountIdentity.value = await getAccountIdentity(value, resolvedChainApi.value);
      emit('identity', accountIdentity.value);
    });
  },
  { immediate: true }
);

const name = computed(() => {
  if (account.value?.name) {
    return account.value.name;
  }

  const mstAddress = api.mst?.getMstAddress?.();
  if (!mstAddress) {
    return DEFAULT_NAME;
  }

  const mstAccount = api.mst?.getMstAccount?.(mstAddress);
  if (mstAccount?.meta?.name) {
    return mstAccount.meta.name;
  }

  return DEFAULT_NAME;
});

const identity = computed<Nullable<AccountIdentity>>(() => account.value?.identity ?? accountIdentity.value);

defineExpose({
  account,
  address,
  name,
  identity,
});
</script>

<style lang="scss">
.account-gravatar {
  border: 2px solid var(--s-color-base-border-secondary);
  border-radius: 50%;

  & > circle:first-child {
    fill: var(--s-color-utility-surface);
  }
}
</style>
