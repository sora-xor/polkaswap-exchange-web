<template>
  <section class="route-requirements" :aria-labelledby="titleId">
    <p :id="titleId" class="route-requirements__count">{{ t(`getTs.onboarding.${walletCountKey}`) }}</p>
    <details>
      <summary>{{ t('getTs.onboarding.requirementsTitle') }}</summary>
      <p>{{ t(`getTs.onboarding.${source}Route`) }}</p>
      <p v-if="purpose === 'ts'">{{ t('getTs.onboarding.burnStep') }}</p>
      <p>{{ t('getTs.onboarding.externalApprovals') }}</p>
      <p v-if="source === 'card'">{{ t('getTs.onboarding.cardCheckout') }}</p>
      <p>{{ t('getTs.onboarding.setupIntroduction') }}</p>
    </details>
    <div v-if="source === 'ton'" class="route-requirements__alternatives">
      <p>{{ t('getTs.onboarding.tonAlternatives') }}</p>
      <button type="button" :disabled="disabled" @click="selectSource('card')">
        {{ t('getTs.onboarding.chooseCard') }}
      </button>
      <button type="button" :disabled="disabled" @click="selectSource('ethereum')">
        {{ t('getTs.onboarding.chooseEthereum') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import type { GetTsPurpose, GetTsSource } from '@/features/misc/lib/getTsFlow';

/** Passive route disclosure; alternative choices are intents, never navigation or financial actions. */
const props = withDefaults(defineProps<{ source: GetTsSource; purpose?: GetTsPurpose; disabled?: boolean }>(), {
  purpose: 'ts',
  disabled: false,
});
const emit = defineEmits<{ selectSource: [source: 'card' | 'ethereum'] }>();
const { t } = useTranslation();
const titleId = `get-ts-requirements-${useId()}`;
const walletCountKey = computed(() =>
  props.source === 'ton' ? 'threeWallets' : ['card', 'ethereum'].includes(props.source) ? 'twoWallets' : 'oneWallet'
);

/** The parent still applies its transaction/plan lock before changing the selected source. */
function selectSource(source: 'card' | 'ethereum'): void {
  if (!props.disabled && props.source === 'ton') emit('selectSource', source);
}
</script>

<style scoped lang="scss">
.route-requirements {
  margin-block: 20px;
  line-height: 1.5;
  font-size: 12px;
  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }
  p {
    margin: 8px 0;
    color: var(--s-color-base-content-secondary);
    overflow-wrap: anywhere;
  }
  p.route-requirements__count {
    font-weight: 600;
    color: var(--s-color-base-content);
  }
  summary {
    min-height: 44px;
    box-sizing: border-box;
    padding-block: 12px;
    color: var(--s-color-action-text);
    cursor: pointer;
  }
  &__alternatives {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 12px;
    p {
      width: 100%;
    }
  }
  button {
    min-height: 44px;
    max-width: 100%;
    padding: 12px 20px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-action-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }
  button:active {
    box-shadow: var(--s-shadow-element);
  }
  button:disabled {
    color: var(--s-color-base-content-secondary);
    cursor: not-allowed;
    opacity: 0.65;
  }
  :is(button, summary):focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 4px;
  }
}
</style>
