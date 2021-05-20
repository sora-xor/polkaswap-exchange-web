import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import TranslationMixin from './TranslationMixin'
import { AppHandledError } from '@/utils/error'
import { Node } from '@/types/nodes'

@Component
export default class NodeErrorMixin extends Mixins(TranslationMixin) {
  @Getter node!: Node

  private handleNodeError (error, node?: Node) {
    const key = error instanceof AppHandledError ? error.translationKey : 'node.errors.connection'
    const payload = error instanceof AppHandledError ? error.translationPayload : {}

    if (node && !payload.failed) {
      payload.failed = node.address
    }
    if (!payload.success) {
      payload.success = this.node.address
    }

    this.$alert(
      this.t(key, payload),
      { title: this.t('errorText') }
    )
  }
}
