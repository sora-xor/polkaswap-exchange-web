<template>
  <s-input
    ref="input"
    v-model="query"
    class="search-input"
    prefix="s-icon-search-16"
    v-bind="inputAttrs"
    :readonly="false"
  >
    <template #suffix>
      <s-button
        v-show="query"
        type="link"
        class="s-button--clear"
        icon="clear-X-16"
        @click="handleClearSearch"
      ></s-button>
    </template>
  </s-input>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import InputFocusMixin from '../mixins/InputFocusMixin';

export default defineComponent({
  inheritAttrs: false,
  mixins: [InputFocusMixin],
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'clear'],
  computed: {
    query: {
      get(this: any): string {
        return this.modelValue;
      },
      set(this: any, value: string): void {
        this.$emit('update:modelValue', value);
      },
    },
    inputAttrs(this: any): Record<string, unknown> {
      const { readonly, readOnly, ...attrs } = this.$attrs as Record<string, unknown>;
      void readonly;
      void readOnly;
      return attrs;
    },
  },
  methods: {
    handleClearSearch(this: any): void {
      this.$emit('clear');
    },
  },
});
</script>

<style lang="scss">
.search-input {
  position: relative;
  margin-top: 2px; // to deal with outline

  .s-button--clear {
    width: 18px;
    height: 18px;
    margin-right: -8px;
    padding: 0;
    background-color: transparent;
    border-radius: 0;
    border: none;
    &:focus {
      outline: none !important;
      i {
        @include focus-outline($inner: true, $borderRadius: 50%);
      }
    }
  }
}
</style>
