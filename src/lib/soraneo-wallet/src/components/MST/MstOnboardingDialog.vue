<template>
  <dialog-base v-model:visible="isVisible" :title="t('mst.about')" append-to-body>
    <div class="mst-info">
      <div class="about">
        <s-card v-for="(section, index) in displayedSectionsAbout" :key="index" class="section">
          <div>
            <img :src="section.image" :alt="section.alt" />
            <p>{{ section.text }}</p>
          </div>
        </s-card>
      </div>
      <s-card class="wallet-card">
        <div class="img-text">
          <img :src="sectionsAbout[2].image" :alt="sectionsAbout[2].alt" />
          <div>
            <p>{{ sectionsAbout[2].text }}</p>
            <!-- <a href="https://www.google.com" target="_blank" rel="noopener noreferrer" class="learn-more">
              Learn more
            </a> -->
          </div>
        </div>
      </s-card>

      <h1>{{ t('mst.how') }}</h1>
      <div class="how-to">
        <s-card v-for="(section, index) in sectionHowTo" :key="index" class="section">
          <div>
            <img :src="section.image" :alt="section.alt" />
            <p>{{ section.text }}</p>
            <!-- <a
              v-if="index === sectionHowTo.length - 1"
              href="https://www.google.com"
              target="_blank"
              rel="noopener noreferrer"
              class="learn-more"
            >
              Learn more
            </a> -->
          </div>
        </s-card>
      </div>
      <s-button type="primary" @click="connectFearlessOrCreateMST">
        {{ isMSTAvailable ? t('mst.createMst') : t('mst.connectFearless') }}
      </s-button>
    </div>
    <create-mst-wallet-dialog
      v-model:visible="showCreateMSTWalletDialog"
      @close-mst-create="handleCloseDialog"
    ></create-mst-wallet-dialog>
  </dialog-base>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import MSTFearless from '@/assets/img/MSTFearless.svg?url';
import MSTIcon from '@/assets/img/MSTIcon.svg?url';
import MSTKeys from '@/assets/img/MSTKeys.svg?url';
import MSTSign from '@/assets/img/MSTSign.svg?url';
import MSTWallet from '@/assets/img/MSTWallet.svg?url';
import { useDialogVisibility } from '@/composables/useDialog';
import { useTranslation } from '@/composables/useTranslation';
import { RouteNames } from '@/consts';
import { getAppStore } from '@/utils/app-store';
import type { Route } from '@/store/router/types';

import DialogBase from '../DialogBase.vue';

import CreateMstWalletDialog from './CreateMstWalletDialog.vue';

defineOptions({ name: 'MstOnboardingDialog' });

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

const isMSTAvailable = computed(() => store.value.state.wallet.settings.isMSTAvailable);
const navigate = (route: Route) => {
  store.value.original.commit('router/navigate', route);
};

const sectionsAbout = computed(() => [
  {
    image: MSTKeys,
    alt: 'mst keys',
    text: t('mst.mstKeys'),
  },
  {
    image: MSTSign,
    alt: 'mst sign',
    text: t('mst.mstSign'),
  },
  {
    image: MSTWallet,
    alt: 'mst wallet',
    text: t('mst.mstWallet'),
  },
]);

const displayedSectionsAbout = computed(() => sectionsAbout.value.slice(0, 2));

const sectionHowTo = computed(() => [
  {
    image: MSTFearless,
    alt: 'fearless wallet logo',
    text: t('mst.mstFearless'),
  },
  {
    image: MSTIcon,
    alt: 'mst icon',
    text: t('mst.mstIcon'),
  },
]);

const showCreateMSTWalletDialog = ref(false);

const handleCloseDialog = () => {
  closeDialog();
};

const connectFearlessOrCreateMST = () => {
  if (isMSTAvailable.value) {
    showCreateMSTWalletDialog.value = true;
    return;
  }

  closeDialog();
  navigate({ name: RouteNames.WalletConnection });
};
</script>

<style lang="scss" scoped>
.mst-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  .s-card {
    padding: 8px 0 !important;
  }

  h1 {
    margin-right: auto;
    font-size: 24px;
    margin-top: 24px;
    color: var(--s-color-base-content-primary);
  }
  .about,
  .how-to {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    div {
      display: flex;
      flex-direction: row;
    }
  }
  .about,
  .wallet-card {
    img {
      width: 72px;
      height: 72px;
    }
  }
  .about {
    gap: 12px;
    margin-bottom: 12px;
  }
  .how-to {
    gap: 12px;
    margin-top: 12px;
    margin-bottom: 24px;
    width: 100%;
    img {
      margin-right: 12px;
      width: 40px;
      height: 40px;
    }
    .section {
      width: 100%;
    }
    .s-card {
      padding: 17px 12px !important;
    }
  }
  .section {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: center;
    background-color: var(--s-color-base-border-primary);
    p {
      max-width: 178px;
      text-align: left;
      margin-left: 4px;
    }
  }
  .el-button {
    width: 100%;
    font-size: 24px;
  }
  .wallet-card {
    display: flex;
    align-items: center;

    img {
      margin-right: 12px;
    }
    .img-text {
      display: flex;
      flex-direction: row;
    }

    div {
      display: flex;
      flex-direction: column;
      align-items: flex-start;

      p {
        margin-top: 4px;
        color: var(--s-color-base-content-primary);
      }

      .learn-more {
        color: var(--s-color-theme-accent);
        text-decoration: underline;
      }
    }
  }
}
</style>
