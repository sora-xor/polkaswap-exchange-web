<template>
  <dialog-base v-model:visible="isVisible" :title="t('mst.mstForgetBtn')" append-to-body>
    <div class="forget-multisig">
      <s-card class="warning-delete-card">
        <div class="notification">
          <p>{{ t('mst.forgetMst') }}</p>
          <s-icon class="notification-icon" name="notifications-alert-triangle-24" size="22px"></s-icon>
        </div>
      </s-card>
      <p>{{ t('mst.sureForgetMst') }}</p>
      <s-button type="primary" @click="forgetMST">{{ t('mst.forget') }}</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import DialogBase from '../DialogBase.vue';

const props = withDefaults(defineProps<{}>(), {});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();

const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});
const walletStore = useWalletStore();

const forgetMST = async () => {
  if (!walletStore.isMstAccount) {
    api.mst.switchAccount(true);
  }

  api.mst.forgetMSTAccount();
  walletStore.setIsMstAddressExist(false);
  walletStore.setIsMstAccount(false);
  walletStore.syncAccountWithStorage();
  await walletStore.afterLogin();
  closeDialog();
};
</script>

<style lang="scss" scoped>
.forget-multisig {
  display: flex;
  flex-direction: column;
  .warning-delete-card {
    background-color: var(--s-color-utility-body);
    margin-bottom: 12px;
    .notification {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      p {
        max-width: 316px;
      }
      &-icon {
        padding: $basic-spacing;
        border-radius: 50%;
        background-color: var(--s-color-status-info);
        box-shadow: var(--s-shadow-element-pressed);
        color: #ffffff;
      }
    }
  }

  .el-button {
    margin-top: 24px;
  }
}
</style>
