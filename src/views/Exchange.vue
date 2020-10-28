<template>
  <div class="exchange-container">
    <s-tabs v-model="model" type="rounded">
      <s-tab :label="t('exchange.swap')" name="swap">
        <swap />
      </s-tab>
      <s-tab :label="t('exchange.pool')" name="pool">
        <pool />
      </s-tab>
    </s-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import Swap from '@/components/Swap.vue'
import Pool from '@/components/Pool.vue'
import router from '@/router'

@Component({
  components: { Swap, Pool }
})
export default class Exchange extends Mixins(TranslationMixin) {
  model = 'swap';
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$tabs-class: ".el-tabs";
$tabs-container-height: $basic-spacing * 4;
$tabs-container-padding: 2px;
$tabs-item-height: $tabs-container-height - $tabs-container-padding * 2;

.exchange-container {
  .s-tabs {
    &#{$tabs-class} {
      #{$tabs-class}__header {
        width: 100%;
      }
    }
    #{$tabs-class} {
      &__header {
        #{$tabs-class}__nav-wrap #{$tabs-class}__item {
          padding-right: $inner-spacing-medium;
          padding-left: $inner-spacing-medium;
          &.is-active {
            box-shadow: 0px 1px 1px 0px rgba(var(--s-color-standard-black), 0.1);
            &:hover {
              box-shadow: none;
            }
          }
          &:focus,
          &.is-focus {
            box-shadow: none;
            background-color: $s-color-base-background-hover;
          }
          &,
          &.is-active,
          &.is-focus {
            border-radius: $border-radius-small;
          }
        }
        #{$tabs-class}__item {
          height: $tabs-item-height;
          line-height: $tabs-item-height;
          &:hover {
            background-color: $s-color-base-background-hover;
          }
        }
      }
      &__nav-wrap {
        height: $tabs-container-height;
        padding: $tabs-container-padding;
        background-color: $s-color-base-background;
        border-radius: $border-radius-small;
      }
    }
  }
  #{$tabs-class} {
    &__header {
      margin-bottom: $inner-spacing-mini;
    }
    &__nav {
      width: 100%;
    }
    &__item {
      width: 50%;
      text-align: center;
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

.exchange-container {
  margin: $inner-spacing-big auto;
  padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: $s-color-utility-surface;
  border-radius: $border-radius-medium;
  box-shadow: 0px 1px 4px 0px rgba(var(--s-color-standard-black-rgb), 0.35);
  color: $s-color-base-content-primary;
  .s-tabs {
    width: 100%;
  }
}
</style>
