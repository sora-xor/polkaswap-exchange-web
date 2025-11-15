import { Status } from '@soramitsu-ui/ui';
declare const severityLookup: {
  readonly info: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
};
type StatusValue = (typeof Status)[keyof typeof Status];
export type NotificationSeverity = keyof typeof severityLookup | StatusValue;
export interface NotificationToastRequest {
  message: string;
  title?: string;
  severity?: NotificationSeverity;
  timeout?: number;
  showCloseBtn?: boolean;
}
export interface NormalizedToastRequest {
  message: string;
  title?: string;
  status: StatusValue;
  timeout?: number;
  showCloseBtn?: boolean;
}
export interface NotificationAlertRequest {
  message: string;
  title?: string;
  severity?: NotificationSeverity;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}
export interface NormalizedAlertRequest {
  message: string;
  title?: string;
  status: StatusValue;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}
type ToastHandler = (payload: NormalizedToastRequest) => void;
type AlertHandler = (payload: NormalizedAlertRequest) => void;
declare class NotificationService {
  private toastHandler?;
  private alertHandler?;
  private pendingToasts;
  private pendingAlerts;
  notify(request: NotificationToastRequest): void;
  alert(request: NotificationAlertRequest): void;
  registerToastHandler(handler: ToastHandler): () => void;
  registerAlertHandler(handler: AlertHandler): () => void;
}
declare const notificationService: NotificationService;
export default notificationService;
