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
  top: 72px;
  right: 16px;
  width: 370px;
  height: 116px;
  z-index: $app-above-loader-layer;
  background-color: #a09a9d;
  border-radius: 12px;
  padding: 14px;
  p {
    color: #ffffff;
    max-width: 320px;
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
    top: -8px;
    right: 8px;
    background: unset !important;
    border: none;
    cursor: pointer;
    &:hover {
      background: #a09a9d !important;
    }
  }
}
</style>
