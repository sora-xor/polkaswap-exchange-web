<template>
  <div class="disclaimer">
    <div class="disclaimer__header">
      <div class="disclaimer__header-title">{{ t('disclaimerTitle') }}</div>
      <s-icon
        v-button
        v-if="userDisclaimerApprove"
        class="disclaimer__header-close-btn"
        size="28px"
        name="basic-clear-X-xs-24"
        @click="handleClose"
      ></s-icon>
    </div>
    <s-scrollbar>
      <div class="disclaimer__text">
        <p v-html="disclaimerContent"></p>
        <p class="disclaimer__text-fiat" ref="endLine">{{ t('fiatDisclaimer') }}</p>
      </div>
    </s-scrollbar>
    <s-button
      v-if="!userDisclaimerApprove"
      :loading="loadingAcceptBtn"
      type="primary"
      @click="handleAccept"
      class="disclaimer__accept-btn"
      :disabled="!isActiveAcceptBtn"
    >
      {{ btnText }}
    </s-button>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Links } from '@/consts';
import { useSettingsStore } from '@/stores/settings';
import { delay } from '@/utils';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

defineOptions({ name: 'AppDisclaimer' });

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const loadingAcceptBtn = ref(false);
const isActiveAcceptBtn = ref(false);
const endLine = ref<HTMLElement | null>(null);
let observer: Nullable<IntersectionObserver> = null;

const userDisclaimerApprove = computed(() => settingsStore.userDisclaimerApprove);

const btnText = computed(() => (isActiveAcceptBtn.value ? t('acceptText') : t('acceptOnScrollText')));

function generateDisclaimerLink(href: string, content: string): string {
  const safeContent = escapeHtml(content);
  const safeHref = escapeHtml(href);
  return `<a href="${safeHref}" target="_blank" rel="nofollow noopener" class="link" title="${safeContent}">${safeContent}</a>`;
}

const disclaimerPrefix = computed(() => `<span class="disclaimer__prefix">${t('disclaimerTitle')}:</span>`);

const memorandumLink = computed(() => generateDisclaimerLink(Links.terms, t('memorandum')));
const privacyLink = computed(() => generateDisclaimerLink(Links.privacy, t('helpDialog.privacyPolicy')));
const polkaswapFaqLink = computed(() => generateDisclaimerLink(Links.faq, t('FAQ')));

const disclaimerContent = computed(() => {
  const raw = t('disclaimer', {
    disclaimerPrefix: disclaimerPrefix.value,
    polkaswapFaqLink: polkaswapFaqLink.value,
    memorandumLink: memorandumLink.value,
    privacyLink: privacyLink.value,
  });

  return sanitizeHtml(raw, {
    allowedTags: ['a', 'span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'rel', 'target', 'title', 'class'],
      span: ['class'],
    },
  });
});

async function makeAcceptBtnActive(ms = 1_000): Promise<void> {
  await delay(ms);
  isActiveAcceptBtn.value = true;
}

function setupScrollObserver(): void {
  try {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void makeAcceptBtnActive(300);
        }
      },
      { threshold: 0.95 }
    );
  } catch {
    void makeAcceptBtnActive(2_000);
    return;
  }

  if (endLine.value) {
    observer.observe(endLine.value);
  } else {
    void makeAcceptBtnActive(2_000);
  }
}

async function handleAccept(): Promise<void> {
  loadingAcceptBtn.value = true;
  await delay(1_200);
  settingsStore.setUserDisclaimerApprove();
  settingsStore.toggleDisclaimerDialogVisibility();
  loadingAcceptBtn.value = false;
}

function handleClose(): void {
  settingsStore.toggleDisclaimerDialogVisibility();
}

onMounted(() => {
  setupScrollObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>
