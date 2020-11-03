<template>
  <s-dialog
    :title="t('selectToken.title')"
    :visible.sync="visible"
    width="600px"
    class="token-select"
  >
    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="token-search"
    />
    <div v-if="filteredTokens.length > 0" class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <img v-if="token.logo" :src="token.logo" :alt="token.name" class="token-item_logo">
            <div v-else class="token-item_empty-logo"></div>
            <div>
              <div class="token-item_name">{{ token.name }} ({{ token.symbol }})</div>
            </div>
          </s-row>
        </s-col>
        <div>
          <span class="token-item_amount">{{ token.amount || '-' }}</span>
        </div>
      </div>
    </div>
    <div v-else class="token-empty-list">
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
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$container-spacing: 24px;

.token-select {
  .el-dialog__body {
    padding: 0px;
  }
}

.token-search {
  padding-left: $container-spacing;
  padding-right: $container-spacing;
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

.token-item_logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.35);
  margin-right: $inner-spacing-medium;
  margin-top: $inner-spacing-medium;
  margin-bottom: $inner-spacing-medium;
  position: relative;
}

.token-item_empty-logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: $s-color-base-background-hover;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.35);
  margin-right: $inner-spacing-medium;
  margin-top: $inner-spacing-medium;
  margin-bottom: $inner-spacing-medium;
  position: relative;
}

.token-item_empty-logo::after {
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

.token-item_name {
  font-weight: 600;
  font-size: $s-font-size-small;
}

.token-item_amount {
  font-weight: 600;
  font-size: $s-font-size-small;
}

.token-list {
  height: 50vh;
  overflow: auto;
}

.token-empty-list {
  //TODO: Implement empty list design
}
</style>
