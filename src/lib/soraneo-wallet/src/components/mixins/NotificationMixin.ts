import { Options, mixins } from 'vue-property-decorator';

import { useNotification, type AsyncFnWithoutArgs } from '@/composables/useNotification';
import type { NotificationSeverity } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification';

import TranslationMixin from './TranslationMixin';

@Options({})
export default class NotificationMixin extends mixins(TranslationMixin) {
  private notification = useNotification();

  private notificationStore = useNotificationStore();

  get defaultErrorMessage(): string {
    return this.notificationStore.defaultErrorTranslationKey;
  }

  set defaultErrorMessage(value: string) {
    this.notificationStore.setDefaultErrorTranslationKey(value);
  }

  get ErrorMessages(): [string, string][] {
    return this.notificationStore.errorMappings.map(({ pattern, translationKey }) => [pattern, translationKey]);
  }

  set ErrorMessages(value: [string, string][]) {
    this.notificationStore.replaceErrorMappings(
      value.map(([pattern, translationKey]) => ({ pattern, translationKey }))
    );
  }

  getErrorMessage(error: unknown): string {
    return this.notification.getErrorMessage(error);
  }

  showAppAlert(message: string, title = ''): void {
    this.notification.showAppAlert(message, title);
  }

  showAppNotification(message: string, severity?: NotificationSeverity): void {
    this.notification.showAppNotification(message, severity);
  }

  async withAppNotification(func: AsyncFnWithoutArgs, throwable = false): Promise<void> {
    await this.notification.withAppNotification(func, throwable);
  }

  async withAppAlert(func: AsyncFnWithoutArgs, throwable = false): Promise<void> {
    await this.notification.withAppAlert(func, throwable);
  }
}
