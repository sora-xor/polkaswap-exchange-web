import type { RealtimePriority, RealtimeProfile } from '@/services/realtime/profile';

export const DATA_PLANE_PROTOCOL_VERSION = 1 as const;

export type DataPlaneRequestId = number;

export type DataPlaneAck = {
  type: 'ack';
  requestId: DataPlaneRequestId;
  ok: boolean;
  error?: string;
};

export type DataPlaneResponse = {
  type: 'response';
  requestId: DataPlaneRequestId;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type DataPlaneEvent = {
  type: 'event';
  subscriptionKey: string;
  payload: unknown;
};

export type DataPlaneStatusEvent = {
  type: 'status';
  connectionId: string;
  status: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';
  details?: string;
};

export type DataPlaneMetricsEvent = {
  type: 'metrics';
  metrics: {
    openConnections: number;
    activeSubscriptions: number;
    pendingRpcRequests: number;
    connectedClients: number;
    visible: boolean;
    profile: RealtimeProfile;
  };
};

export type DataPlaneWorkerOutgoingMessage =
  | DataPlaneAck
  | DataPlaneResponse
  | DataPlaneEvent
  | DataPlaneStatusEvent
  | DataPlaneMetricsEvent;

export type DataPlaneConnectCommand = {
  type: 'connect';
  requestId: DataPlaneRequestId;
  connectionId: string;
  endpoint: string;
  maxConnections?: number;
};

export type DataPlaneDisconnectCommand = {
  type: 'disconnect';
  requestId: DataPlaneRequestId;
  connectionId: string;
};

export type DataPlaneSubscribeCommand = {
  type: 'subscribe';
  requestId: DataPlaneRequestId;
  connectionId: string;
  subscriptionKey: string;
  method: string;
  params?: unknown[];
  unsubscribeMethod: string;
  priority?: RealtimePriority;
};

export type DataPlaneUnsubscribeCommand = {
  type: 'unsubscribe';
  requestId: DataPlaneRequestId;
  subscriptionKey: string;
};

export type DataPlaneRequestCommand = {
  type: 'request';
  requestId: DataPlaneRequestId;
  connectionId: string;
  method: string;
  params?: unknown[];
};

export type DataPlaneSetVisibilityCommand = {
  type: 'set_visibility';
  requestId: DataPlaneRequestId;
  visible: boolean;
};

export type DataPlaneSetProfileCommand = {
  type: 'set_profile';
  requestId: DataPlaneRequestId;
  profile: RealtimeProfile;
};

export type DataPlaneWorkerIncomingMessage =
  | DataPlaneConnectCommand
  | DataPlaneDisconnectCommand
  | DataPlaneSubscribeCommand
  | DataPlaneUnsubscribeCommand
  | DataPlaneRequestCommand
  | DataPlaneSetVisibilityCommand
  | DataPlaneSetProfileCommand;

/**
 * Guards worker protocol payloads crossing thread boundary.
 */
export function isDataPlaneWorkerOutgoingMessage(payload: unknown): payload is DataPlaneWorkerOutgoingMessage {
  if (!payload || typeof payload !== 'object') return false;

  const type = (payload as { type?: unknown }).type;
  return type === 'ack' || type === 'response' || type === 'event' || type === 'status' || type === 'metrics';
}
