<template>
  <section
    v-if="session.phase === 'complete' && !session.finalists.length"
    class="no-qualified"
    data-testid="discovery-no-qualified"
    :aria-labelledby="titleId"
  >
    <div class="outcome-main">
      <div class="outcome-heading">
        <span class="outcome-signal" aria-hidden="true"><i /></span>
        <div>
          <span class="eyebrow">{{ t('bots.discovery.complete') }}</span>
          <h3 :id="titleId">{{ t('bots.discovery.noQualified') }}</h3>
        </div>
      </div>
      <p v-if="!session.candidates.length" class="outcome-description">{{ t('bots.discovery.noProposals') }}</p>
      <p v-else class="outcome-counts">
        {{ t('bots.discovery.candidates') }} <strong>{{ session.candidates.length }}</strong>
        <span aria-hidden="true">·</span>
        {{ t('bots.discovery.rejected') }} <strong>{{ rejected.length }}</strong>
      </p>
      <p class="holdout-state" data-testid="discovery-no-qualified-holdout">
        <span class="holdout-mark" aria-hidden="true" />{{ holdoutMessage }}
      </p>
      <div class="outcome-actions">
        <button type="button" class="new-search" data-testid="discovery-outcome-new-search" @click="emit('new-run')">
          {{ t('bots.discovery.newRun') }} <span aria-hidden="true">↗</span>
        </button>
        <button
          v-if="skippedCount"
          type="button"
          class="inspect-skips"
          data-testid="discovery-outcome-inspect-skips"
          @click="emit('inspect-skips')"
        >
          {{ t('bots.discovery.skipReasons') }} <span>{{ skippedCount }}</span>
        </button>
      </div>
    </div>

    <div v-if="rejected.length" class="outcome-evidence">
      <p class="evidence-label">{{ t('bots.discovery.rejected') }}</p>
      <ol class="failure-list">
        <li v-for="candidate in rejected.slice(0, 3)" :key="candidate.id" data-testid="discovery-outcome-rejection">
          <div class="failure-heading">
            <strong>{{ pairTitle(candidate.pairKey) }}</strong>
            <span>{{
              t(candidate.reason === 'holdoutGate' ? 'bots.discovery.holdout' : 'bots.discovery.training')
            }}</span>
          </div>
          <ul class="failure-checks">
            <li v-for="check in failedChecks(candidate)" :key="check.label">
              <span>{{ check.label }}</span
              ><strong :title="check.exact">{{ check.observed }}</strong>
            </li>
          </ul>
        </li>
      </ol>
      <details v-if="rejected.length > 3" class="more-failures">
        <summary>+{{ rejected.length - 3 }} {{ t('bots.discovery.rejected') }}</summary>
        <ol class="failure-list">
          <li v-for="candidate in rejected.slice(3)" :key="candidate.id" data-testid="discovery-outcome-rejection">
            <div class="failure-heading">
              <strong>{{ pairTitle(candidate.pairKey) }}</strong>
              <span>{{
                t(candidate.reason === 'holdoutGate' ? 'bots.discovery.holdout' : 'bots.discovery.training')
              }}</span>
            </div>
            <ul class="failure-checks">
              <li v-for="check in failedChecks(candidate)" :key="check.label">
                <span>{{ check.label }}</span
                ><strong :title="check.exact">{{ check.observed }}</strong>
              </li>
            </ul>
          </li>
        </ol>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import { formatExperimentPercent } from '../experiment-visuals';
import {
  rankDiscoveryCandidates,
  type DiscoveryCandidate,
  type DiscoveryMetrics,
  type DiscoverySession,
} from '../discovery';

defineOptions({ name: 'DiscoveryNoQualified' });

/** The parent shows this summary near the top of a completed run and handles its navigation actions. */
const props = defineProps<{
  session: DiscoverySession;
  pairTitle: (key: string) => string;
}>();
const emit = defineEmits<{ 'new-run': []; 'inspect-skips': [] }>();
const { t } = useTranslation();
const titleId = 'discovery-no-qualified-title';
const ZERO = new FPNumber('0', 36);

const rejected = computed(() =>
  rankDiscoveryCandidates(props.session.candidates.filter((item) => item.status === 'rejected'))
);
const skippedCount = computed(() => props.session.pairs.filter((pair) => pair.status === 'skipped').length);
const holdoutMessage = computed(() => {
  if (props.session.holdoutReuse) return t('bots.discovery.holdoutReused');
  if (props.session.feedbackExploratory) return t('bots.discovery.feedbackExploratory');
  if (props.session.candidates.some((item) => item.holdoutState === 'exposed'))
    return t('bots.discovery.holdoutInterruptedOutcome');
  if (props.session.candidates.some((item) => item.holdoutState === 'complete'))
    return t('bots.discovery.holdoutCheckedOutcome');
  return t('bots.discovery.holdoutUntouchedOutcome');
});

interface FailedCheck {
  label: string;
  observed: string;
  exact: string;
}

