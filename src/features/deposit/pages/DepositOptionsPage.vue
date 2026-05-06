<template>
  <div class="container">
    <div class="pay-options">
      <div class="pay-options__option pay-options-moonpay">
        <MoonpayLogo :theme="libraryTheme"></MoonpayLogo>
        <h4>{{ t('fiatPayment.moonpayTitle') }}</h4>
        <span>{{ t('fiatPayment.moonpayDesc') }}</span>
        <s-button class="pay-options__button" type="primary" @click="openMoonpayDialog">
          {{ moonpayTextBtn }}
        </s-button>
      </div>
      <div class="pay-options__option pay-options-cede">
        <CedeStoreLogo :theme="libraryTheme"></CedeStoreLogo>
        <h4>{{ t('fiatPayment.cedeStoreTitle', { value: TranslationConsts.CEX }) }}</h4>
        <span>{{
          t('fiatPayment.cedeStoreDesc', {
            value1: TranslationConsts.CEX,
            value2: TranslationConsts.Polkaswap,
            value3: TranslationConsts.CedeStore,
          })
        }}</span>
        <s-button class="pay-options__button" type="primary" @click="openCedeWidget">
          {{ cedeTextBtn }}
        </s-button>
      </div>
      <div v-if="isLoggedIn" class="pay-options__history-btn" @click="openDepositTxHistory">
        <span>{{ t('fiatPayment.historyBtn') }}</span>
        <div>
          <span :class="computedCounterClass">{{ pendingTxCount }}</span>
          <s-icon name="arrows-chevron-right-rounded-24" size="18"></s-icon>
        </div>
      </div>
    </div>
    <template v-if="moonpayEnabled">
      <Moonpay></Moonpay>
      <MoonpayNotification></MoonpayNotification>
      <MoonpayConfirmation></MoonpayConfirmation>
      <SelectProviderDialog></SelectProviderDialog>
    </template>
    <PaymentError v-model:visible="showErrorInfoBanner"></PaymentError>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';

import CedeStoreLogo from '@/components/shared/Logo/CedeStore.vue';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { PageNames, TranslationConsts } from '@/consts';
import { Theme } from '@/consts/theme';
import { createAsyncComponent } from '@/shared/ui/async';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';

import type { Nullable } from '@/types/common';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import DepositMoonpay from '@/components/pages/Moonpay/Moonpay.vue';
import DepositMoonpayConfirmation from '@/components/pages/Moonpay/Confirmation.vue';
import DepositMoonpayNotification from '@/components/pages/Moonpay/Notification.vue';

const PaymentError = createAsyncComponent(() => import('@/components/shared/Dialog/PaymentError.vue'));
const SelectProviderDialog = createAsyncComponent(() => import('@/components/shared/Dialog/SelectProvider.vue'));

export default defineComponent({
  name: 'DepositOptionsPage',
  components: {
    CedeStoreLogo,
    MoonpayLogo,
    Moonpay: DepositMoonpay,
    MoonpayConfirmation: DepositMoonpayConfirmation,
    MoonpayNotification: DepositMoonpayNotification,
    PaymentError,
    SelectProviderDialog,
  },
  setup() {
    const showErrorInfoBanner = ref(false);
    const router = useRouter();

    const { t } = useTranslation();
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { connectEvmWallet, evmAddress, disconnectExternalNetwork } = useWeb3Connection();
    const moonpayStore = useMoonpayStore();
    const settingsStore = useSettingsStore();

    const libraryTheme = computed(() => (settingsStore.libraryTheme ?? Theme.LIGHT) as Theme);
    const moonpayEnabled = computed(() => Boolean(settingsStore.moonpayEnabled));
    const startBridgeButtonVisibility = computed(() => Boolean(moonpayStore.startBridgeButtonVisibility));
    const bridgeTransactionData = computed(() => moonpayStore.bridgeTransactionData as Nullable<EthHistory>);
    const pendingTxCount = computed(() => (startBridgeButtonVisibility.value && bridgeTransactionData.value ? 1 : 0));
    const hasPendingTx = computed(() => pendingTxCount.value > 0);
    const computedCounterClass = computed(() => {
      const classes = ['pay-options__purchase-count'];
      if (hasPendingTx.value) {
        classes.push('pay-options__purchase-count--pending');
      }
      return classes.join(' ');
    });

    const moonpayTextBtn = computed(() => (isLoggedIn.value ? t('fiatPayment.moonpayTitle') : t('connectWalletText')));
    const cedeTextBtn = computed(() =>
      isLoggedIn.value
        ? t('fiatPayment.cedeStoreBtn', {
            value1: TranslationConsts.CEX,
            value2: TranslationConsts.CedeStore,
          })
        : t('connectWalletText')
    );
    const setMoonpayVisibility = (value: boolean) => {
      moonpayStore.setDialogVisibility(value);
    };

    const openDepositTxHistory = async (): Promise<void> => {
      await router.push({ name: PageNames.DepositTxHistory });
    };

    const openCedeWidget = async (): Promise<void> => {
      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }

      await router.push({ name: PageNames.CedeStore });
    };

    const showErrorMessage = (): void => {
      showErrorInfoBanner.value = true;
    };

    const openMoonpayDialog = async (): Promise<void> => {
      if (!moonpayEnabled.value) {
        showErrorMessage();
        return;
      }

      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }

      if (!evmAddress.value) {
        try {
          await connectEvmWallet();
        } catch {
          return;
        }

        if (!evmAddress.value) return;
      }

      setMoonpayVisibility(true);
    };

    onBeforeUnmount(() => {
      disconnectExternalNetwork();
    });

    return {
      TranslationConsts,
      cedeTextBtn,
      computedCounterClass,
      libraryTheme,
      moonpayEnabled,
      moonpayTextBtn,
      openCedeWidget,
      openDepositTxHistory,
      openMoonpayDialog,
      pendingTxCount,
      showErrorInfoBanner,
      t,
      isLoggedIn,
    };
  },
});
</script>

<style lang="scss" scoped>
.pay-options {
  &__option {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    margin-bottom: $basic-spacing;
    padding: 20px 0 20px 0;
    height: 240px;
    background: var(--s-color-utility-body);
    box-shadow: $button-custom-shadow;
    border-radius: 24px;
    text-align: center;

    span {
      width: 70%;
    }

    h4 {
      margin: 0;
      font-size: 18px;
      font-weight: 400;
      line-height: 27px;
    }

    svg {
      width: 140px;
    }

    &:hover {
      box-shadow: var(--s-shadow-element);
    }
  }

  &__button {
    width: 85%;
    max-width: 298px;
    height: 42px;
    min-height: 42px;
    font-weight: 500;
    line-height: 14px;
    text-transform: uppercase;
  }

  &__history-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--s-size-mini);
    color: var(--s-color-base-content-primary);
    font-weight: 500;
    width: 100%;
    cursor: pointer;
    border-radius: var(--s-border-radius-medium);
    box-shadow: var(--s-shadow-element-flat), var(--s-shadow-element-flat-reverse);

    span {
      font-size: var(--s-font-size-medium);
    }

    &:hover {
      span {
        color: var(--s-color-theme-accent);
      }
    }
  }

  &__purchase-count {
    font-size: var(--s-font-size-medium);
    color: var(--s-color-theme-accent);
    font-weight: 700;
    margin-right: 5px;
    transition: color 0.5s ease;

    &--pending {
      color: var(--s-color-status-warning);
    }
  }
}

@media screen and (max-width: 720px) {
  .pay-options {
    &__option {
      height: 240px;
    }
  }
}
</style>
