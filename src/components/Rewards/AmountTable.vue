<template>
  <div class="amount-table">
    <div v-for="(item, index) in items" :key="index" class="amount-table-item">
      <span>{{ item.title }}</span>
      <div>
        <span>{{ item.amount }}</span>&nbsp;<span>{{ item.symbol }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class AmountTable extends Vue {
  @Prop({ default: [], type: Array }) items!: Array<object>
}
</script>

<style lang="scss" scoped>
.amount-table {
  &-item {
    color: var(--s-color-base-on-accent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-base;
    padding: $inner-spacing-mini / 2 0;
  }
}
</style>
