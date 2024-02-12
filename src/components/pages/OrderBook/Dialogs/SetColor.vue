<template>
  <dialog-base :visible.sync="isVisible" :title="'Chart color settings'">
    <div class="color-dialog__group">
      <span class="color-dialog__group-title">{{ 'Select color theme:' }}</span>
      <s-radio-group v-model="optionType" class="color-dialog__block s-flex">
        <s-radio
          v-for="option in colorOptions"
          :key="option.name"
          :label="option.name"
          :value="option.type"
          size="medium"
          class="color-dialog__item s-flex"
        >
          <div class="color-theme option s-flex">
            <div class="option__name">{{ option.name }}</div>
            <div class="color-theme__picture">
              <span class="sell-color" />
              <span class="buy-color" />
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
          :key="option.name"
          :label="option.name"
          :value="option.type"
          size="medium"
          class="statistics-dialog__item s-flex"
        >
          <div class="color-preference option s-flex">
            <div class="option__name">{{ option.name }}</div>
            <div class="color-preference__direction" :class="getComputedPreferenceClasses(option.type)">
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

type ColorType = 'classic' | 'deficiency' | 'traditional';
type DirectionType = 'classic' | 'inverse';
type Hex = `#${string}`;

interface Color {
  name: string;
  type: ColorType;
  color: Hex;
}

interface ColorDirection {
  name: string;
  type: DirectionType;
}

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class SetColor extends Mixins(mixins.DialogMixin, TranslationMixin) {
  optionType = '';
  colorDirection = '';

  get colorOptions(): Color[] {
    return [
      { name: 'Classic', type: 'classic', hex: '#345134' },
      { name: 'Color deficiency', type: 'deficiency' },
      { name: 'Traditional', type: 'traditional' },
    ];
  }

  get colorDirections(): ColorDirection[] {
    return [
      { name: 'Green Up / Red down', type: 'classic' },
      { name: 'Green down / Red up', type: 'inverse' },
    ];
  }

  getComputedPreferenceClasses(type: DirectionType): any {}
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

    .sell-color {
      background-color: red;
    }

    .buy-color {
      background-color: green;
      outline: 1px solid #f4f0f1;
      position: absolute;
      top: 6px;
      left: 10px;
    }
  }

  .color-prefernce {
  }
}
</style>
