<template>
  <w3m-connect-button
    ref="buttonRef"
    :size="size"
    :label="resolvedLabel"
    :loading-label="resolvedLoadingLabel"
    namespace="eip155"
    data-test-id="evm-connect-button"
  ></w3m-connect-button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useWeb3Connection } from '@/composables/useWeb3Connection';

const emit = defineEmits<{ (event: 'connect'): void }>();

/**
 * Wrapper for the AppKit connect button that keeps it in sync with the
 * `useWalletConnect` helpers while still emitting local lifecycle events.
 */

const props = withDefaults(
  defineProps<{
    label?: string;
    loadingLabel?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
  }>(),
  {
    label: 'Connect Wallet',
    loadingLabel: 'Connecting...',
    size: 'md',
    disabled: false,
  }
);

const buttonRef = ref<HTMLElement | null>(null);
const { connectEvmWallet, evmProviderLoading } = useWeb3Connection();

const isBusy = computed(() => props.disabled || Boolean(evmProviderLoading.value));
const resolvedLabel = computed(() => props.label);
const resolvedLoadingLabel = computed(() => props.loadingLabel || props.label);

const handleClick = (event: Event) => {
  event.stopImmediatePropagation();
  event.preventDefault();

  if (isBusy.value) return;

  emit('connect');
  void connectEvmWallet();
};

onMounted(() => {
  const element = buttonRef.value;
  element?.addEventListener('click', handleClick, { capture: true });
});

onBeforeUnmount(() => {
  const element = buttonRef.value;
  element?.removeEventListener('click', handleClick, { capture: true });
});

watch(
  isBusy,
  (busy) => {
    const element = buttonRef.value as any;
    if (!element) return;

    element.loading = busy;
    if (busy) {
      element.setAttribute('aria-busy', 'true');
      element.setAttribute('disabled', '');
    } else {
      element.removeAttribute('aria-busy');
      element.removeAttribute('disabled');
    }
  },
  { immediate: true }
);
</script>

<style scoped>
w3m-connect-button[disabled] {
  pointer-events: none;
}
</style>
