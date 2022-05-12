import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from './TranslationMixin';
import { AppHandledError } from '@/utils/error';
import { delay } from '@/utils';
import { state, getter, mutation } from '@/store/decorators';
import type { Node } from '@/types/nodes';

@Component
export default class NodeErrorMixin extends Mixins(TranslationMixin) {
  @state.settings.node node!: Partial<Node>;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;
  @mutation.settings.setSelectNodeDialogVisibility setSelectNodeDialogVisibility!: (flag: boolean) => void;

  protected async handleNodeError(error, preferNotification = false): Promise<void> {
    const errorKey = error instanceof AppHandledError ? error.translationKey : 'node.errors.connection';
    const errorPayload = error instanceof AppHandledError ? error.translationPayload : {};
    const errorMessage = this.t(errorKey, errorPayload);

    const resultKey = this.node.address ? 'node.messages.connected' : 'node.messages.selectNode';
    const resultPayload = { address: this.node.address };
    const resultMessage = this.t(resultKey, resultPayload);

    if (!this.node.address) {
      this.setSelectNodeDialogVisibility(true);
      await this.$nextTick(); // wait vdom update
      await delay(500); // wait for render select node modal
    }

    if (this.nodeIsConnected && preferNotification) {
      this.$notify({
        message: resultMessage,
        type: 'success',
        title: '',
      });
    } else {
      this.$alert(errorMessage + resultMessage, { title: this.t('errorText') });
    }
  }

  protected handleNodeDisconnect(node: Node): void {
    this.$notify({
      message: this.t('node.warnings.disconnect', { address: node.address }),
      type: 'warning',
      title: '',
    });
  }

  protected handleNodeReconnect(node: Node): void {
    this.$notify({
      message: this.t('node.messages.connected', { address: node.address }),
      type: 'success',
      title: '',
    });
  }
}
