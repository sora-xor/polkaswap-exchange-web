<template>
  <s-dialog
    :visible.sync="dialogVisible"
    width="496px"
    :title="t('selectToken.title')"
    class="token-select"
  >
    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="token-search"
      prefix="el-icon-search"
      size="medium"
    />
    <div v-if="filteredTokens && filteredTokens.length > 0" class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <token-logo :token="token.symbol" />
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
import { LogoSize, Components } from '@/consts'
import { lazyComponent } from '@/router'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectToken extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false, required: true }) readonly visible!: boolean

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
    this.getTokens()
  }

  selectToken (event, token) {
    this.selectedToken = token
    this.query = ''
    this.$emit('select', token)
    this.$emit('close')
  }
}
</script>

<style lang="scss">
.token-select {
  .el-dialog__body {
    padding: 0 !important;
  }
}
.token-search {
  .el-input__inner {
    border-radius: 8px;
  }
}
</style>

<style lang="scss" scoped>

.token-search {
  margin-left: $inner-spacing-big;
  width: calc(100% - 2 * #{$inner-spacing-big});
}
.token-item {
  padding: $inner-spacing-medium $inner-spacing-big;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  &:hover {
    background-color: var(--s-color-base-background-hover);
  }
  &__name, &__amount {
    font-weight: 600;
    font-size: $s-font-size-small;
  }

  .token-logo {
    margin-right: $inner-spacing-medium;
  }
}
.token-list {
  height: 50vh;
  overflow: auto;
  &__empty {
    //TODO: Implement empty list design
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>
