import type { AgentErrorCode, AgentErrorShape } from './types';

/**
 * Error shape thrown by the browser agent API so callers can branch on a
 * stable machine-readable code instead of localized UI copy.
 */
export class PolkaswapAgentError extends Error implements AgentErrorShape {
  public readonly code: AgentErrorCode;
  public readonly details?: unknown;

  constructor(code: AgentErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PolkaswapAgentError';
    this.code = code;
    this.details = details;
  }

  toJSON(): AgentErrorShape {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export function agentError(code: AgentErrorCode, message: string, details?: unknown): PolkaswapAgentError {
  return new PolkaswapAgentError(code, message, details);
}

export function isAgentError(error: unknown): error is PolkaswapAgentError {
  return error instanceof PolkaswapAgentError;
}

export function normalizeAgentError(error: unknown): PolkaswapAgentError {
  if (isAgentError(error)) return error;

  const message = error instanceof Error ? error.message : `${error}`;
  if (message === 'Cancelled') {
    return agentError('SIGNING_CANCELLED', 'Transaction signing was cancelled.');
  }

  return agentError('AGENT_API_UNAVAILABLE', message || 'Polkaswap agent API request failed.');
}
