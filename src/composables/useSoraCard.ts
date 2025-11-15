import { computed } from 'vue';

import { storeToRefs } from 'pinia';

import store from '@/store';
import { useInternalConnect } from '@/composables/useInternalConnect';

export function useSoraCard() {
  const { connectSoraWallet, isLoggedIn } = useInternalConnect();

  const wasEuroBalanceLoaded = computed(() => store.state.soraCard.wasEuroBalanceLoaded as boolean);
  const isEuroBalanceEnough = computed(() => store.getters.soraCard.isEuroBalanceEnough as boolean);
  const displayRegions = computed(() => store.state.settings.displayRegions as Nullable<Intl.DisplayNames>);

  const clearPayWingsKeys = () => localStorage.removeItem('PW-token');

  return {
    connectSoraWallet,
    isLoggedIn,
    wasEuroBalanceLoaded,
    isEuroBalanceEnough,
    displayRegions,
    clearPayWingsKeys,
  };
}

export type SoraCardComposable = ReturnType<typeof useSoraCard>;
