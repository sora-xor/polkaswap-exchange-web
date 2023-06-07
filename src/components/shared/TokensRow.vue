<template>
  <div class="tokens-row">
    <div class="tokens-row-container">
      <token-logo
        v-for="(asset, index) in assets"
        :key="index"
        :token="asset"
        :size="size"
        :style="{ zIndex: index }"
        :class="['tokens-row__item', { border }]"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Vue, Component, Prop } from 'vue-property-decorator';

import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TokenLogo: components.TokenLogo,
  },
})
export default class TokensRow extends Vue {
  @Prop({ default: () => [], type: Array }) assets!: Array<Asset>;
  @Prop({ default: WALLET_CONSTS.LogoSize.LARGE, type: String }) readonly size!: WALLET_CONSTS.LogoSize;
  @Prop({ default: false, type: Boolean }) readonly border!: boolean;
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
    justify-content: center;
  }

  &__item {
    display: block;
    border-width: 2px;
    border-style: solid;
    border-color: transparent;
    border-radius: 50%;

    &.border {
      border-color: var(--s-color-utility-surface);
    }

    & + & {
      margin-left: -12.5%;
    }
  }
}
</style>
