type TelemetryPayload = Record<string, unknown>;

type TelemetryClient = {
  track?: (event: string, payload?: TelemetryPayload) => void;
};

/**
 * Read the current build variant from the global scope for telemetry payloads.
 */
export const getBuildVariant = (): string => {
  if (typeof window !== 'undefined') {
    const variant = (window as Record<string, unknown>).__PS_BUILD_VARIANT__;
    if (typeof variant === 'string' && variant.length > 0) {
      return variant;
    }
  }

  return 'unknown';
};

const getTelemetryClient = (): TelemetryClient | undefined => {
  if (typeof globalThis === 'undefined') return undefined;

  const scope = globalThis as Record<string, unknown>;
  const client =
    (scope.__PS_TELEMETRY__ as TelemetryClient | undefined) ?? (scope.__PS_ANALYTICS__ as TelemetryClient | undefined);

  if (client && typeof client.track === 'function') {
    return client;
  }

  return undefined;
};

const shouldEnableTelemetryStub = (search?: string): boolean => {
  const params = new URLSearchParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''));
  const value = params.get('telemetryStub');
  if (value === null) return false;
  return value !== '0' && value.toLowerCase() !== 'false';
};

/**
 * Registers a console-based telemetry stub when the `telemetryStub` query flag is present.
 * This is intended for local/staging validation and does not affect production telemetry.
 */
export const registerTelemetryStub = (search?: string): void => {
  if (typeof globalThis === 'undefined') return;
  if (!shouldEnableTelemetryStub(search)) return;

  const stub: TelemetryClient = {
    track: (event: string, payload: TelemetryPayload = {}) => {
      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info('[telemetry stub]', event, payload);
      }
    },
  };

  const scope = globalThis as Record<string, unknown>;
  scope.__PS_TELEMETRY__ = stub;
  scope.__PS_ANALYTICS__ = stub;
};

export const trackEvent = (event: string, payload: TelemetryPayload = {}): void => {
  try {
    const client = getTelemetryClient();
    if (client?.track) {
      client.track(event, payload);
      return;
    }
  } catch (error) {
    console.warn('[telemetry] trackEvent failed', error);
    return;
  }

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(`[telemetry] ${event}`, payload);
  }
};

const FEEDBACK_NOTE_MAX_LENGTH = 500;
const ALLOWED_SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
const ALLOWED_CATEGORIES = ['ux', 'performance', 'stability', 'wallet', 'bridge', 'orderBook', 'other'] as const;

export type PilotFeedbackSentiment = (typeof ALLOWED_SENTIMENTS)[number] | 'unspecified';
export type PilotFeedbackCategory = (typeof ALLOWED_CATEGORIES)[number];

export type PilotFeedbackInput = {
  cohort: string;
  sentiment?: string;
  category?: string;
  notes?: string;
  source?: string;
};

const sanitizeText = (value?: string, max = FEEDBACK_NOTE_MAX_LENGTH): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const normalizeSentiment = (sentiment?: string): PilotFeedbackSentiment => {
  if (sentiment && ALLOWED_SENTIMENTS.includes(sentiment.toLowerCase() as (typeof ALLOWED_SENTIMENTS)[number])) {
    return sentiment.toLowerCase() as PilotFeedbackSentiment;
  }
  return 'unspecified';
};

const normalizeCategory = (category?: string): PilotFeedbackCategory => {
  if (category && ALLOWED_CATEGORIES.includes(category.toLowerCase() as PilotFeedbackCategory)) {
    return category.toLowerCase() as PilotFeedbackCategory;
  }
  return 'other';
};

/**
 * Emits structured pilot feedback telemetry using the global analytics client.
 */
export const submitPilotFeedback = (input: PilotFeedbackInput): void => {
  const cohort = sanitizeText(input.cohort, 100);
  if (!cohort) return;

  const payload: TelemetryPayload = {
    cohort,
    sentiment: normalizeSentiment(input.sentiment),
    category: normalizeCategory(input.category),
    buildVariant: getBuildVariant(),
    timestamp: Date.now(),
  };

  const notes = sanitizeText(input.notes);
  if (notes) payload.notes = notes;

  const source = sanitizeText(input.source, 120);
  if (source) payload.source = source;

  trackEvent('pilot_feedback', payload);
};

type PilotFeedbackFieldNames = {
  cohort?: string;
  sentiment?: string;
  category?: string;
  notes?: string;
  source?: string;
};

type PilotFeedbackFormOptions = {
  defaults?: Partial<PilotFeedbackInput>;
  fields?: PilotFeedbackFieldNames;
};

const getFormValue = (data: FormData, field?: string): string | undefined => {
  if (!field) return undefined;
  const value = data.get(field);
  return typeof value === 'string' ? value : undefined;
};

/**
 * Attaches a submit handler to an HTML form that emits pilot feedback telemetry.
 */
export const attachPilotFeedbackForm = (
  form: HTMLFormElement,
  options: PilotFeedbackFormOptions = {}
): (() => void) => {
  if (typeof form?.addEventListener !== 'function') return () => undefined;

  const defaultsWithFieldNames: Required<PilotFeedbackFieldNames> = {
    cohort: 'cohort',
    sentiment: 'sentiment',
    category: 'category',
    notes: 'notes',
    source: 'source',
    ...options.fields,
  };

  const defaults = options.defaults ?? {};

  const handler = (event: Event): void => {
    event.preventDefault();
    const data = new FormData(form);

    submitPilotFeedback({
      cohort: getFormValue(data, defaultsWithFieldNames.cohort) ?? defaults.cohort ?? form.dataset.cohort ?? '',
      sentiment: getFormValue(data, defaultsWithFieldNames.sentiment) ?? defaults.sentiment ?? form.dataset.sentiment,
      category: getFormValue(data, defaultsWithFieldNames.category) ?? defaults.category ?? form.dataset.category,
      notes: getFormValue(data, defaultsWithFieldNames.notes) ?? defaults.notes ?? form.dataset.notes,
      source: getFormValue(data, defaultsWithFieldNames.source) ?? defaults.source ?? form.dataset.source,
    });
  };

  form.addEventListener('submit', handler);

  return () => form.removeEventListener('submit', handler);
};

const bindPilotFeedbackForms = (): void => {
  if (typeof document === 'undefined') return;
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-pilot-feedback]'));
  forms.forEach((form) => {
    if (form.dataset.pilotFeedbackBound === 'true') return;
    form.dataset.pilotFeedbackBound = 'true';

    attachPilotFeedbackForm(form, {
      defaults: {
        cohort: form.dataset.cohort ?? '',
        sentiment: form.dataset.sentiment,
        category: form.dataset.category,
        source: form.dataset.source ?? 'pilot-feedback-form',
      },
    });
  });
};

/**
 * Exposes a global helper for support/pilot forms to submit sanitized feedback without duplicating wiring.
 */
export const registerPilotFeedbackBridge = (): void => {
  if (typeof window === 'undefined') return;
  const scope = window as Record<string, unknown>;
  scope.__PS_SUBMIT_PILOT_FEEDBACK__ = submitPilotFeedback;
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bindPilotFeedbackForms();
  } else {
    window.addEventListener('DOMContentLoaded', bindPilotFeedbackForms, { once: true });
  }
};
