<template>
  <div class="header">
    <s-button v-if="hasButtonBack" type="action" size="small" icon="arrow-left" @click="handleBack" />
    <h3 class="header-title">{{ title }}</h3>
    <s-tooltip
      class="header-tooltip"
      popperClass="info-tooltip info-tooltip--header"
      :content="tooltip"
      borderRadius="mini"
      theme="light"
      placement="bottom-end"
      animation="none"
      :show-arrow="false"
    >
      <s-icon name="info" size="16" />
    </s-tooltip>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import { PageNames } from '@/consts'

@Component
export default class GenericHeader extends Mixins(TranslationMixin) {
  @Prop({ default: true, type: Boolean }) readonly hasButtonBack!: boolean
  @Prop({ default: '', type: String }) readonly title!: string
  @Prop({ default: '', type: String }) readonly tooltip!: string

  handleBack (): void {
    router.push({ name: PageNames.Pool })
  }
}
</script>

<style lang="scss">
.info-tooltip--header {
  margin-top: #{$inner-spacing-mini / 2} !important;
}
</style>

<style lang="scss" scoped>
$tooltip-area-height: var(--s-size-small);
$title-padding: calc(#{var(--s-size-small)} + #{$inner-spacing-small});

.header {
  position: relative;
  width: 100%;
  margin-bottom: $inner-spacing-medium;

  .el-button {
    position: absolute;
  }
  &-title {
    width: 100%;
    padding-right: $title-padding;
    padding-left: $title-padding;
    text-align: center;
    line-height: $tooltip-area-height;
    font-feature-settings: $s-font-feature-settings-title;
    letter-spacing: $s-letter-spacing-small;
  }
  &-tooltip {
    position: absolute;
    top: 0;
    right: 0;
    height: $tooltip-area-height;
    width: $tooltip-area-height;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    text-align: center;
    cursor: pointer;
    &:before {
      font-size: var(--s-icon-font-size-mini);
      line-height: $tooltip-area-height;
    }
  }
}
</style>
