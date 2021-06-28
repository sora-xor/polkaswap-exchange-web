<template>
  <div class="content" v-loading="parentLoading">
    <s-table
      v-if="whitelistAssets.length"
      :data="whitelistAssets"
      :highlight-current-row="false"
      size="small"
    >
      <s-table-column label="Name" width="300">
        <template v-slot="{ $index, row }">
          <div class="tokens-item-name">
            <span>{{ $index + 1 }}</span>
            <token-logo class="tokens-item__logo" :token-symbol="row.symbol"  />
            <span>{{ row.name }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column prop="symbol" label="Symbol" width="80"></s-table-column>
      <s-table-column label="Address">
        <template v-slot="{ row }">
          <div class="tokens-item-name">
            <span class="tokens-item__address">{{ row.address }}</span>
          </div>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { Asset } from '@sora-substrate/util'

import { Components } from '@/consts'
import { lazyComponent } from '@/router'

import LoadingMixin from '@/components/mixins/LoadingMixin'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class Tokens extends Mixins(LoadingMixin) {
  @Getter('whitelistAssets', { namespace: 'assets' }) whitelistAssets!: Array<Asset>

  log (scope) {
    console.log(scope)
  }
}
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  min-width: 800px;
  max-width: 1040px;
  margin: 0 auto;
  text-align: center;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tokens-item {
  &-name {
    display: flex;
    align-items: center;

    & > *:not(:last-child) {
      margin-right: $inner-spacing-mini;
    }
  }
  &__logo {
    display: inline-flex;
  }
  &__address {
    white-space: nowrap;
  }
}
</style>
