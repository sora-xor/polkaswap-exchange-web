<template>
  <s-input ref="input" v-model="query" :type="type" :placeholder="t('desktop.password.placeholder')" v-bind="$attrs">
    <template #suffix>
      <s-icon v-button :name="icon" class="eye-icon" size="18" @click="togglePasswordVisibility"></s-icon>
    </template>
  </s-input>
</template>

<script lang="ts">
import { Model, Options, mixins } from 'vue-property-decorator';

import InputFocusMixin from '../mixins/InputFocusMixin';
import TranslationMixin from '../mixins/TranslationMixin';

@Options({ inheritAttrs: false })
export default class PasswordInput extends mixins(InputFocusMixin, TranslationMixin) {
  @Model('modelValue', { type: String })
  query!: string;

  hidden = true;

  get icon(): string {
    return this.hidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
  }

  get type(): string {
    return this.hidden ? 'password' : 'text';
  }

  togglePasswordVisibility(): void {
    this.hidden = !this.hidden;
  }

  reset(): void {
    this.hidden = true;
  }
}
</script>
