<template>
  <dialog-base class="validators-filter-dialog" :visible.sync="isVisible">
    <div class="filter-container">
      <h1 class="title">
        {{ t('soraStaking.validatorsFilterDialog.title') }}
      </h1>
      <div class="filter">
        <div v-for="(item, key) in filterData" :key="item.name" class="filter-item">
          <div class="filter-item-header">
            <div class="filter-item-label">{{ item.name }}</div>
            <s-switch
              class="filter-item-switch"
              :class="{ 'is-active': localFilter[key] }"
              v-model="localFilter[key]"
            />
          </div>
          <div class="filter-item-description">{{ item.description }}</div>
        </div>
      </div>
      <s-button class="save-button" type="primary" @click="save">
        {{ t('soraStaking.validatorsFilterDialog.save') }}
      </s-button>
      <div class="reset-all" @click="resetAll">
        {{ t('soraStaking.validatorsFilterDialog.reset') }}
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import { DemeterStakingComponents } from '../../demeter/consts';
import { soraStakingLazyComponent } from '../../router';
import { emptyValidatorsFilter, ValidatorsFilterType } from '../consts';
import StakingMixin from '../mixins/StakingMixin';
import { ValidatorsFilter } from '../types';

@Component({
  components: {
    DialogTitle: soraStakingLazyComponent(DemeterStakingComponents.DialogTitle),
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class ValidatorsFilterDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ type: Object, required: true }) filter!: ValidatorsFilter;

  localFilter: ValidatorsFilter = { ...emptyValidatorsFilter };

  get filterData(): Record<ValidatorsFilterType, { name: string; description: string }> {
    return this.t('soraStaking.validatorsFilterDialog.filters') as any;
  }

  @Watch('isVisible', { deep: true })
  onVisibleChange() {
    if (this.isVisible) {
      this.localFilter = { ...this.filter };
    }
  }

  save() {
    this.$emit('save', this.localFilter);
  }

  resetAll() {
    this.localFilter = { ...emptyValidatorsFilter };
  }
}
</script>

<style lang="scss">
.validators-filter-dialog .el-dialog__header {
  position: absolute;
  pointer-events: none;

  button {
    pointer-events: all;
  }
}
</style>

<style lang="scss" scoped>
.filter-container {
  width: 100%;
}

.title {
  text-align: center;
  font-size: var(--s-font-size-large);
  margin-bottom: 20px;
  line-height: 42px;
  margin-bottom: 2px;

  &-tooltip {
    margin-left: 8px;
  }
}

.filter-item {
  padding: 20px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--s-color-base-border-secondary);
  }

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 24px;
  }

  &-label {
    font-size: 16px;
  }

  &-description {
    margin-top: 8px;
    font-size: 13px;
    line-height: 140%;
    font-weight: 300;
    color: var(--s-color-text-secondary);
  }
}

.save-button,
.reset-button {
  width: 100%;
}

.reset-all {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 13px;
  font-style: normal;
  font-weight: 300;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 16px;
}
</style>
