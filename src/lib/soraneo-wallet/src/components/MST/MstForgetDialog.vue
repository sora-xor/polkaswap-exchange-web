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
import { toRef } from 'vue';

import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';

import { api } from '../../api';
import store from '../../store';
import DialogBase from '../DialogBase.vue';

const props = withDefaults(
  defineProps<{
    visible?: boolean;
  }>(),
  {
    visible: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
}>();

const { t } = useTranslation();

const { isVisible, closeDialog } = useDialogVisibility(toRef(props, 'visible'), {
  emit: (value) => emit('update:visible', value),
  onClose: () => emit('close'),
});

const isMST = () => store.state.wallet.account.isMST;
const setIsMstAddressExist = store.commit.wallet.account.setIsMstAddressExist;
const setIsMST = store.commit.wallet.account.setIsMST;
const syncWithStorage = store.commit.wallet.account.syncWithStorage;
const afterLogin = store.dispatch.wallet.account.afterLogin;

const forgetMST = () => {
  if (!isMST()) {
    api.mst.switchAccount(true);
  }

  api.mst.forgetMSTAccount();
  setIsMstAddressExist(false);
  setIsMST(false);
  syncWithStorage();
  afterLogin();
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
