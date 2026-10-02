<template>
  <aside v-if="visible" class="tonswap-journey" aria-labelledby="tonswap-journey-title">
    <div>
      <strong id="tonswap-journey-title">{{
        t(
          purpose === 'xor'
            ? 'buyXor.resumeTitle'
            : isGetTs
              ? 'getTs.resumeTitle'
              : 'burnPage.tonswap.journey.resumeTitle'
        )
      }}</strong>
      <p>
        {{
          t(
            purpose === 'xor'
              ? 'buyXor.resumeDescription'
              : isGetTs
                ? 'getTs.resumeDescription'
                : 'burnPage.tonswap.journey.resumeDescription'
          )
        }}
      </p>
      <p v-if="!purpose && intent?.amount">
        {{ t('burnPage.tonswap.journey.savedAmount', { amount: intent.amount }) }}
      </p>
    </div>
    <router-link :to="returnRoute">{{
      t(purpose === 'xor' ? 'buyXor.return' : isGetTs ? 'getTs.return' : 'burnPage.tonswap.journey.return')
    }}</router-link>
    <button type="button" @click="dismiss">{{ t('burnPage.tonswap.journey.dismiss') }}</button>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import {
  clearGetTsView,
  parseGetTsFundingPurpose,
  readGetTsView,
  type GetTsPurpose,
} from '@/features/misc/lib/getTsFlow';
import { buildTonswapReturnRoute, clearTonswapIntent, readTonswapIntent } from '@/features/misc/lib/tonswapOnboarding';

/** Keeps the saved guide visible across funding screens without redirecting or assuming a transaction completed. */
defineOptions({ name: 'TonswapJourneyNotice' });
const route = useRoute();
const router = useRouter();
const { t } = useTranslation();
const intent = ref(readTonswapIntent());
const getTsView = ref(readGetTsView());
const buyXorView = ref(readGetTsView(undefined, 'xor'));
const dismissed = ref(false);
const purpose = computed<GetTsPurpose | null>(() => {
  const explicit = parseGetTsFundingPurpose(route.query);
  if (explicit) return explicit;
  if (route.query.buyXor !== undefined) return null;
  if (route.query.getTs === '1') return 'ts';
  if (route.query.campaign === 'tonswap') return null;
  if (getTsView.value && buyXorView.value) return null;
  return buyXorView.value ? 'xor' : getTsView.value ? 'ts' : null;
});
const isGetTs = computed(() => purpose.value === 'ts');
const returnRoute = computed(() =>
  purpose.value ? { path: purpose.value === 'xor' ? '/buy-xor' : '/get-ts' } : buildTonswapReturnRoute()
);
const visible = computed(
  () =>
    !dismissed.value &&
    /^\/(?:swap|deposit|bridge)(?:\/|$)/.test(route.path) &&
    !(route.query.buyXor !== undefined && purpose.value !== 'xor') &&
    Boolean(purpose.value || route.query.campaign === 'tonswap' || (!buyXorView.value && intent.value))
);

/** Dismissal removes only this purchase purpose's public navigation hint. */
function dismiss(): void {
  const selected = purpose.value;
  dismissed.value = true;
  if (selected === 'xor') {
    clearGetTsView(undefined, 'xor');
    buyXorView.value = null;
  } else {
    clearTonswapIntent();
    clearGetTsView();
    intent.value = null;
    getTsView.value = null;
  }
  if (route.query.campaign === 'tonswap' || route.query.getTs === '1' || route.query.buyXor === '1') {
    const query = { ...route.query };
    if (selected === 'xor') {
      delete query.buyXor;
      delete query.asset;
    } else {
      if (query.campaign === 'tonswap') {
        delete query.campaign;
        delete query.acquire;
        if (query.getTs === '1') delete query.asset;
      }
      if (query.getTs === '1') delete query.getTs;
    }
    void router.replace({ path: route.path, query, hash: route.hash });
  }
}

watch(
  () => route.fullPath,
  () => {
    intent.value = readTonswapIntent();
    getTsView.value = readGetTsView();
    buyXorView.value = readGetTsView(undefined, 'xor');
    if (purpose.value || intent.value || route.query.campaign === 'tonswap') dismissed.value = false;
  }
);
</script>

<style scoped lang="scss">
.tonswap-journey {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--s-color-base-content-secondary);
  font-size: 13px;
  line-height: 1.5;
  div {
    flex: 1 1 260px;
  }
  p {
    margin: 4px 0 0;
    color: var(--s-color-base-content-secondary);
  }
  a {
    font-weight: 600;
    color: var(--s-color-theme-accent);
    padding: 10px 0;
  }
  button {
    background: none;
    border: 0;
    color: var(--s-color-base-content-secondary);
    font: inherit;
    cursor: pointer;
    padding: 10px 0;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--s-color-theme-accent);
    outline-offset: 4px;
  }
}
</style>
