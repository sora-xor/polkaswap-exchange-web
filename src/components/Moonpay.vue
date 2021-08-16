<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <iframe class="moonpay-frame" src="https://buy-staging.moonpay.com?apiKey=pk_test_4ASGxHKGpLPE6sdQq1V3QjtpUFSpWLk" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'

import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'

import { NetworkTypes } from '@/consts'
import { getCssVariableValue } from '@/utils'

const getMoonpayBaseUrl = (soraNetwork: string): string => {
  if (soraNetwork === NetworkTypes.Mainnet) {
    return ''
  }
  return 'https://buy-staging.moonpay.com'
}

@Component({
  components: {
    DialogBase
  }
})
export default class Moonpay extends Mixins(DialogMixin) {
  @Getter libraryTheme!: Theme
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @State(state => state.settings.language) language!: string

  moonpayUrl= ''

  created (): void {
    const color = getCssVariableValue('--s-color-theme-accent')
    const baseUrl = getMoonpayBaseUrl(this.soraNetwork)
    const apiKey = this.apiKeys.moonpay
  }
}
</script>

<style lang="scss">
.dialog-wrapper.moonpay-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
  }
}
</style>

<style lang="scss" scoped>
.moonpay {
  &-frame {
    border: none;
    width: 100%;
    min-height: 574px;
    box-shadow: inset -5px -5px 5px rgba(255, 255, 255, 0.5), inset 1px 1px 10px rgba(0, 0, 0, 0.1);
    filter: drop-shadow(1px 1px 5px #FFFFFF);
    border-radius: 20px;
  }
}
</style>
