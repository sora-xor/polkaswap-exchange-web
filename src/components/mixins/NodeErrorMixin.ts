import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import type { Node } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';

import TranslationMixin from './TranslationMixin';

@Component
export default class NodeErrorMixin extends Mixins(TranslationMixin, mixins.NotificationMixin) {
  protected async handleNodeError(error, node: Node): Promise<void> {
    const errorKey = error instanceof AppHandledError ? error.translationKey : 'node.errors.connection';
    const errorPayload = error instanceof AppHandledError ? error.translationPayload : {};
    const errorMessage = this.t(errorKey, errorPayload);

    this.showAppNotification(errorMessage, 'error');
  }

  protected handleNodeDisconnect(node: Node): void {
    this.showAppNotification(this.t('node.warnings.disconnect', { address: node.address }), 'warning');
  }

  protected handleNodeConnect(node: Node): void {
    this.showAppNotification(this.t('node.messages.connected', { address: node.address }), 'success');
  }
}
