<template>
  <s-input ref="input" v-model="query" :type="type" :placeholder="t('desktop.password.placeholder')" v-bind="$attrs">
    <template #suffix>
      <s-icon v-button :name="icon" class="eye-icon" size="18" @click="togglePasswordVisibility"></s-icon>
    </template>
  </s-input>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import InputFocusMixin from '../mixins/InputFocusMixin';
import TranslationMixin from '../mixins/TranslationMixin';

export default defineComponent({
  inheritAttrs: false,
  mixins: [InputFocusMixin, TranslationMixin],
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      hidden: true,
    };
  },
  computed: {
    query: {
      get(this: any): string {
        return this.modelValue;
      },
      set(this: any, value: string): void {
        this.$emit('update:modelValue', value);
      },
    },
    icon(this: any): string {
      return this.hidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
    },
    type(this: any): string {
      return this.hidden ? 'password' : 'text';
    },
  },
  methods: {
    togglePasswordVisibility(this: any): void {
      this.hidden = !this.hidden;
    },
    reset(this: any): void {
      this.hidden = true;
    },
  },
});
</script>
