<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('desktop.dialog.confirmTitle')"
    class="confirm-dialog"
    append-to-body
  >
    <s-form class="confirm-dialog__form" @submit.prevent="handleConfirm">
      <wallet-account :polkadot-account="account"></wallet-account>
      <password-input
        v-if="!passphrase"
        ref="passwordInput"
        v-model="password"
        :disabled="loading"
        autofocus
      ></password-input>
      <account-signature-option v-if="withTimeout" with-hint></account-signature-option>
      <s-button
        type="primary"
        native-type="submit"
        class="confirm-dialog__button"
        :disabled="isConfirmDisabled"
        :loading="loading"
      >
        {{ confirmText }}
      </s-button>
    </s-form>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, toRef, watch } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import type { PolkadotJsAccount } from '@/types/common';

import DialogBase from '../DialogBase.vue';
import PasswordInput from '../Input/Password.vue';

import AccountSignatureOption from './Settings/SignatureOption.vue';
import WalletAccount from './WalletAccount.vue';

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    account?: Nullable<PolkadotJsAccount>;
    loading?: boolean;
    withTimeout?: boolean;
    passphrase?: string;
    confirmButtonText?: string;
  }>(),
  {
    visible: false,
    account: null,
    loading: false,
    withTimeout: false,
    passphrase: '',
    confirmButtonText: '',
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
  (event: 'confirm', password: string): void;
}>();

const { t } = useTranslation();

const { isVisible } = useDialogVisibility(toRef(props, 'visible'), {
  emit: (value) => emit('update:visible', value),
  onClose: () => emit('close'),
});

type PasswordInputInstance = InstanceType<typeof PasswordInput>;

const account = toRef(props, 'account');
const loading = toRef(props, 'loading');
const withTimeout = toRef(props, 'withTimeout');
const confirmButtonText = toRef(props, 'confirmButtonText');
const passphrase = toRef(props, 'passphrase');

const passwordModel = ref('');
const passwordInput = ref<PasswordInputInstance | null>(null);

const password = computed({
  get: () => passphrase.value || passwordModel.value,
  set: (value: string) => {
    passwordModel.value = value;
  },
});

const confirmText = computed(() => confirmButtonText.value || t('confirmText'));
const isConfirmDisabled = computed(() => loading.value || !password.value);

watch(isVisible, async (visible) => {
  if (!visible) {
    passwordModel.value = '';
    passwordInput.value?.reset?.();
    return;
  }

  await nextTick();
  passwordInput.value?.focus?.();
});

const handleConfirm = () => {
  emit('confirm', password.value);
};
</script>

<style lang="scss" scoped>
.confirm-dialog {
  &__form {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing-medium;
  }

  &__button {
    width: 100%;
  }

  .eye-icon {
    color: var(--s-color-base-content-tertiary);
    &:hover {
      cursor: pointer;
    }
  }
}
</style>
