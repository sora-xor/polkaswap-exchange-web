import { NotificationSeverity } from '../services/notification';

export type AsyncFnWithoutArgs = () => Promise<unknown>;
export declare function useNotification(): {
  getErrorMessage: (error: unknown) => string;
  showAppAlert: (message: string, title?: string) => void;
  showAppNotification: (message: string, severity?: NotificationSeverity) => void;
  withAppNotification: (func: AsyncFnWithoutArgs, throwable?: boolean) => Promise<void>;
  withAppAlert: (func: AsyncFnWithoutArgs, throwable?: boolean) => Promise<void>;
  setDefaultErrorTranslationKey: (key: string) => void;
  registerErrorMapping: (mapping: import('../stores/notification').ErrorMapping) => void;
  replaceErrorMappings: (mappings: import('../stores/notification').ErrorMapping[]) => void;
};
