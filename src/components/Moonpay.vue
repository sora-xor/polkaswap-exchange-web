<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <iframe class="moonpay-frame" :src="moonpayUrl" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import debounce from 'lodash/fp/debounce'

import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'

import router from '@/router'
import { NetworkTypes } from '@/consts'
import { getCssVariableValue } from '@/utils'
import { detectBaseUrl } from '@/api'
import { moonpayStorage } from '@/utils/storage'

import MoonpayLogo from '@/components/logo/Moonpay.vue'

const getMoonpayBaseUrl = (soraNetwork: string): string => {
  if (soraNetwork === NetworkTypes.Mainnet) {
    return 'https://buy.moonpay.com'
  }
  return 'https://buy-staging.moonpay.com'
}

@Component({
  components: {
    DialogBase,
    MoonpayLogo
  }
})
export default class Moonpay extends Mixins(DialogMixin) {
  moonpayUrl = ''
  storageHandler

  @Getter libraryTheme!: Theme
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @State(state => state.settings.language) language!: string
  @Action setMoonpayDialogVisibility!: (flag: boolean) => void

  @Watch('isVisible')
  private updateMoonpayUrl (visible: boolean) {
    if (visible) {
      this.moonpayUrl = this.createMoonpayUrl()
    }
  }

  created (): void {
    this.storageHandler = debounce(100)(this.handleStorageChange)

    window.addEventListener('storage', this.storageHandler)
  }

  destroyed (): void {
    window.removeEventListener('storage', this.storageHandler)
  }

  createMoonpayUrl (): string {
    const baseUrl = getMoonpayBaseUrl(this.soraNetwork)
    const redirectURL = `${detectBaseUrl(router)}moonpay.html`
    const params = {
      colorCode: getCssVariableValue('--s-color-theme-accent'),
      apiKey: this.apiKeys.moonpay,
      language: this.language,
      redirectURL
    }
    const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
    const url = `${baseUrl}?${query}`

    return url
  }

  handleStorageChange (): void {
    const transactions = JSON.parse(moonpayStorage.get('transactions')) || []

    if (transactions.length !== 0) {
      this.setMoonpayDialogVisibility(false)
      console.log(transactions)
    }
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
