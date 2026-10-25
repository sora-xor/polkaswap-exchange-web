<template>
  <div class="container cede-store-page" v-loading="parentLoading">
    <GenericPageHeader has-button-back @back="goToDepositOptions">
      <template #title="">{{ brandName }}</template>
    </GenericPageHeader>
    <div id="cede-widget"></div>
  </div>
</template>

<script lang="ts">
import { capitalize } from '@/utils';
import { computed, defineComponent, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts';
import { Theme } from '@/consts/theme';
import { createAsyncComponent } from '@/shared/ui/async';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';

const GenericPageHeader = createAsyncComponent(() => import('@/components/shared/GenericPageHeader.vue'));

export default defineComponent({
  name: 'CedeStorePage',
  components: {
    GenericPageHeader,
  },
  props: {
    parentLoading: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const router = useRouter();
    const { TranslationConsts } = useTranslation();
    const settingsStore = useSettingsStore();
    const walletStore = useWalletStore();
    const brandName = computed(() => capitalize(TranslationConsts.CedeStore));

    const accountAddress = computed(() => walletStore.address ?? '');
    const libraryTheme = computed(() => (settingsStore.libraryTheme ?? Theme.LIGHT) as Theme);

    const rootSelector = '#cede-widget';

    const goToDepositOptions = async (): Promise<void> => {
      await router.push({ name: PageNames.DepositOptions });
    };

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

    return {
      brandName,
      goToDepositOptions,
    };
  },
});
</script>

<style lang="scss">
.cede-store-page {
  .page-header .page-header-title {
    text-transform: none;
  }
}
</style>
