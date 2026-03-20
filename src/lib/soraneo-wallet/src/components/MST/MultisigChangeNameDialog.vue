<template>
  <dialog-base v-model:visible="isVisible" :title="t('mst.settingsMst')" append-to-body>
    <div class="multisig-change-forget">
      <s-card v-bind="{ shadow: 'always', size: 'medium', borderRadius: 'small', ...$attrs }" class="switch-multisig">
        <div class="switcher">
          <s-switch v-model="isMSTLocal" @change="switchToFromMST"></s-switch>
          <p>{{ t('mst.switchMst') }}</p>
        </div>
        <p>{{ t('mst.mstSwitchWarning') }}</p>
      </s-card>
      <s-input v-model="multisigNewName" :placeholder="t('mst.accountNameMst')"></s-input>
      <s-button :disabled="isNoNameOrTheSame" type="primary" @click="updateName">{{ t('mst.mstSave') }}</s-button>
      <s-button type="secondary" @click="forgetMultisig">{{ t('mst.mstForgetBtn') }}</s-button>
    </div>
    <mst-forget-dialog v-model:visible="dialogMSTNameChange"></mst-forget-dialog>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { api } from '@/api';
import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import { RouteNames } from '@/consts';
import { getAppStore } from '@/utils/app-store';
import type { Route } from '@/store/router/types';

import DialogBase from '../DialogBase.vue';

import MstForgetDialog from './MstForgetDialog.vue';

defineOptions({ name: 'MultisigChangeNameDialog' });

const props = withDefaults(defineProps<{}>(), {});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useTranslation();
const store = computed(() => getAppStore() ?? ((globalThis as Record<string, unknown>).__PS_APP_STORE__ as any));
const visibleModel = defineModel<boolean>('visible', { default: false });
const { isVisible, closeDialog } = useDialogVisibility(visibleModel, {
  onClose: () => emit('close'),
});

const navigate = (route: Route) => {
  store.value.original.commit('router/navigate', route);
};
const syncWithStorage = store.value.commit.wallet.account.syncWithStorage;
const setIsMST = store.value.commit.wallet.account.setIsMST;
const afterLogin = store.value.dispatch.wallet.account.afterLogin;
const renameAccount = store.value.dispatch.wallet.account.renameAccount;

const account = computed(() => store.value.getters.wallet.account.account);
const isMST = computed(() => store.value.state.wallet.account.isMST);

const dialogMSTNameChange = ref(false);
const multisigNewName = ref('');
const currentName = ref<string | null>(null);
const isMSTLocal = ref(false);

const mst = computed(() => api.mst);

const resolveCurrentName = () => {
  const name = mst.value?.getMSTName?.() ?? '';
  currentName.value = name || null;
  return currentName.value;
};

const isMSTAccount = computed(() => {
  if (!isMST.value) return false;
  const name = mst.value?.getMSTName?.() ?? '';
  return name !== '';
});

onMounted(() => {
  resolveCurrentName();
  isMSTLocal.value = isMSTAccount.value;
});

watch(isMSTAccount, (value) => {
  isMSTLocal.value = value;
  if (value) {
    resolveCurrentName();
  }
});

const isNoNameOrTheSame = computed(() => currentName.value === multisigNewName.value || multisigNewName.value === '');

const switchToFromMST = () => {
  mst.value?.switchAccount?.(isMSTLocal.value);
  setIsMST(isMSTLocal.value);
  syncWithStorage();
  afterLogin();
};

const updateName = async () => {
  mst.value?.updateMultisigName?.(multisigNewName.value);
  const mstAddress = mst.value?.getMstAddress?.();
  if (mstAddress) {
    await renameAccount({ address: mstAddress, name: multisigNewName.value });
  }
  multisigNewName.value = '';
  resolveCurrentName();
  closeDialog();
  navigate({ name: RouteNames.Wallet });
};

const forgetMultisig = () => {
  closeDialog();
  dialogMSTNameChange.value = true;
};
</script>

<style lang="scss" scoped>
.multisig-change-forget {
  display: flex;
  flex-direction: column;
  align-items: center;
  .switch-multisig {
    width: 100%;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    .switcher {
      display: flex;
      flex-direction: row;
      gap: 12px;
      margin-bottom: 12px;
    }
  }
  .el-button {
    width: 100%;
    font-size: 24px;
  }
  .el-button:first-of-type {
    margin-top: 24px;
    margin-bottom: 12px;
  }
}
</style>
