<template>
  <div class="sora-card sora-card-kyc-wrapper">
    <div v-if="!hasCameraAccess" class="camera-permission">
      <s-icon name="camera-16" size="48" class="camera-permission-icon"></s-icon>
      <h4 class="camera-permission-title">{{ t('browserPermission.title') }}</h4>
      <p class="camera-permission-desc">
        {{ t('browserPermission.desc') }}
      </p>
      <div class="camera-permission-disclaimer">
        <div class="tos__disclaimer">
          <p class="tos__disclaimer-paragraph">
            {{ t('browserPermission.disclaimer') }}
          </p>
          <div class="tos__disclaimer-warning icon">
            <s-icon name="notifications-alert-triangle-24" size="28px"></s-icon>
          </div>
        </div>
      </div>
      <s-button
        class="camera-permission-btn"
        type="primary"
        :disabled="forbiddenByBrowser"
        :loading="btnLoading"
        @click="requestCameraAccess"
      >
        {{ btnCameraText }}
      </s-button>
    </div>
    <div v-else>
      <div class="sora-card-kyc-view" v-loading="loadingKycView">
        <s-scrollbar>
          <div id="kyc"></div>
          <div id="finish" style="display: none">
            <div class="alert alert-success">Kyc was successfull, sample integrator response displayed here</div>
          </div>
        </s-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WALLET_CONSTS, ScriptLoader } from '@wallet';
import { checkDevicesAvailability, checkCameraPermission } from '@wallet/src/util';
import { v4 as uuidv4 } from 'uuid';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import { CardUIViews } from '@/types/card';
import type { Nullable, WindowInjectedWeb3 } from '@/types/common';
import { waitForSoraNetworkFromEnv } from '@/utils';
import { soraCard, getUpdatedJwtPair } from '@/utils/card';

type CameraPermission = PermissionState | '' | null;

const KYC_STYLES_URL = 'https://kyc-test.soracard.com/web/v2/webkyc.css';

const props = withDefaults(
  defineProps<{
    accessToken?: string;
  }>(),
  {
    accessToken: '',
  }
);

const emit = defineEmits<{
  (event: 'confirm', view: CardUIViews): void;
}>();

const { t, language } = useTranslation();
const { showAppNotification } = useNotification();

const soraNetwork = computed(() => store.state.wallet.settings.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>);
const source = computed(() => store.state.wallet.account.source as WALLET_CONSTS.AppWallet);
const referenceNumber = computed(() => store.state.soraCard.referenceNumber as Nullable<string>);
const setReferenceNumber = (value: Nullable<string>) => store.commit.soraCard.setReferenceNumber(value);

const loadingKycView = ref(true);
const btnLoading = ref(false);
const cameraPermission = ref<CameraPermission>(null);
const permissionDialogVisible = ref(false);
const updateJwtTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
const loadingTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);
const kycSdkUrl = ref<string | null>(null);

const hasCameraAccess = computed(() => cameraPermission.value === 'granted');
const forbiddenByBrowser = computed(() => cameraPermission.value === 'denied');

const isoLanguageName = computed(() => {
  const value = language.value;
  if (value === 'zh-CN') return 'zh';
  return value || 'en';
});

const btnCameraText = computed(() => {
  if (forbiddenByBrowser.value) return t('browserPermission.btnGoToSettings');
  if (hasCameraAccess.value) return t('continueText');
  return t('browserPermission.btnAllow');
});

const ensureRemoteStylesLoaded = async () => {
  const selector = `link[data-soracard-css="${KYC_STYLES_URL}"]`;
  const existing = document.querySelector(selector) as HTMLLinkElement | null;

  if (existing) {
    if (existing.sheet) return;
    await new Promise<void>((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
    });
    return;
  }

  if (isTestEnvironment) {
    return;
  }

  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KYC_STYLES_URL;
    link.dataset.soracardCss = KYC_STYLES_URL;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
};

