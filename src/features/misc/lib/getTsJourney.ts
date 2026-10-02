import type { GetTsPurpose, GetTsSource, GetTsStep } from './getTsFlow';
import type { GetTsPlan } from './getTsPlan';

export type GetTsJourneyStage = 'card' | 'ton' | 'conversion' | 'bridge' | 'swap' | 'burn';
export type GetTsJourneyStatus =
  | 'next'
  | 'current'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'unavailable'
  | 'check'
  | 'reported'
  | 'existing';
export interface GetTsJourneyItem {
  id: GetTsJourneyStage;
  step: GetTsStep;
  status: GetTsJourneyStatus;
  reference?: string;
}
interface ReceiptProgress {
  state: string;
  reference?: string;
}
export interface GetTsJourneyInput {
  source: GetTsSource | null;
  purpose: GetTsPurpose;
  plan: GetTsPlan;
  activeStep: GetTsStep;
  contextReady: Record<'card' | 'conversion' | 'bridge' | 'swap', boolean>;
  cardConversion: boolean;
  cardReported: boolean;
  tonOnEthereum: boolean;
  conversion: ReceiptProgress;
  bridge: ReceiptProgress;
  swap: ReceiptProgress;
}

/** A reference is a recovery pointer; only matching, current-account receipt evidence can confirm it. */
function receiptStatus(reference: string | undefined, progress: ReceiptProgress, ready: boolean): GetTsJourneyStatus {
  if (!reference) return 'next';
  if (!ready || progress.reference !== reference || progress.state === 'unavailable') return 'unavailable';
  if (progress.state === 'received') return 'confirmed';
  if (progress.state === 'failed') return 'failed';
  return 'pending';
}

/** Read-only purchase milestones. Navigation, balances and checkout hints never imply receipt of funds. */
export function getTsJourney(input: GetTsJourneyInput): GetTsJourneyItem[] {
  const { source, purpose, plan, activeStep } = input;
  if (!source || (source === 'xor' && purpose === 'xor')) return [];
  const items: GetTsJourneyItem[] = [];
  const external = source === 'card' || source === 'ethereum' || source === 'ton';
  if (source === 'card') {
    items.push({
      id: 'card',
      step: 'fund',
      status:
        input.cardReported && input.contextReady.card
          ? 'reported'
          : plan.cardDraft ||
              plan.references.conversion ||
              plan.bridgeDraft ||
              plan.references.bridge ||
              plan.swapDraft ||
              plan.references.swap
            ? 'check'
            : input.cardConversion
              ? 'existing'
              : activeStep === 'fund'
                ? 'current'
                : 'next',
    });
  }
  if (source === 'ton') {
    items.push({
      id: 'ton',
      step: 'fund',
      status:
        input.tonOnEthereum ||
        plan.references.conversion ||
        plan.bridgeDraft ||
        plan.references.bridge ||
        plan.references.swap
          ? 'check'
          : activeStep === 'fund'
            ? 'current'
            : 'next',
    });
  }
  const stages: Array<[GetTsJourneyStage, GetTsStep]> = [];
  if (external && plan.paymentAsset !== 'dai-ethereum') stages.push(['conversion', 'fund']);
  if (external) stages.push(['bridge', 'bridge']);
  if (source !== 'xor') stages.push(['swap', 'swap']);
  if (purpose === 'ts') stages.push(['burn', 'burn']);
  for (const [id, step] of stages) {
    const reference = plan.references[id as keyof GetTsPlan['references']];
    let status: GetTsJourneyStatus;
    if (id === 'burn') status = reference ? 'check' : 'next';
    else
      status = receiptStatus(
        reference,
        input[id as 'conversion' | 'bridge' | 'swap'],
        input.contextReady[id as 'conversion' | 'bridge' | 'swap']
      );
    if (!reference && ((id === 'bridge' && plan.bridgeDraft) || (id === 'swap' && plan.swapDraft))) status = 'check';
    const fundingCurrent =
      step !== 'fund' ||
      ((source !== 'card' || input.cardConversion || !!plan.references.conversion) &&
        (source !== 'ton' || input.tonOnEthereum || !!plan.references.conversion));
    if (status === 'next' && step === activeStep && fundingCurrent) status = 'current';
    items.push({ id, step, status, ...(reference ? { reference } : {}) });
  }
  return items;
}
