<template>
  <!-- TODO: Check if we could use this component to have appropriate layout behaviour -->
  <div class="info-line">
    <s-tooltip v-if="tooltipContent" class="info-line-icon" popper-class="info-tooltip info-tooltip--info-line" border-radius="mini" :content="tooltipContent" theme="light" placement="right-start" animation="none" :show-arrow="false">
      <s-icon name="info" size="16" />
    </s-tooltip>
    <span>{{ label }}</span>
    <span class="info-line-value">{{ value }}<span v-if="assetTitle" class="asset-title">{{ ' ' + assetTitle }}</span></span>
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class InfoLine extends Vue {
  @Prop({ default: '', type: String }) readonly tooltipContent!: string
  @Prop({ default: '', type: String }) readonly label!: string
  @Prop({ default: '', type: String }) readonly value!: string
  @Prop({ default: '', type: String }) readonly assetTitle!: string
}
</script>

<style lang="scss">
.info-tooltip--info-line {
  margin-left: #{$inner-spacing-mini / 2} !important;
}
.el-button--switch-price {
  @include switch-button-inherit-styles;
  &.s-action.s-small i {
    margin-top: 0;
    margin-left: 0;
  }
}
</style>

<style lang="scss" scoped>
.info-line {
  display: flex;
  align-items: center;
  margin-top: $inner-spacing-mini;
  width: 100%;
  padding-right: $inner-spacing-mini;
  padding-left: $inner-spacing-mini;
  color: var(--s-color-base-content-secondary);
  &-container {
    width: 100%;
  }
  > span:first-of-type {
    margin-right: $inner-spacing-small;
    word-break: keep-all;
  }
  &-value {
    margin-left: auto;
    text-align: right;
    font-feature-settings: $s-font-feature-settings-common;
    word-break: break-all;
  }
  .asset-title {
    word-break: keep-all;
    white-space: nowrap;
  }
  .el-tooltip {
    margin-right: $inner-spacing-mini;
    flex-shrink: 0;
  }
  &-icon {
    position: relative;
    height: var(--s-size-mini);
    width: var(--s-size-mini);
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    &:before {
      position: absolute;
      display: block;
      height: var(--s-icon-font-size-mini);
      width: var(--s-icon-font-size-mini);
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: auto;
      font-size: var(--s-icon-font-size-mini);
    }
  }
  .el-button--switch-price {
    margin-right: 0;
    margin-left: $inner-spacing-mini;
    @include switch-button;
  }
}
</style>