const getReferenceNumber = async (url: string): Promise<string | undefined> => {
  const network = soraNetwork.value ?? (await waitForSoraNetworkFromEnv());
  const { kycService } = soraCard(network);
  const token = localStorage.getItem('PW-token');

  try {
    const result = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ReferenceID: uuidv4(),
        MobileNumber: '',
        Email: '',
        AddressChanged: false,
        DocumentChanged: false,
        IbanTypeID: null,
        CardTypeID: null,
        AdditionalData: '',
      }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await result.json();
    return data.ReferenceNumber;
  } catch (error) {
    console.error('[SoraCard]: Error while getting reference number', error);
    showAppNotification(t('card.infoMessageTryAgain'));
    emit('confirm', CardUIViews.Start);

    void ScriptLoader.unload(kycService.sdkURL, false);
    return undefined;
  }
};

const importMetaMode = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.MODE : undefined;
const isTestEnvironment = importMetaMode === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const scheduleJwtRefresh = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('PW-refresh-token');

  if (!refreshToken) {
    updateJwtTimeoutId.value = null;
    return;
  }

  try {
    await getUpdatedJwtPair(refreshToken);
  } catch (error) {
    console.error('[SoraCard]: Failed to refresh JWT pair', error);
  }

  if (isTestEnvironment) {
    updateJwtTimeoutId.value = null;
    return;
  }

  updateJwtTimeoutId.value = setTimeout(() => {
    void scheduleJwtRefresh();
  }, 60_000 * 19.85);
};

const startJwtRefresh = async () => {
  stopJwtRefresh();
  await scheduleJwtRefresh();
};

const stopJwtRefresh = () => {
  if (updateJwtTimeoutId.value !== null) {
    clearTimeout(updateJwtTimeoutId.value);
    updateJwtTimeoutId.value = null;
  }
};

const checkMediaDevicesAllowance = async (context: string): Promise<boolean> => {
  try {
    const cameraAvailable = await checkDevicesAvailability();

    if (!cameraAvailable) throw new Error(`[${context}]: Cannot find camera device`);

    const permission = await checkCameraPermission();
    cameraPermission.value = permission as CameraPermission;

    if (permission === 'denied') throw new Error(`[${context}]: Check camera browser permissions`);

    permissionDialogVisible.value = permission !== 'granted';

    if (context === 'SoraCard' && permission === 'granted') {
      return true;
    }

    await navigator.mediaDevices.getUserMedia({ video: true });
    cameraPermission.value = 'granted';

    return true;
  } catch (error) {
    console.error(error);
    showAppNotification(t('code.allowanceError'), context === 'QRcode' ? 'error' : undefined);
    return false;
  } finally {
    permissionDialogVisible.value = false;
  }
};

