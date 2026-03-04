<template>
  <div v-if="visible" class="notification-mst">
    <s-button class="close-button" @click="closeNotification"> <s-icon name="x-16" size="14"></s-icon> </s-button>

    <p>{{ t('mst.warningSwitch') }}</p>
    <s-button type="secondary" @click="handleButtonClick">{{ t('mst.seeActivity') }}</s-button>
  </div>
</template>

<script lang="ts" setup>
import { api } from '@wallet';
import { computed, nextTick, toRefs } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts';
import store from '@/store';
import { useWalletStore } from '@/stores/wallet';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});
const { visible } = toRefs(props);

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const { t } = useTranslation();
const router = useRouter();
const route = useRoute();

const walletStore = useWalletStore();
const isMST = computed(() => store.state.wallet.account.isMST);

function closeNotification(): void {
  emit('update:visible', false);
}

async function handleButtonClick(): Promise<void> {
  if (!isMST.value) {
    api.mst.switchAccount(true);
    store.commit.wallet.account.setIsMST(true);
    store.commit.wallet.account.syncWithStorage();
    await walletStore.afterLogin();
  }

  if (route.name !== PageNames.Wallet) {
    await router.push({ name: PageNames.Wallet });
  }

  await nextTick();
  closeNotification();
}
</script>

<style lang="scss" scoped>
.notification-mst {
  position: fixed;
  top: calc(72px + env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  width: min(370px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  min-height: 116px;
  box-sizing: border-box;
  z-index: $app-above-loader-layer;
  background-color: #a09a9d;
  border-radius: 12px;
  padding: 14px;
  p {
    color: #ffffff;
    max-width: 100%;
    overflow-wrap: anywhere;
    font-size: 13px;
  }
  button {
    margin-top: 12px;
    font-size: 12px;
    box-shadow: unset !important;
    padding: 8px !important;
    &:hover {
      background: var(--s-color-base-content-tertiary) !important;
    }
  }
  .close-button {
    position: absolute;
    top: 4px;
    right: 4px;
    background: unset !important;
    border: none;
    cursor: pointer;
    &:hover {
      background: #a09a9d !important;
    }
  }

  @include mobile(true) {
    top: calc(56px + env(safe-area-inset-top, 0px));
    right: max(8px, env(safe-area-inset-right, 0px));
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
    padding: 12px;
  }
}
</style>
