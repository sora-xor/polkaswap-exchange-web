<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('accountSettings.title')"
    class="account-settings-dialog"
    append-to-body
  >
    <div class="account-settings">
      <s-card shadow="always" size="medium" border-radius="mini" pressed>
        <div class="account-settings-option">
          <account-confirmation-option>
            <span class="account-settings-option-description">
              {{ t('accountSettings.confirmation.description') }}
            </span>
          </account-confirmation-option>
        </div>
      </s-card>

      <s-card shadow="always" size="medium" border-radius="mini" pressed>
        <div class="account-settings-option">
          <div v-if="isExternal" class="google-badge">
            <img :src="GoogleLogo" alt="google logo" />
            <span>{{ t('accountSettings.googleOnly') }}</span>
          </div>

          <account-signature-option :disabled="isExternal">
            <span class="account-settings-option-description">
              {{ t('accountSettings.signature.description') }}
            </span>
          </account-signature-option>

          <s-button
            v-if="!isExternal && !passphrase && isSignTxDialogDisabled"
            type="primary"
            class="account-settings-button"
            @click="openConfirmDialog"
          >
            {{ t('accountSettings.enterPassword') }}
          </s-button>
        </div>
      </s-card>
    </div>

    <account-confirm-dialog
      v-model:visible="accountConfirmVisibility"
      :loading="loading"
      :passphrase="passphrase"
      @confirm="saveAccountPassphrase"
    ></account-confirm-dialog>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useLoading } from '@/composables/useLoading';
import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import GoogleLogoAsset from '../../assets/img/GoogleLogo.svg?url';
import { delay } from '../../util';
import { lockAccountPair, unlockAccountPair } from '../../util/account';
import DialogBase from '../DialogBase.vue';

import AccountConfirmDialog from './ConfirmDialog.vue';
import AccountConfirmationOption from './Settings/ConfirmationOption.vue';
import AccountSignatureOption from './Settings/SignatureOption.vue';

const props = withDefaults(defineProps<{}>(), {});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});
const walletStore = useWalletStore();

const isWalletLoaded = computed(() => walletStore.isWalletLoaded);
const { loading, withLoading } = useLoading({ isWalletLoaded });
const { withAppNotification } = useNotification();

const connected = computed(() => walletStore.address);
const isExternal = computed(() => walletStore.isExternal);
const isSignTxDialogDisabled = computed(() => walletStore.isSignTxDialogDisabled);
const GoogleLogo = GoogleLogoAsset;

const accountConfirmVisibility = ref(false);

const passphrase = computed(() => {
  const value = walletStore.getPassword(connected.value);
  return value ?? undefined;
});

const openConfirmDialog = () => {
  accountConfirmVisibility.value = true;
};

const saveAccountPassphrase = async (password: string) => {
  await withLoading(async () => {
    await nextTick();
    await delay(250);
    await withAppNotification(async () => {
      unlockAccountPair(api, password);
      walletStore.setAccountPassphrase({ address: connected.value, password });
      accountConfirmVisibility.value = false;
    });
    lockAccountPair(api);
  });
};

defineExpose({
  openConfirmDialog,
});
</script>

<style lang="scss" scoped>
.account-settings {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-big;

  &-button {
    width: 100%;
    margin-top: $basic-spacing;
  }
}

.account-settings-option {
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  gap: $basic-spacing;

  &-description {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
  }
}

$logo-size: 12px;

.google-badge {
  display: flex;
  align-items: center;
  gap: $basic-spacing-tiny;
  padding: $basic-spacing-tiny $basic-spacing;
  background: var(--s-color-base-on-accent);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-element);

  & > img {
    width: $logo-size;
    height: $logo-size;
  }

  & > span {
    font-size: var(--s-font-size-mini);
    font-weight: 600;
    text-transform: uppercase;
  }
}

.google-badge + .settings-option {
  margin-top: $basic-spacing;
}
</style>
