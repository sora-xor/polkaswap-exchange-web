<template>
  <div class="order-book-widget customise-widget">
    <el-popover
      popper-class="customise-widget-popover"
      trigger="click"
      v-model="visibleSettings"
      :visible-arrow="false"
    >
      <settings-popover @open-color-setting="openSetColorDialog" />
      <div slot="reference" class="settings-btn">
        <span class="customise-widget-title">Customise page</span>
        <s-icon name="basic-settings-24" size="24px" />
      </div>
    </el-popover>
    <set-color-dialog :visible.sync="colorSettingsOpen" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    SettingsPopover: lazyComponent(Components.SettingsPopover),
    SetColorDialog: lazyComponent(Components.SetColor),
  },
})
export default class CustomiseWidget extends Mixins(TranslationMixin) {
  visibleSettings = false;
  colorSettingsOpen = false;

  openSetColorDialog(): void {
    this.visibleSettings = false;
    this.colorSettingsOpen = !this.colorSettingsOpen;
  }
}
</script>

<style lang="scss">
.customise-widget-popover.el-popover {
  border-radius: 18px;
  border-color: var(--s-color-base-border-secondary);
  padding: 0;
}

.customise-widget {
  margin-top: 8px;
  height: 64px;

  .settings-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &-title {
    line-height: 64px;
    margin-left: $basic-spacing;
    font-size: var(--s-font-size-medium);
    font-weight: 500;
  }

  &:hover {
    cursor: pointer;

    .s-icon-basic-settings-24 {
      color: var(--s-color-base-content-secondary);
    }
  }

  .s-icon-basic-settings-24 {
    margin-right: 20px;
    color: var(--s-color-base-content-tertiary);
  }
}
</style>
