<template>
  <div class="responsive-tabs" :class="{ 'responsive-tabs__dropdown': isMobile }">
    <s-dropdown
      v-if="isMobile"
      popper-class="responsive-tabs__dropdown-menu"
      type="button"
      placement="bottom-start"
      trigger="click"
      :button-type="buttonType"
      :size="size"
      @select="handleTabChange"
    >
      <h3 v-if="isHeader" class="responsive-tabs__dropdown-selected">
        {{ selectedName }}
      </h3>
      <template v-else>
        {{ selectedName }}
      </template>
      <template #menu>
        <s-dropdown-item
          v-for="{ name, label, icon } in tabs"
          class="responsive-tabs__dropdown-item"
          :class="{ selected: name === selectedKey }"
          :key="name"
          :value="name"
          :icon="icon"
          :disabled="disabled"
        >
          {{ label }}
        </s-dropdown-item>
      </template>
    </s-dropdown>
    <s-tabs
      v-else
      :class="['responsive-tabs__tabs', size]"
      type="rounded"
      :value="selectedKey"
      @input="handleTabChange"
    >
      <s-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label" :disabled="disabled" />
    </s-tabs>
  </div>
</template>

<script lang="ts">
import { Size } from '@soramitsu-ui/ui-vue2/lib/types';
import { Component, Prop, Mixins, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { ResponsiveTab } from '@/types/tabs';

@Component
export default class ResponsiveTabs extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly isHeader!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isMobile!: boolean;
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;
  @Prop({ default: Size.MEDIUM }) readonly size!: string;
  @Prop({ default: () => [], type: Array }) readonly tabs!: Array<ResponsiveTab>;

  @ModelSync('value', 'input', { type: String })
  readonly selectedKey!: string;

  private get selected(): Nullable<ResponsiveTab> {
    return this.tabs.find((tab) => tab.name === this.selectedKey);
  }

  get buttonType() {
    return this.isHeader ? 'link' : 'tertiary';
  }

  get selectedName(): string {
    return this.selected?.label ?? '';
  }

  handleTabChange(name: string): void {
    this.$emit('input', name);
  }
}
</script>

<style lang="scss">
$icon-size: 22px;
// Dropdown menu styles
.el-dropdown-menu.el-popper.responsive-tabs {
  &__dropdown-menu {
    background-color: var(--s-color-utility-body);
    border-color: var(--s-color-base-border-secondary);
    .popper__arrow {
      display: none;
    }
    .responsive-tabs__dropdown-item {
      i {
        color: var(--s-color-base-content-tertiary);
        font-size: $icon-size;
      }
      &:not(.is-disabled):not(.selected) {
        &:hover,
        &:focus {
          &,
          & i {
            color: var(--s-color-base-content-secondary);
          }
        }
      }
      &.selected {
        &,
        & i {
          color: var(--s-color-theme-accent);
        }
      }
    }
  }
}
// Tabs styles
.responsive-tabs__tabs {
  .el-tabs__header {
    margin: 0;
  }

  &.s-tabs.s-rounded {
    .el-tabs__nav-wrap .el-tabs__item {
      &:not(.is-active).is-disabled {
        color: var(--s-color-base-content-primary);
      }
      &.is-disabled {
        cursor: not-allowed;
      }
    }

    &.small {
      .el-tabs__nav-wrap .el-tabs__item {
        padding: 0 $inner-spacing-mini;
        text-transform: initial;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.responsive-tabs {
  &__dropdown {
    &-selected {
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-mini);
    }
    &-item {
      min-width: 150px;
      line-height: 3;
      font-weight: 300;
      font-size: var(--s-font-size-small);
      color: var(--s-color-base-content-secondary);
      display: flex;
      align-items: center;
    }
  }
}
</style>
