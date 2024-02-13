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

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { ColorDirection, Color, ColorType, DirectionType } from '@/consts/color';
import { mutation, state } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class SetColor extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @state.settings.colorType type!: ColorType;

  @mutation.settings.setColorType setColorType!: (type: ColorType) => void;

  colorDirection: DirectionType = 'classic';

  get optionType(): ColorType {
    return this.type;
  }

  set optionType(type: ColorType) {
    this.setColorType(type);
  }

  get colorOptions(): Color[] {
    return [
      { name: 'Classic', type: 'classic', side: { buy: '#34AD87', sell: '#F754A3' } },
      { name: 'Color deficiency', type: 'deficiency', side: { buy: '#448BF1', sell: '#D07F3E' } },
      { name: 'Traditional', type: 'traditional', side: { buy: '#75A390', sell: '#EB001B' } },
    ];
  }

  get colorDirections(): ColorDirection[] {
    return [
      { name: 'Green Up / Red down', type: 'classic' },
      { name: 'Green down / Red up', type: 'inverse' },
    ];
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
    margin-bottom: 16px;

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
