<template>
  <s-modal
    v-model:show="disclaimerVisibility"
    :teleport-to="useViewportModal ? 'body' : null"
    :absolute="!useViewportModal"
    :lock-scroll="false"
    :focus-trap="isSwapPage"
    :show-overlay="isSwapPage"
    :root-class="modalRootClass"
    :labelled-by="titleId"
    modal-class="disclaimer-modal__dialog"
    :close-on-overlay-click="isSwapPage && userDisclaimerApprove"
    :close-on-esc="userDisclaimerApprove"
  >
    <div class="disclaimer">
      <div class="disclaimer__header">
        <h2 :id="titleId" class="disclaimer__header-title">{{ t('disclaimerTitle') }}</h2>
        <s-button
          v-if="userDisclaimerApprove"
          class="disclaimer__header-close-btn"
          type="action"
          icon="basic-clear-X-xs-24"
          :aria-label="t('closeText')"
          @click="handleClose"
        ></s-button>
      </div>
      <div class="disclaimer__text" tabindex="0" role="region" :aria-label="t('disclaimerSummary.fullTerms')">
        <div class="disclaimer__summary">
          <h3>{{ t('disclaimerSummary.title') }}</h3>
          <ul>
            <li>{{ t('disclaimerSummary.responsibility') }}</li>
            <li>{{ t('disclaimerSummary.alpha') }}</li>
            <li>{{ t('disclaimerSummary.risk') }}</li>
          </ul>
        </div>
        <h3>{{ t('disclaimerSummary.fullTerms') }}</h3>
        <div v-html="disclaimerContent"></div>
        <p class="disclaimer__text-fiat">{{ t('fiatDisclaimer') }}</p>
      </div>
      <div v-if="!userDisclaimerApprove" class="disclaimer__footer">
        <label class="disclaimer__acknowledgement">
          <input v-model="acknowledged" type="checkbox" />
          <span>{{ t('disclaimerSummary.acknowledgement') }}</span>
        </label>
        <s-button type="primary" @click="handleAccept" class="disclaimer__accept-btn" :disabled="!acknowledged">
          {{ t('acceptText') }}
        </s-button>
      </div>
    </div>
  </s-modal>
</template>

<script lang="ts" setup>
import { ref, computed, useId, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { Links, PageNames } from '@/consts';
import { SModal } from '@/lib/soramitsu-ui/components/Modal';
import { useSettingsStore } from '@/stores/settings';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';
import { resolveDisclaimerVisibilityOnRouteChange } from '@/views/utils/resolveDisclaimerVisibilityOnRouteChange';

defineOptions({ name: 'AppDisclaimer' });

const { t } = useTranslation();
const route = useRoute();
const settingsStore = useSettingsStore();

const acknowledged = ref(false);
const titleId = `disclaimer-title-${useId()}`;

const userDisclaimerApprove = computed(() => settingsStore.userDisclaimerApprove);
const isSwapPage = computed(() => route.name === PageNames.Swap);
const useViewportModal = computed(() => isSwapPage.value && !userDisclaimerApprove.value);
const modalRootClass = computed(() => ['disclaimer-modal', { 'disclaimer-modal--nonblocking': !isSwapPage.value }]);
const effectiveDisclaimerVisibility = computed(() =>
  resolveDisclaimerVisibilityOnRouteChange(
    Boolean(settingsStore.disclaimerVisibility),
    Boolean(userDisclaimerApprove.value),
    route.name
  )
);
const disclaimerVisibility = computed({
  get: () => effectiveDisclaimerVisibility.value,
  set: (visible: boolean) => {
    if (visible === settingsStore.disclaimerVisibility) return;
    settingsStore.setDisclaimerDialogVisibility(visible);
  },
});

/** Builds a safe external document link for the existing full legal notice. */
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

/** Persists acceptance only after the user explicitly acknowledges the terms. */
function handleAccept(): void {
  if (!acknowledged.value) return;
  settingsStore.setUserDisclaimerApprove();
  settingsStore.setDisclaimerDialogVisibility(false);
}

/** Closes the notice after a previous acceptance has been recorded. */
function handleClose(): void {
  settingsStore.setDisclaimerDialogVisibility(false);
}

watch(disclaimerVisibility, (visible) => {
  if (!visible) acknowledged.value = false;
});
</script>

<style lang="scss">
.disclaimer {
  &__prefix {
    color: var(--s-color-theme-accent);
  }

  .link {
    @include focus-outline;
  }
}
</style>

<style lang="scss" scoped>
.disclaimer {
  background-color: var(--s-color-utility-surface);
  border-radius: var(--s-border-radius-medium);
  box-shadow: var(--s-shadow-dialog);
  width: 100%;
  min-width: 0;
  max-width: 640px;
  max-height: calc(100dvh - 32px);
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  color: var(--s-color-base-content-primary);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: 16px;
    margin-bottom: 16px;

    &-title {
      margin: 0;
      font-weight: 600;
      font-size: 20px;
      line-height: 1.4;
    }

    &-close-btn {
      flex-shrink: 0;
      color: var(--s-color-base-content-secondary);
    }
  }

  &__text {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 12px;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--s-color-base-content-primary);

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    &-fiat {
      margin-top: 16px;
    }
  }

  &__summary {
    margin-bottom: 24px;

    ul {
      margin: 0;
      padding-left: 24px;
    }

    li + li {
      margin-top: 8px;
    }
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex-shrink: 0;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid var(--s-color-base-border-secondary);
  }

  &__acknowledgement {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    line-height: 1.5;
    cursor: pointer;

    input {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      margin: 1px 0 0;
      accent-color: var(--s-color-theme-accent);
    }
  }

  &__accept-btn {
    width: 100%;
    min-height: 44px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    padding: 20px 16px;
  }
}

:global(.disclaimer-modal) {
  justify-content: center;
  align-items: center;
  padding: 16px;
}

:global(.s-modal__root.disclaimer-modal--nonblocking) {
  justify-content: flex-end !important;
  align-items: flex-start !important;
  padding-top: 16px !important;
  padding-right: 0 !important;
  pointer-events: none;
}

:global(.s-modal__root.disclaimer-modal--nonblocking .s-modal__modal) {
  pointer-events: none;
  width: auto;
}

:global(.s-modal__root.disclaimer-modal--nonblocking .disclaimer) {
  pointer-events: auto;
  width: 400px;
  max-width: calc(100vw - 32px);
  margin-right: 16px;
}

:global(.disclaimer-modal__dialog) {
  width: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
}
</style>
