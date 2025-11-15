export const NOTIFICATION_STATUS = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

const severityLookup = {
  info: NOTIFICATION_STATUS.Info,
  success: NOTIFICATION_STATUS.Success,
  warning: NOTIFICATION_STATUS.Warning,
  error: NOTIFICATION_STATUS.Error,
} as const;

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

function toStatus(severity?: NotificationSeverity): StatusValue {
  if (!severity) return NOTIFICATION_STATUS.Info;
  if (typeof severity === 'string' && severity in severityLookup) {
    return severityLookup[severity as keyof typeof severityLookup];
  }
  return severity as StatusValue;
}

class NotificationService {
  private toastHandler?: ToastHandler;

  private alertHandler?: AlertHandler;

  private pendingToasts: NormalizedToastRequest[] = [];

  private pendingAlerts: NormalizedAlertRequest[] = [];

  notify(request: NotificationToastRequest): void {
    const normalized: NormalizedToastRequest = {
      message: request.message,
      title: request.title,
      status: toStatus(request.severity),
      timeout: request.timeout,
      showCloseBtn: request.showCloseBtn,
    };

    if (this.toastHandler) {
      this.toastHandler(normalized);
      return;
    }

    this.pendingToasts.push(normalized);
  }

  alert(request: NotificationAlertRequest): void {
    const normalized: NormalizedAlertRequest = {
      message: request.message,
      title: request.title,
      status: toStatus(request.severity ?? NOTIFICATION_STATUS.Error),
      confirmText: request.confirmText,
      cancelText: request.cancelText,
      onConfirm: request.onConfirm,
    };

    if (this.alertHandler) {
      this.alertHandler(normalized);
      return;
    }

    this.pendingAlerts.push(normalized);
  }

  registerToastHandler(handler: ToastHandler): () => void {
    this.toastHandler = handler;

    if (this.pendingToasts.length) {
      for (const toast of this.pendingToasts.splice(0)) {
        handler(toast);
      }
    }

    return () => {
      if (this.toastHandler === handler) {
        this.toastHandler = undefined;
      }
    };
  }

  registerAlertHandler(handler: AlertHandler): () => void {
    this.alertHandler = handler;

    if (this.pendingAlerts.length) {
      for (const alert of this.pendingAlerts.splice(0)) {
        handler(alert);
      }
    }

    return () => {
      if (this.alertHandler === handler) {
        this.alertHandler = undefined;
      }
    };
  }
}

const notificationService = new NotificationService();

export default notificationService;
