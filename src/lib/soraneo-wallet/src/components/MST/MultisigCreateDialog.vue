<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('mst.addrCreation')"
    append-to-body
    show-back
    @back="handleBack"
    @close="handleClose"
  >
    <div class="data-multisig">
      <div class="data">
        <p>{{ t('nameText') }}</p>
        <p>{{ mstData.multisigName }}</p>
      </div>
      <s-divider></s-divider>
      <div class="data">
        <p>{{ t('mst.threshold') }}</p>
        <p>{{ threshold }}/{{ mstData.addresses.length }}</p>
      </div>
      <s-divider></s-divider>
      <s-scrollbar class="data-multisig__scrollbar">
        <div class="data-multisig-scrollbar__info">
          <div v-for="(address, index) in mstData.addresses" :key="index + 1" class="address">
            <div class="data">
              <p>{{ t('addressText') }} {{ index + 1 }}</p>
              <formatted-address :value="address" :symbols="24"></formatted-address>
            </div>
            <s-divider v-if="index < mstData.addresses.length - 1"></s-divider>
          </div>
        </div>
      </s-scrollbar>

      <div class="multisig-cards">
        <s-card v-for="(message, index) in cardMessages" :key="index" class="data-card">
          <div class="data">
            <p>{{ message }}</p>
            <s-icon class="notification-icon" name="notifications-alert-triangle-24" size="22px"></s-icon>
          </div>
        </s-card>
      </div>
      <s-button type="primary" @click="handleCreateClose">{{ t('mst.continue') }}</s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { api } from '@/api';
import { useDialogVisibility } from '@/composables/useDialog';
import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import { RouteNames } from '@/consts';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';
import type { MSTData } from '@/types/mst';

import DialogBase from '../DialogBase.vue';

defineOptions({ name: 'MultisigCreateDialog' });

const props = withDefaults(
  defineProps<{
    mstData?: MSTData;
    threshold?: number;
  }>(),
  {
    mstData: () =>
      ({
        addresses: [],
        multisigName: '',
        threshold: 0,
        duration: 0,
      }) as MSTData,
    threshold: 0,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'back'): void;
}>();

const { t } = useTranslation();
const routerStore = useRouterStore();
const walletStore = useWalletStore();
const { showAppNotification } = useNotification();

const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const cardMessages = computed(() => [t('mst.cardMessageFirst'), t('mst.cardMessageSecond')]);

const handleClose = () => {
  closeDialog();
  emit('close');
};

const handleBack = () => {
  closeDialog();
  emit('back');
};

const handleCreateClose = async () => {
  const data = props.mstData ?? {
    addresses: [],
    multisigName: '',
    threshold: 0,
    duration: 0,
  };

  api.mst.createMST(data.addresses, data.threshold || 0, data.multisigName, data.duration);
  walletStore.setIsMstAddressExist(true);
  walletStore.setIsMstAccount(true);
  api.mst.switchAccount(true);
  walletStore.syncAccountWithStorage();
  await walletStore.afterLogin();
  await walletStore.trackPendingMstTxs();
  closeDialog();
  routerStore.navigate({ name: RouteNames.Wallet });
  showAppNotification(t('mst.successMstSetUp'), 'success');
};
</script>

<style lang="scss">
.data-multisig__scrollbar {
  height: 105px;
  @include scrollbar($basic-spacing-big);
  .el-scrollbar__wrap {
    overflow-x: unset;
  }
}
</style>

<style lang="scss" scoped>
.data-multisig {
  display: flex;
  flex-direction: column;
  .el-divider--horizontal {
    margin-top: $basic-spacing-extra-mini;
    margin-bottom: $basic-spacing-small;
  }
  .data {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
  &__info,
  .address,
  .multisig-cards {
    display: flex;
    flex-direction: column;
  }
  .multisig-cards {
    margin-top: $inner-spacing-mini;
    gap: calc($basic-spacing-mini * 2.5);
    margin-bottom: $basic-spacing-big;
  }
  .data-card {
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    p {
      max-width: calc($asset-item-height * 4.5);
    }
  }
  .notification-icon {
    padding: $basic-spacing;
    border-radius: 50%;
    background-color: var(--s-color-status-info);
    box-shadow: var(--s-shadow-element-pressed);
    color: #ffffff;
  }
}
</style>
