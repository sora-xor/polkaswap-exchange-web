<template>
  <dialog-base :visible.sync="isVisible" :title="'Chart color settings'">
    <div class="color-dialog__group">
      <span class="color-dialog__group-title">{{ 'Select color theme:' }}</span>
      <s-radio-group v-model="optionType" class="color-dialog__block s-flex">
        <s-radio
          v-for="option in colorOptions"
          :key="option.type"
          :label="option.type"
          :value="option.type"
          size="medium"
          class="color-dialog__item s-flex"
        >
          <div class="color-theme option s-flex">
            <div class="option__name">{{ option.name }}</div>
            <div class="color-theme__picture">
              <span class="sell-color" :style="`background-color: ${option.side.sell}`" />
              <span class="buy-color" :style="`background-color: ${option.side.buy}`" />
            </div>
          </div>
        </s-radio>
      </s-radio-group>
    </div>
    <div class="color-dialog__group">
      <span class="color-dialog__group-title">{{ 'Select color preferences:' }}</span>
      <s-radio-group v-model="colorDirection" class="color-dialog__block s-flex">
        <s-radio
          v-for="option in colorDirections"
          :key="option.type"
          :label="option.type"
          :value="option.type"
          size="medium"
          class="color-dialog__item s-flex"
        >
          <div class="color-preference option s-flex">
            <div class="option__name">{{ option.name }}</div>
            <div class="color-preference__direction" :class="`${option.type}`">
              <s-icon name="arrows-arrow-top-24" size="18" />
              <s-icon name="arrows-arrow-bottom-24" size="18" />
            </div>
          </div>
        </s-radio>
      </s-radio-group>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ThemePaletteMixin from '@/components/mixins/ThemePaletteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { ColorDirection, Color, ColorType, DirectionType } from '@/consts/color';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class SetColor extends Mixins(mixins.DialogMixin, TranslationMixin, ThemePaletteMixin) {
  get colorDirection(): DirectionType {
    return this.direction;
  }

  set colorDirection(direction: DirectionType) {
    this.direction = direction;
  }

  get optionType(): ColorType {
    return this.color;
  }

  set optionType(color: ColorType) {
    this.color = color;
  }

  get colorOptions(): Color[] {
    return Object.values(this.colors);
  }

  get colorDirections(): ColorDirection[] {
    return Object.values(this.directions);
  }
}
</script>

<style lang="scss">
.color-dialog {
  &__group {
    &-title {
      display: block;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-small);
      margin-bottom: 32px;
    }
  }

  &__block {
    flex-direction: column;
    margin-top: $inner-spacing-small;
  }

  &__item {
    align-items: flex-start;
    margin-bottom: $basic-spacing;

    .el-radio__label {
      width: 100%;
    }
  }
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);
  max-width: 380px;
  margin-bottom: 24px;

  &__name {
    color: var(--s-color-base-content-primary);
    font-size: 18px;
    font-weight: 600;
  }

  .classic {
    i:first-of-type {
      color: var(--s-color-status-success);
    }

    i:not(:first-of-type) {
      color: var(--s-color-status-error);
    }
  }

  .inverse {
    i:first-of-type {
      color: var(--s-color-status-error);
    }

    i:not(:first-of-type) {
      color: var(--s-color-status-success);
    }
  }
}

.color-preference {
  &__direction {
    position: relative;
  }

  .s-icon-arrows-arrow-bottom-24 {
    position: absolute;
    left: 13px;
    top: 6px;
  }
}

.color-theme {
  &__picture {
    position: relative;

    span {
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 6px;
      padding-right: 0;
    }

    .buy-color {
      outline: 1px solid #f4f0f1;
      position: absolute;
      top: 6px;
      left: 10px;
    }
  }
}
</style>
