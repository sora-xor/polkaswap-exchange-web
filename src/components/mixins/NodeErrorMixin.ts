import { Component, Mixins } from 'vue-property-decorator'
import { State, Action } from 'vuex-class'

import TranslationMixin from './TranslationMixin'
import { AppHandledError } from '@/utils/error'
import { delay } from '@/utils'
import { Node } from '@/types/nodes'

@Component
export default class NodeErrorMixin extends Mixins(TranslationMixin) {
  @State(state => state.settings.node) node!: Node
  @Action setSelectNodeDialogVisibility!: (flag: boolean) => void

  protected async handleNodeError (error, node?: Node): Promise<void> {
    const errorKey = error instanceof AppHandledError ? error.translationKey : 'node.errors.connection'
    const errorPayload = error instanceof AppHandledError ? error.translationPayload : {}

    if (node && !errorPayload.address) {
      errorPayload.address = node.address
    }

    const errorMessage = this.t(errorKey, errorPayload)

    const resultKey = this.node.address ? 'node.messages.connected' : 'node.messages.selectNode'
    const resultPayload = { address: this.node.address }
    const resultMessage = this.t(resultKey, resultPayload)

    const message = errorMessage + resultMessage

    if (!this.node.address) {
      this.setSelectNodeDialogVisibility(true)
      await this.$nextTick() // wail vdom update
      await delay(500) // wait for render select node modal
    }

    this.$alert(message, { title: this.t('errorText') })
  }

  protected handleNodeDisconnect (node: Node): void {
    this.$notify({
      message: this.t('node.warnings.disconnect', { address: node.address }),
      type: 'warning',
      title: ''
    })
  }

  protected handleNodeReconnect (node: Node): void {
    this.$notify({
      message: this.t('node.messages.connected', { address: node.address }),
      type: 'success',
      title: ''
    })
  }
}