const initKyc = async () => {
  const network = soraNetwork.value ?? (await waitForSoraNetworkFromEnv());
  const { kycService, soraProxy } = soraCard(network);

  kycSdkUrl.value = kycService.sdkURL;

  const resolvedReferenceNumber =
    referenceNumber.value ?? (await getReferenceNumber(soraProxy.referenceNumberEndpoint));

  if (resolvedReferenceNumber) {
    setReferenceNumber(resolvedReferenceNumber);
  }

  await ScriptLoader.unload(kycService.sdkURL, false).catch(() => undefined);

  try {
    await ScriptLoader.load(kycService.sdkURL);
  } catch (error) {
    console.error('[SoraCard]: Error while fetching script', error);
    stopJwtRefresh();
    return;
  }

  const paywings = (window as WindowInjectedWeb3 & { Paywings?: any }).Paywings;
  const webKycFactory = paywings?.WebKyc?.create;

  if (!webKycFactory) {
    console.error('[SoraCard]: Paywings SDK is unavailable');
    stopJwtRefresh();
    return;
  }

  await startJwtRefresh();

  webKycFactory({
    KycCredentials: {
      Username: kycService.username,
      Password: kycService.pass,
      Domain: 'soracard.com',
      env: kycService.env,
      UnifiedLoginApiKey: kycService.unifiedApiKey,
    },
    KycSettings: {
      AppReferenceID: uuidv4(),
      Language: isoLanguageName.value || 'en',
      ReferenceNumber: resolvedReferenceNumber,
      ElementId: '#kyc',
      Logo: '',
      WelcomeHidden: false,
      WelcomeTitle: '',
      DocumentCheckWindowHeight: '50vh',
      DocumentCheckWindowWidth: '100%',
      HideLoader: true,
    },
    KycUserData: {
      FirstName: '',
      MiddleName: '',
      LastName: '',
      Email: '',
      MobileNumber: '',
      Address1: '',
      Address2: '',
      Address3: '',
      ZipCode: '',
      City: '',
      State: '',
      CountryCode: '',
    },
    UserCredentials: {
      AccessToken: localStorage.getItem('PW-token'),
      RefreshToken: localStorage.getItem('PW-refresh-token'),
    },
  })
    .on('Error', (data: unknown) => {
      console.error('[SoraCard]: Error while initiating KYC', data);
      showAppNotification(t('card.infoMessageTryAgain'));
      emit('confirm', CardUIViews.Start);
      stopJwtRefresh();
      void ScriptLoader.unload(kycService.sdkURL);
    })
    .on('Success', async () => {
      const refreshToken = localStorage.getItem('PW-refresh-token');
      if (source.value === WALLET_CONSTS.AppWallet.FearlessWallet && refreshToken) {
        await (window as WindowInjectedWeb3).injectedWeb3?.['fearless-wallet']?.saveSoraCardToken?.(refreshToken);
      }
      emit('confirm', CardUIViews.KycResult);
      stopJwtRefresh();
      void ScriptLoader.unload(kycService.sdkURL);
    });

  if (isTestEnvironment) {
    loadingKycView.value = false;
    loadingTimeoutId.value = null;
  } else {
    loadingTimeoutId.value = setTimeout(() => {
      loadingKycView.value = false;
    }, 5_000);
  }
};

const requestCameraAccess = async () => {
  btnLoading.value = true;

  try {
    const allowed = await checkMediaDevicesAllowance('SoraCard');

    if (!allowed) return;

    await ensureRemoteStylesLoaded();
    await initKyc();
  } finally {
    btnLoading.value = false;
  }
};

onMounted(async () => {
  try {
    const { state } = await navigator.permissions.query({ name: 'camera' } as PermissionDescriptor);
    cameraPermission.value = state as CameraPermission;

    if (!hasCameraAccess.value) return;
  } catch (error) {
    console.error('[SoraCard]: Camera error.', error);
    return;
  }

  await ensureRemoteStylesLoaded();
  await initKyc();
});

onBeforeUnmount(() => {
  stopJwtRefresh();

  if (loadingTimeoutId.value) {
    clearTimeout(loadingTimeoutId.value);
    loadingTimeoutId.value = null;
  }

  if (kycSdkUrl.value) {
    void ScriptLoader.unload(kycSdkUrl.value, false);
  }
});

defineExpose({
  requestCameraAccess,
  hasCameraAccess,
  forbiddenByBrowser,
  btnCameraText,
  cameraPermission,
});
</script>

<style lang="scss">
.sora-card-kyc-wrapper {
  .container {
    padding: 0;
  }
}

.sora-card-kyc-view {
  height: 800px;
  width: 400px;

  .el-scrollbar {
    height: 800px;
  }

  .container {
    margin: 0;
  }

  .el-scrollbar__wrap {
    border-radius: var(--s-border-radius-medium) !important;
  }
}

#VideoKycFrame {
  iframe {
    background-color: #fff;
  }
}

button#CancelKyc {
  display: none !important;
}

section.content {
  min-height: 800px;
}

.camera-permission {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &-title {
    font-weight: 600;
    font-size: 28px;
    text-align: center;
    margin-bottom: $inner-spacing-mini;
  }

  &-desc {
    font-size: 15px;
    font-weight: 300;
    text-align: center;
    margin-bottom: $inner-spacing-mini;
  }

  &-icon {
    color: var(--s-color-status-error);
  }

  &-btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}
</style>
