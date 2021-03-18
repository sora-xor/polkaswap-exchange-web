<template>
  <div class="tokens-row">
    <div class="tokens-row-container">
      <token-logo
        v-for="(symbol, index) in symbols"
        :key="symbol"
        :token-symbol="symbol"
        :size="size"
        :style="{ zIndex: symbols.length - index }"
        class="tokens-row__item"
      />
    </div>
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
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;

  &-container {
    display: flex;
    flex-flow: row nowrap;
  }

  &__item {
    display: block;
    position: relative;

    & + & {
      top: 0;
      margin-left: -$basic-spacing * 2;
    }
  }
}
</style>
