<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectToken.title')"
    customClass="token-select"
  >
    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="token-search"
      prefix="el-icon-search"
      size="medium"
      borderRadius="mini"
    />
    <div v-if="filteredTokens && filteredTokens.length > 0" class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken($event, token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <token-logo :token="token" />
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
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Token } from '@/types'
import { LogoSize, Components } from '@/consts'
import { lazyComponent } from '@/router'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectToken extends Mixins(TranslationMixin, DialogMixin) {
  query = ''
  selectedToken = null

  @Getter tokens!: Array<Token>
  @Action getTokens

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
    this.isVisible = false
  }
}
</script>

<style lang="scss">
.token-select {
  .el-dialog {
    overflow: hidden;
    &__title {
      letter-spacing: $s-letter-spacing-small;
    }
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
}
</style>

<style lang="scss" scoped>
// TODO 4 alexnatalia: Check 71px theory
$token-item-height: calc(var(--s-size-medium) + #{$inner-spacing-medium} * 2);

.token-search {
  // TODO: Fix input styles (paddings and icon position)
  margin-left: $inner-spacing-big;
  margin-bottom: $inner-spacing-medium;
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
    font-weight: $s-font-weight-medium;
    font-size: var(--s-font-size-small);
  }

  .token-logo {
    margin-right: $inner-spacing-medium;
  }
}
.token-list {
  height: calc(#{$token-item-height} * 7);
  overflow: auto;
  &__empty {
    //TODO: Implement empty list design
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>
