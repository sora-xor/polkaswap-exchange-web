<template>
  <s-input ref="input" v-model="query" class="search-input" prefix="s-icon-search-16" size="big" v-bind="$attrs">
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
import { Model, Options, mixins } from 'vue-property-decorator';

import InputFocusMixin from '../mixins/InputFocusMixin';

@Options({ inheritAttrs: false })
export default class SearchInput extends mixins(InputFocusMixin) {
  @Model('modelValue', { type: String })
  query!: string;

  handleClearSearch(): void {
    this.$emit('clear');
  }
}
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
