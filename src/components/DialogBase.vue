<template>
  <!-- TODO 4 alexnatalia: Fix window close -->
  <s-dialog
    :visible.sync="visible"
    :title="title"
    class="dialog-wrapper"
    :customClass="customClass"
    borderRadius="medium"
    top="80px"
    width="496px"
  >
    <slot />
    <slot slot="footer" name="footer" />
  </s-dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class DialogBase extends Vue {
  @Prop({ default: false, type: Boolean, required: true }) readonly visible!: boolean
  @Prop({ default: '', type: String }) readonly customClass!: string
  @Prop({ default: '', type: String }) readonly title!: string
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: var(--s-size-medium);

.dialog-wrapper {
  #{$el-dialog-class} #{$el-dialog-class} {
    &__header,
    &__footer {
      padding: $inner-spacing-big;
    }
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big;
    }
  }
  #{$el-dialog-class}__header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    #{$el-dialog-class}__title {
      font-size: $s-font-size-big;
      font-weight: normal;
    }
  }
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    #{$el-dialog-class}__close {
      color: var(--s-color-base-content-primary);
      font-weight: bold;
      font-size: calc(#{$el-dialog-button-size} / 2);
    }
    color: var(--s-color-base-content-primary);
    &:hover, &:active, &:focus {
      background-color: var(--s-color-base-background-hover);
      border-color: var(--s-color-base-background-hover);
      #{$el-dialog-class}__close {
        color: var(--s-color-base-content-primary);
      }
    }
  }
  #{$el-dialog-class}__footer {
    .el-button {
      padding: $inner-spacing-mini;
      width: 100%;
    }
  }
}
</style>
