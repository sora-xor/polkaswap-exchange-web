<template>
  <s-dialog
    title="Select a token"
    :visible.sync="dialogVisible"
    width="600px"
  >
    <s-input
      v-model="query"
      placeholder="Search Token Name, Symbol, or Address"
    />
    <div class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.shortName" class="token-item">
        <el-col>
          <s-row flex justify="start" align="middle">
            <div class="token-item_logo">
            </div>
            <div>
              <div class="token-item_name">{{ token.name }} ({{ token.shortName }})</div>

              <s-row flex align="middle">
                <div class="token-item_price">${{ token.price }}</div>
                <div :class="{'token-item_price-change': true, 'positive': token.priceChange > 0, 'negative': token.priceChange < 0}">{{ token.priceChange > 0 ? '+' : ''}}{{ token.priceChange }}%</div>
              </s-row>
            </div>
          </s-row>
        </el-col>
      </div>
    </div>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'

@Component
export default class SelectToken extends Mixins(TranslationMixin) {
  dialogVisible = false
  query = ''
  selectedToken = null

  @Action getTokens
  @Getter tokens!: any
  @Prop() defaultToken

  get filteredTokens () {
    if (this.query) {
      const query = this.query.toLowerCase().trim()
      return this.tokens.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.shortName.toLowerCase().includes(query) ||
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

  togleModal () {
    this.dialogVisible = !this.dialogVisible
  }

  selectToken (event, token) {
    this.selectedToken = token
    this.$emit('select', this.selectedToken)
    this.togleModal()
  }
}
</script>

<style lang="scss" scoped>
.token-item {
  padding: 8px;
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
