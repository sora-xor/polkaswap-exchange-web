import { defineComponent } from 'vue';

import { useNotification, type AsyncFnWithoutArgs } from '@/composables/useNotification';
import type { NotificationSeverity } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification';

import TranslationMixin from './TranslationMixin';

export default defineComponent({
  mixins: [TranslationMixin],
  data() {
    return {
      notification: useNotification(),
      notificationStore: useNotificationStore(),
    };
  },
  computed: {
    defaultErrorMessage: {
      get(this: any): string {
        return this.notificationStore.defaultErrorTranslationKey;
      },
      set(this: any, value: string): void {
        this.notificationStore.setDefaultErrorTranslationKey(value);
      },
    },
    ErrorMessages: {
      get(this: any): [string, string][] {
        return this.notificationStore.errorMappings.map(({ pattern, translationKey }: any) => [
          pattern,
          translationKey,
        ]);
      },
      set(this: any, value: [string, string][]): void {
        this.notificationStore.replaceErrorMappings(
          value.map(([pattern, translationKey]) => ({ pattern, translationKey }))
        );
      },
    },
  },
  methods: {
    getErrorMessage(this: any, error: unknown): string {
      return this.notification.getErrorMessage(error);
    },
    showAppAlert(this: any, message: string, title = ''): void {
      this.notification.showAppAlert(message, title);
    },
    showAppNotification(this: any, message: string, severity?: NotificationSeverity): void {
      this.notification.showAppNotification(message, severity);
    },
    async withAppNotification(this: any, func: AsyncFnWithoutArgs, throwable = false): Promise<void> {
      await this.notification.withAppNotification(func, throwable);
    },
    async withAppAlert(this: any, func: AsyncFnWithoutArgs, throwable = false): Promise<void> {
      await this.notification.withAppAlert(func, throwable);
    },
  },
});
