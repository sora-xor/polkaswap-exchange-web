import { escapeHtml } from '@/utils/sanitize';

/**
 * Escapes incoming rejection reasons so they can be safely rendered in the
 * confirmation view without leaking unsafe HTML.
 */
export function sanitizeRejectReasons(reasons: readonly string[]): string[] {
  return reasons
    .map((reason) => escapeHtml(reason))
    .filter((reason): reason is string => Boolean(reason && reason.trim().length));
}
