<template>
  <div class="tokens-row">
    <div class="tokens-row-container">
      <token-logo
        v-for="(token, index) in tokens"
        :token="token"
        :key="token.symbol"
        :size="size"
        :style="{ zIndex: tokens.length - index }"
        class="tokens-row__item"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Asset } from '@sora-substrate/util/build/assets/types';

import { LogoSize } from '@/consts';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class TokensRow extends Vue {
  @Prop({ default: () => [], type: Array }) tokens!: Array<Asset>;
  @Prop({ default: LogoSize.LARGE, type: String }) readonly size!: LogoSize;
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

    & + & {
      margin-left: -$basic-spacing * 2;
    }
  }
}
</style>
