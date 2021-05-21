import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import TranslationMixin from './TranslationMixin'
import { AppHandledError } from '@/utils/error'
import { Node } from '@/types/nodes'

@Component
export default class NodeErrorMixin extends Mixins(TranslationMixin) {
  @Getter node!: Node

  protected handleNodeError (error, node?: Node) {
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

    this.$alert(message, { title: this.t('errorText') })
  }
}
