<template>
  <s-dialog
    :visible.sync="visible"
    width="600px"
    class="token-select"
  >
    <template #title>
      <div class="token-select__title">
      {{ t('selectToken.title') }}
      </div>
    </template>

    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="token-search"
    />
    <div v-if="filteredTokens && filteredTokens.length > 0" class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <img v-if="token.logo" :src="token.logo" :alt="token.name" class="token-item__logo">
            <div v-else class="token-item__empty-logo"></div>
            <div>
              <div class="token-item__name">{{ token.name }} ({{ token.symbol }})</div>
            </div>
          </s-row>
        </s-col>
        <div>
          <span class="token-item__amount">{{ token.amount || '-' }}</span>
        </div>
      </div>
    </div>
    <div v-else class="token-list token-list__empty">
      {{ t('selectToken.emptyListMessage') }}
    </div>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { Token } from '@/types'

@Component
export default class SelectToken extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false, required: true }) readonly visible!: boolean
  @Prop() readonly defaultToken

  query = ''
  selectedToken = null
  dialogVisible = false

  @Watch('visible')
  visibleChange (value: boolean) {
    this.dialogVisible = value
  }

  @Action getTokens
  @Getter tokens!: Array<Token>

  get filteredTokens () {
    if (this.query) {
      const query = this.query.toLowerCase().trim()
      return this.tokens.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.symbol.toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query)
      )
    }

    return this.tokens
  }

  created () {
    if (this.defaultToken) {
      this.selectedToken = this.defaultToken
    }
    this.getTokens()
  }

  selectToken (event, token) {
    this.selectedToken = token
    this.$emit('select', this.selectedToken)
    this.$emit('close')
  }
}
</script>

<style lang="scss">
.token-select {
  .el-dialog__body {
    padding: 0px;
  }
}

.token-search {
  .el-input__inner {
    height: 40px !important;
    border-radius: 8px;
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$container-spacing: 24px;

.token-select__title {
  margin-left: 4px;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.token-search {
  margin-left: $container-spacing;
  width: calc(100% - 2 * #{$container-spacing});
  min-height: 40px;
}

.token-item {
  padding-left: $container-spacing;
  padding-right: $container-spacing;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.token-item:hover {
  background-color: $s-color-base-background-hover;
}

.token-item__logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.35);
  margin-right: $inner-spacing-medium;
  margin-top: $inner-spacing-medium;
  margin-bottom: $inner-spacing-medium;
  position: relative;
}

.token-item__empty-logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: $s-color-base-background-hover;
  box-shadow: $s-shadow-tooltip;
  margin-right: $inner-spacing-medium;
  margin-top: $inner-spacing-medium;
  margin-bottom: $inner-spacing-medium;
  position: relative;
}

.token-item__empty-logo::after {
  content: " ";
  width: 14px;
  height: 14px;
  background: $s-color-base-content-secondary;
  border-radius: 2px;
  transform: rotate(45deg);
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -7px;
  margin-left: -7px;
}

.token-item__name {
  font-weight: 600;
  font-size: $s-font-size-small;
}

.token-item__amount {
  font-weight: 600;
  font-size: $s-font-size-small;
}

.token-list {
  height: 50vh;
  overflow: auto;
}

.token-list__empty {
  //TODO: Implement empty list design
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
