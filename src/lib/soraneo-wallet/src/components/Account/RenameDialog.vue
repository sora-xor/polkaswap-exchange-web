<template>
  <dialog-base v-model:visible="isVisible" :title="t('account.rename')" append-to-body class="account-rename-dialog">
    <s-form class="account-rename-dialog__form" @submit.prevent="handleConfirm">
      <wallet-account :polkadot-account="account"></wallet-account>
      <s-input
        v-model="value"
        type="text"
        :placeholder="t('desktop.accountName.placeholder')"
        :minlength="MINLENGTH"
        :disabled="loading"
      ></s-input>
      <s-button
        type="primary"
        native-type="submit"
        class="account-rename-dialog__button"
        :disabled="!valid"
        :loading="loading"
      >
        {{ t('confirmText') }}
      </s-button>
    </s-form>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, ref, toRef, watch } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import type { PolkadotJsAccount } from '@/types/common';

import DialogBase from '../DialogBase.vue';

import WalletAccount from './WalletAccount.vue';

const props = withDefaults(
  defineProps<{
    account?: Nullable<PolkadotJsAccount>;
    loading?: boolean;
  }>(),
  {
    account: null,
    loading: false,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', name: string): void;
}>();

const { t } = useTranslation();
const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const account = toRef(props, 'account');
const loading = toRef(props, 'loading');

const MINLENGTH = 3;
const value = ref('');

const prepared = computed(() => value.value.trim());
const valid = computed(() => prepared.value.length >= MINLENGTH);

watch(isVisible, (visible) => {
  if (!visible) {
    value.value = '';
  }
});

const handleConfirm = () => {
  emit('confirm', prepared.value);
};
</script>

<style lang="scss" scoped>
.account-rename-dialog {
  &__form {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing-medium;
  }

  &__button {
    width: 100%;
  }
}
</style>
