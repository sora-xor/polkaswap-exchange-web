<template>
  <s-dialog
    :title="t('selectToken.title')"
    :visible.sync="visible"
    width="600px"
  >
    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
    />
    <div class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <div class="token-item_logo">
              <!-- TODO: Implement logo image -->
            </div>
            <div>
              <div class="token-item_name">{{ token.name }} ({{ token.symbol }})</div>

              <s-row flex align="middle">
                <div class="token-item_price">${{ token.price }}</div>
                <div :class="{'token-item_price-change': true, 'positive': token.priceChange > 0, 'negative': token.priceChange < 0}">{{ token.priceChange > 0 ? '+' : ''}}{{ token.priceChange }}%</div>
              </s-row>
            </div>
          </s-row>
        </s-col>
        <!-- TODO: Implement current amount -->
      </div>
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
  @Prop({ required: true }) visible
  @Prop() defaultToken

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
    } else {
      return this.tokens
    }
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

<style lang="scss" scoped>
.token-item {
  padding: 8px;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.token-item:hover {
  background-color: rgba(0, 0, 0, 0.05);;
}

.token-item_logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ECEFF0;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.35);
  margin-right: 16px;
  position: relative;
}

.token-item_logo::after {
  content: " ";
  width: 14px;
  height: 14px;
  background: #53565A;
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
}

.token-item_price-change {
  margin-left: 0.25rem;

  &.positive {
    color: rgb(67, 150, 42)
  }

  &.negative {
    color: rgb(230, 49, 24)
  }
}
</style>
