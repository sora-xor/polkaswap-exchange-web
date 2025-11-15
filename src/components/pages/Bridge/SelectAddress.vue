<template>
  <div class="select-address">
    <address-book-input
      ref="input"
      v-model="address"
      :is-valid="validAddress"
      @update-name="updateName"
    ></address-book-input>

    <s-button
      class="s-typography-button--large select-address-button"
      type="primary"
      :disabled="!validAddress"
      @click="handleSelectAddress"
    >
      {{ t('saveText') }}
    </s-button>
  </div>
</template>

<script lang="ts" setup>
import { api, components } from '@wallet';
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  components: {
    AddressBookInput: components.AddressBookInput,
  },
});

const emit = defineEmits<{
  (e: 'select', payload: { address: string; name: string }): void;
}>();

const address = defineModel<string>('value', { default: '' });

const { t } = useTranslation();
const name = ref('');

const validAddress = computed(() => api.validateAddress(address.value));

function handleSelectAddress(): void {
  emit('select', { address: address.value, name: name.value });
}

function updateName(newName: string): void {
  name.value = newName;
}
</script>

<style lang="scss" scoped>
.select-address {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('select-address-button', 0);
}
</style>
