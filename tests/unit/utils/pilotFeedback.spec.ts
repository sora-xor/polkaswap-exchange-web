import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as telemetry from '@/utils/telemetry';

describe('submitPilotFeedback', () => {
  const track = vi.fn();

  beforeEach(() => {
    track.mockReset();
    (globalThis as Record<string, unknown>).__PS_TELEMETRY__ = { track };
    (window as Record<string, unknown>).__PS_BUILD_VARIANT__ = 'vue3-native';
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__PS_TELEMETRY__;
    delete (globalThis as Record<string, unknown>).__PS_ANALYTICS__;
    delete (window as Record<string, unknown>).__PS_BUILD_VARIANT__;
  });

  it('emits sanitized payload with allowed values', () => {
    telemetry.submitPilotFeedback({
      cohort: ' Pilot Cohort A ',
      sentiment: 'positive',
      category: 'performance',
      notes: 'Loved the flow.',
      source: 'support-form',
    });

    expect(track).toHaveBeenCalledWith('pilot_feedback', {
      cohort: 'Pilot Cohort A',
      sentiment: 'positive',
      category: 'performance',
      notes: 'Loved the flow.',
      source: 'support-form',
      buildVariant: 'vue3-native',
      timestamp: expect.any(Number),
    });
  });

  it('normalizes invalid values and truncates notes', () => {
    telemetry.submitPilotFeedback({
      cohort: 'Beta',
      sentiment: 'amazing',
      category: 'unknown',
      notes: 'x'.repeat(600),
    });

    expect(track).toHaveBeenCalledWith('pilot_feedback', {
      cohort: 'Beta',
      sentiment: 'unspecified',
      category: 'other',
      notes: 'x'.repeat(500),
      buildVariant: 'vue3-native',
      timestamp: expect.any(Number),
    });
  });

  it('skips emission when cohort is missing', () => {
    telemetry.submitPilotFeedback({
      cohort: '   ',
      notes: 'No cohort should skip event.',
    });

    expect(track).not.toHaveBeenCalled();
  });
});

describe('registerPilotFeedbackBridge', () => {
  it('exposes a global helper that funnels through telemetry', () => {
    const track = vi.fn();
    (globalThis as Record<string, unknown>).__PS_TELEMETRY__ = { track };
    telemetry.registerPilotFeedbackBridge();

    const submit = (window as Record<string, any>).__PS_SUBMIT_PILOT_FEEDBACK__;
    expect(typeof submit).toBe('function');

    submit({ cohort: 'Pilot 1', sentiment: 'neutral', notes: 'works' });

    expect(track).toHaveBeenCalledWith(
      'pilot_feedback',
      expect.objectContaining({
        cohort: 'Pilot 1',
        sentiment: 'neutral',
      })
    );

    delete (globalThis as Record<string, unknown>).__PS_TELEMETRY__;
    delete (window as Record<string, unknown>).__PS_SUBMIT_PILOT_FEEDBACK__;
  });

  it('binds forms marked with data-pilot-feedback automatically', () => {
    const track = vi.fn();
    (globalThis as Record<string, unknown>).__PS_TELEMETRY__ = { track };
    (window as Record<string, unknown>).__PS_BUILD_VARIANT__ = 'vue3-native';
    document.body.innerHTML = `
      <form data-pilot-feedback data-cohort="Cohort X" data-source="support-form">
        <input type="text" name="sentiment" value="neutral" />
        <textarea name="notes">hello</textarea>
      </form>
    `;

    telemetry.registerPilotFeedbackBridge();
    const form = document.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(track).toHaveBeenCalledWith(
      'pilot_feedback',
      expect.objectContaining({
        cohort: 'Cohort X',
        sentiment: 'neutral',
        source: 'support-form',
        notes: 'hello',
      })
    );

    delete (globalThis as Record<string, unknown>).__PS_TELEMETRY__;
    delete (window as Record<string, unknown>).__PS_SUBMIT_PILOT_FEEDBACK__;
    delete (window as Record<string, unknown>).__PS_BUILD_VARIANT__;
  });
});
