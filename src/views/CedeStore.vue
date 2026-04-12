<template>
  <div class="container cede-store-page" v-loading="parentLoading">
    <generic-page-header has-button-back @back="goTo(PageNames.DepositOptions)">
      <template #title="">{{ brandName }}</template>
    </generic-page-header>
    <div id="cede-widget"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, toRef } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Theme } from '@/consts/theme';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { capitalize } from '@/utils';

import { Components, PageNames } from '../consts';
import { goTo, lazyComponent } from '../router';

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

defineOptions({
  name: 'CedeStore',
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
});

const parentLoading = toRef(props, 'parentLoading');

const { TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();
const brandName = computed(() => capitalize(TranslationConsts.CedeStore));

const accountAddress = computed(() => walletStore.address ?? '');
const libraryTheme = computed(() => (settingsStore.libraryTheme ?? Theme.LIGHT) as Theme);

const rootSelector = '#cede-widget';

const loadCedeWidget = async () => {
  try {
    await nextTick();
    const { renderSendWidget } = await import('@cedelabs/widgets-universal');
    renderSendWidget(rootSelector, {
      config: {
        tokenSymbol: 'XOR',
        network: 'sora',
        address: accountAddress.value,
        lockNetwork: true,
      },
      theme: {
        mode: libraryTheme.value,
        logoTheme: libraryTheme.value,
        fontFamily: 'Sora',
        width: '420px',
        accentColor: '#f8087b',
        logoBorderColor: '#f8087b',
        warningColor: '#eba332',
        errorColor: '#f754a3',
      },
    });
  } catch (error) {
    console.error("[CEDE STORE] wasn't loaded.", error);
  }
};

onMounted(() => {
  void loadCedeWidget();
});
</script>

<style lang="scss">
.cede-store-page {
  .page-header .page-header-title {
    text-transform: none;
  }
}
</style>
