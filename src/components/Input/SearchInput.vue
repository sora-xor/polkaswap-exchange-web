<template>
  <s-input
    ref="input"
    v-model="query"
    :placeholder="placeholder"
    class="search-input"
    prefix="s-icon-search-16"
    size="big"
  >
    <template #suffix>
      <s-button v-show="query" type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
    </template>
  </s-input>
</template>

<script lang="ts">
import { Component, ModelSync, Prop, Ref, Vue } from 'vue-property-decorator';

@Component
export default class SearchInput extends Vue {
  @Ref('input') readonly input!: any;
  @Prop({ default: '', type: String }) readonly placeholder!: string;

  @ModelSync('value', 'input', { type: String })
  readonly query!: string;

  handleClearSearch(): void {
    this.$emit('clear');
  }

  focus(): void {
    this.input?.focus();
  }
}
</script>

<style lang="scss">
@include search-item('search-input');
</style>
