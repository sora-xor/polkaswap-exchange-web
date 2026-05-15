import type { EditableAlertObject } from '@/consts';
import type { Alert } from '@/lib/soraneo-wallet/src/types/common';

/**
 * Adds a new price alert to the front of the list and enforces the alert cap.
 */
export function prependPriceAlert(alerts: readonly Alert[], alert: Alert, maxAlerts: number): Alert[] {
  return [alert, ...alerts].slice(0, maxAlerts);
}

/**
 * Replaces one price alert entry by its UI position.
 */
export function replacePriceAlert(alerts: readonly Alert[], payload: EditableAlertObject): Alert[] {
  const nextAlerts = [...alerts];
  nextAlerts[payload.position] = payload.alert;
  return nextAlerts;
}

/**
 * Removes one price alert entry by its UI position.
 */
export function removePriceAlertAt(alerts: readonly Alert[], position: number): Alert[] {
  return alerts.filter((_alert, index) => index !== position);
}

/**
 * Updates the notified flag for one existing price alert entry.
 */
export function setPriceAlertNotified(
  alerts: readonly Alert[],
  payload: { position: number; value: boolean }
): Alert[] {
  const nextAlert = alerts[payload.position];

  if (!nextAlert) {
    return [...alerts];
  }

  const nextAlerts = [...alerts];
  nextAlerts[payload.position] = {
    ...nextAlert,
    wasNotified: payload.value,
  };

  return nextAlerts;
}
