<template>
  <div class="tokens-row">
    <token-logo
      v-for="(symbol, index) in symbols"
      :key="symbol"
      :token-symbol="symbol"
      :size="size"
      :style="{ zIndex: symbols.length - index }"
      class="tokens-row__item"
    />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components, LogoSize } from '@/consts'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class TokensRow extends Vue {
  @Prop({ default: [], type: Array }) symbols!: Array<string>
  @Prop({ default: LogoSize.LARGE, type: String }) readonly size!: LogoSize
}
</script>

<style lang="scss" scoped>
.tokens-row {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;

  &__item {
    display: block;
    position: relative;

    & + & {
      top: 0;
      left: -20px;
    }
  }
}
</style>
