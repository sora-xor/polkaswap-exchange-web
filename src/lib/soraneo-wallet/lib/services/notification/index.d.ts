export declare const NOTIFICATION_STATUS: {
  readonly Info: 'info';
  readonly Success: 'success';
  readonly Warning: 'warning';
  readonly Error: 'error';
};
declare const severityLookup: {
  readonly info: 'info';
  readonly success: 'success';
  readonly warning: 'warning';
  readonly error: 'error';
};
type StatusValue = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];
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
