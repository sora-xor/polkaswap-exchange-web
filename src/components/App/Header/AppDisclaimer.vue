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
    <s-scrollbar ref="scrollbarRef">
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
import { onBeforeUnmount, onMounted, ref, computed, nextTick } from 'vue';

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
const scrollbarRef = ref<unknown>(null);
let observer: Nullable<IntersectionObserver> = null;
let scrollContainer: Nullable<HTMLElement> = null;
let handleScroll: Nullable<() => void> = null;

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
  if (isActiveAcceptBtn.value) return;
  await delay(ms);
  isActiveAcceptBtn.value = true;
}

function resolveScrollContainer(): Nullable<HTMLElement> {
  const candidate = scrollbarRef.value as HTMLElement | { wrap?: unknown; $el?: unknown } | null;

  if (!candidate) return null;

  const wrapped = (candidate as { wrap?: unknown }).wrap;
  if (wrapped instanceof HTMLElement) {
    return wrapped;
  }

  const root = candidate instanceof HTMLElement ? candidate : (candidate as { $el?: unknown }).$el;
  if (!(root instanceof HTMLElement)) return null;

  return root.querySelector('.el-scrollbar__wrap') ?? root;
}

function isEndLineVisible(container: HTMLElement): boolean {
  const target = endLine.value;
  if (!target) return false;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  return targetRect.bottom <= containerRect.bottom + 1;
}

function activateOnScrollEnd(container: HTMLElement): void {
  if (isActiveAcceptBtn.value) return;
  if (!isEndLineVisible(container)) return;
  void makeAcceptBtnActive(300);
}

function setupScrollListener(): void {
  const container = scrollContainer;
  if (!container) return;

  handleScroll = () => activateOnScrollEnd(container);
  container.addEventListener('scroll', handleScroll, { passive: true });
  activateOnScrollEnd(container);
}

function cleanupScrollListener(): void {
  if (scrollContainer && handleScroll) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
  handleScroll = null;
  scrollContainer = null;
}

function setupScrollObserver(): void {
  scrollContainer = resolveScrollContainer();
  setupScrollListener();

  try {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void makeAcceptBtnActive(300);
        }
      },
      {
        root: scrollContainer,
        threshold: 0.95,
      }
    );
  } catch {
    void makeAcceptBtnActive(2_000);
    return;
  }

  if (endLine.value) {
    observer.observe(endLine.value);
  } else {
    if (!scrollContainer) {
      void makeAcceptBtnActive(2_000);
    }
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

onMounted(async () => {
  await nextTick();
  setupScrollObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  cleanupScrollListener();
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
  width: 24%;
  min-width: 335px;
  max-width: 550px;
  position: absolute;
  top: var(--s-size-mini);
  right: var(--s-size-mini);
  z-index: $app-above-loader-layer;
  padding: $basic-spacing 6px 12px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  :deep(.el-scrollbar) {
    flex: 1;
    min-height: 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: $inner-spacing-mini;

    &-title {
      font-weight: 600;
      font-size: var(--s-font-size-small);
      display: flex;
      align-items: center;
    }

    &-close-btn {
      margin-right: $inner-spacing-small;
      color: var(--s-color-base-content-tertiary);
      transition: var(--s-transition-default);

      &:hover {
        color: var(--s-color-base-content-secondary);
        cursor: pointer;
      }
    }
  }

  &__text {
    border-radius: var(--s-border-radius-medium);
    padding: 0 $basic-spacing 10px 0;
    font-size: var(--s-font-size-extra-mini);
    font-weight: 300;
    height: 260px;
    line-height: var(--s-line-height-extra-small);
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);
    margin-bottom: -12px;

    &-fiat {
      margin-top: $basic-spacing;
    }
  }

  &__accept-btn {
    margin-top: $basic-spacing;
    width: 100%;
    min-height: 42px;
    height: 42px;

    :deep(.s-button__text) {
      text-transform: uppercase;
      font-size: var(--s-font-size-small);
      font-weight: 500;
      line-height: 14px;
    }

    &.is-disabled,
    &:disabled {
      border: 2px solid var(--s-color-base-background-hover) !important;
      background: var(--s-color-utility-surface) !important;
      color: var(--s-color-base-content-tertiary) !important;
      box-shadow:
        1px 1px 5px 0px var(--s-shadow-color-light),
        -5px -5px 5px 0px inset rgba(255, 255, 255, 0.5),
        1px 1px 10px 0px inset var(--s-shadow-color-dark) !important;
    }
  }

  @include desktop(true) {
    width: auto;
    min-width: 0;
    max-width: calc(100% - (#{$inner-spacing-small} * 2));
    top: $inner-spacing-small;
    right: $inner-spacing-small;
    left: $inner-spacing-small;
    padding: $basic-spacing $inner-spacing-mini $inner-spacing-small;

    &__text {
      height: clamp(160px, 33vh, 240px);
    }
  }

  @include tablet(true) {
    position: relative;
    top: unset;
    left: unset;
    right: unset;
    width: 100%;
    min-width: 0;
    max-width: none;
    max-height: none;
    margin-bottom: $inner-spacing-medium;
    z-index: auto;

    &__text {
      height: clamp(140px, 34dvh, 220px);
    }
  }
}
</style>

<style lang="scss">
.disclaimer {
  .el-scrollbar__bar.is-vertical {
    opacity: 1;
  }
}
</style>
