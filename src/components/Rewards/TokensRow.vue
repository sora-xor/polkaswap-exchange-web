<template>
  <div class="tokens-row">
    <div class="tokens-row-container">
      <token-logo
        v-for="symbol in rowSymbols"
        :key="symbol"
        :token-symbol="symbol"
        :size="size"
        class="tokens-row__item"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { KnownSymbols } from '@sora-substrate/util'

import { lazyComponent } from '@/router'
import { Components, LogoSize } from '@/consts'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class TokensRow extends Vue {
  @Prop({ default: () => [], type: Array }) symbols!: Array<KnownSymbols>
  @Prop({ default: LogoSize.LARGE, type: String }) readonly size!: LogoSize

  get rowSymbols (): Array<KnownSymbols> {
    return [...this.symbols].reverse()
  }
}
</script>

<style lang="scss" scoped>
.tokens-row {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;

  &-container {
    display: flex;
    flex-flow: row nowrap;
    direction: rtl;
  }

  &__item {
    display: block;

    & + & {
      margin-right: -$basic-spacing * 2;
    }
  }
}
</style>