/** Show the gate's observed value beside every failed condition, using decimal rather than floating-point token math. */
function failedChecks(candidate: DiscoveryCandidate): FailedCheck[] {
  const gate = candidate.reason;
  if (gate !== 'trainingGate' && gate !== 'holdoutGate') {
    return gate ? [{ label: t(`bots.discovery.reason.${gate}`), observed: '', exact: '' }] : [];
  }
  const metrics: DiscoveryMetrics | undefined = gate === 'holdoutGate' ? candidate.holdout : candidate.training;
  if (!metrics) return [{ label: t(`bots.discovery.reason.${gate}`), observed: '', exact: '' }];
  const checks: FailedCheck[] = [];
  const minimumTrades = gate === 'holdoutGate' ? 5 : 10;
  if (metrics.coverage !== 1) {
    const percent = `${Math.floor(metrics.coverage * 10_000) / 100}%`;
    checks.push({
      label: t('bots.discovery.reason.coverage'),
      observed: `${percent} / 100%`,
      exact: String(metrics.coverage),
    });
  }
  if (!new FPNumber(metrics.returnPercent, 36).gt(ZERO)) {
    checks.push({
      label: t('bots.discovery.reason.netReturn'),
      observed: `${formatExperimentPercent(metrics.returnPercent)}% ≤ 0%`,
      exact: `${metrics.returnPercent}%`,
    });
  }
  if (metrics.excessReturnPercent === null || !new FPNumber(metrics.excessReturnPercent, 36).gt(ZERO)) {
    checks.push({
      label: t('bots.discovery.reason.holding'),
      observed:
        metrics.excessReturnPercent === null ? '—' : `${formatExperimentPercent(metrics.excessReturnPercent)}% ≤ 0%`,
      exact: metrics.excessReturnPercent === null ? '—' : `${metrics.excessReturnPercent}%`,
    });
  }
  if (metrics.trades < minimumTrades) {
    checks.push({
      label: t('bots.discovery.reason.tradeMinimum', { count: minimumTrades }),
      observed: `${metrics.trades} / ${minimumTrades}`,
      exact: String(metrics.trades),
    });
  }
  if (new FPNumber(metrics.drawdownPercent, 36).gt(new FPNumber(props.session.maxDrawdownPercent, 36))) {
    checks.push({
      label: t('bots.discovery.reason.drawdown'),
      observed: `${formatExperimentPercent(metrics.drawdownPercent)}% > ${props.session.maxDrawdownPercent}%`,
      exact: `${metrics.drawdownPercent}%`,
    });
  }
  return checks.length ? checks : [{ label: t(`bots.discovery.reason.${gate}`), observed: '', exact: '' }];
}
</script>

<style scoped lang="scss">
.no-qualified {
  --surface: var(--bot-surface, var(--s-color-utility-surface));
  --recess: var(--bot-recess, var(--s-color-base-background));
  --raised: var(--bot-shadow-raised);
  --inset: var(--bot-shadow-inset);
  --muted: var(--bot-muted, var(--s-color-base-content-secondary));
  --ink: var(--s-color-base-content-primary);
  --accent: var(--bot-accent, var(--s-color-action-text));
  display: grid;
  grid-template-columns: #{'minmax(0, 0.9fr)'} #{'minmax(0, 1.1fr)'};
  gap: clamp(24px, 3vw, 44px);
  min-width: 0;
  margin: 24px 0;
  padding: clamp(22px, 3vw, 36px);
  border-radius: 26px;
  background: var(--recess);
  box-shadow: var(--inset);
  color: var(--ink);
  animation: outcome-enter 420ms ease-out both;
}
.outcome-main,
.outcome-evidence {
  min-width: 0;
}
.outcome-heading {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.outcome-signal {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--raised);
}
.outcome-signal i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--s-color-status-warning-text);
}
.eyebrow,
.evidence-label {
  display: block;
  margin: 1px 0 6px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
h3 {
  margin: 0;
  font-size: clamp(23px, 2.2vw, 31px);
  letter-spacing: -0.045em;
  line-height: 1.1;
}
.outcome-description,
.outcome-counts {
  margin: 19px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}
.outcome-counts strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.outcome-counts span {
  margin: 0 8px;
}
.holdout-state {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.holdout-mark {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--accent);
}
.outcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}
button {
  min-height: 40px;
  padding: 8px 14px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}
button:hover {
  transform: translateY(-2px);
}
button:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.new-search {
  background: var(--accent);
  color: var(--s-color-utility-white, #fff);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--accent) 24%, transparent);
}
.new-search span {
  margin-inline-start: 8px;
}
.inspect-skips {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--raised);
}
.inspect-skips span {
  margin-inline-start: 8px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.evidence-label {
  margin: 0 0 10px;
}
.failure-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.failure-list > li {
  padding: 11px 0;
  border-top: 1px solid var(--bot-border, var(--s-color-base-border-secondary));
}
.failure-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 12px;
}
.failure-heading strong {
  overflow-wrap: anywhere;
}
.failure-heading span {
  flex: none;
  color: var(--muted);
  font-size: 10px;
}
.failure-checks {
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}
.failure-checks li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}
.failure-checks strong {
  color: var(--ink);
  font-weight: 700;
  text-align: end;
  font-variant-numeric: tabular-nums;
}
.more-failures {
  border-top: 1px solid var(--bot-border, var(--s-color-base-border-secondary));
}
.more-failures summary {
  padding: 11px 0;
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}
@keyframes outcome-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 850px) {
  .no-qualified {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .no-qualified {
    animation: none;
  }
  button {
    transition: none;
  }
}
</style>
