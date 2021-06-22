<template>
  <div class="token-address">
    <span class="token-address__name">{{ tokenName }}</span>
    <s-tooltip :content="t('selectToken.copy')" border-radius="mini" placement="bottom-end">
      <span class="token-address__value" @click="handleCopy">({{ formattedAddress }})</span>
    </s-tooltip>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import TranslationMixin from '../mixins/TranslationMixin'

import { formatAddress, copyToClipboard } from '@/utils'

@Component
export default class TokenAddress extends Mixins(TranslationMixin) {
  @Prop({ default: '', type: String }) readonly name!: string
  @Prop({ default: '', type: String }) readonly symbol!: string
  @Prop({ default: '', type: String }) readonly address!: string
  @Prop({ default: '', type: String }) readonly externalAddress!: string
  @Prop({ default: false, type: Boolean }) readonly external!: boolean

  get tokenName (): string {
    return this.name || this.symbol
  }

  get tokenAddress (): string {
    return this.external ? this.externalAddress : this.address
  }

  get formattedAddress (): string {
    return formatAddress(this.tokenAddress, 10)
  }

  async handleCopy (event: Event): Promise<void> {
    event.stopImmediatePropagation()
    try {
      await copyToClipboard(this.tokenAddress)
      this.$notify({
        message: this.t('selectToken.successCopy', { symbol: this.symbol }),
        type: 'success',
        title: ''
      })
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: ''
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.token-address {
  color: var(--s-color-base-content-secondary);

  &__name {
    margin-right: $inner-spacing-mini / 2;
  }

  &__value {
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
