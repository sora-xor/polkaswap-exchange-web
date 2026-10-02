import { computed, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';
import {
  BUY_XOR_FUNNEL_CONSENT_KEY,
  BUY_XOR_FUNNEL_ROUTES,
  buyXorPrivacyBlocked,
  sendBuyXorFunnelEvent,
  type BuyXorFunnelReason,
  type BuyXorFunnelRoute,
  type BuyXorFunnelStep,
} from '@/features/misc/lib/buyXorFunnel';

/** Reads only an explicit yes/no preference. No consent is inferred from using a wallet or visiting the page. */
function savedConsent(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(BUY_XOR_FUNNEL_CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

/**
 * Per-mounted-page coarse observations, not unique people or transactions.
 * Each fixed event/route/reason tuple is attempted once, avoiding quote polling inflation without an identifier.
 */
export function useBuyXorFunnel(options: {
  enabled: MaybeRefOrGetter<boolean>;
  route: MaybeRefOrGetter<string | null>;
}) {
  const consent = ref(savedConsent());
  const delivery = ref<'disabled' | 'pending' | 'recorded' | 'unavailable'>('disabled');
  const attempted = new Set<string>();
  let generation = 0;
  // Read again for each record as browser signals can change without a Vue notification.
  const privacyBlocked = computed(() => buyXorPrivacyBlocked());

  /** A preference change in another tab applies immediately without transmitting a browser identity. */
  function onStorage(event: StorageEvent): void {
    if (event.key !== null && event.key !== BUY_XOR_FUNNEL_CONSENT_KEY) return;
    consent.value = event.newValue === 'yes';
    generation += 1;
    if (!consent.value) delivery.value = 'disabled';
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  onScopeDispose(() => {
    generation += 1;
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  });

  /** Changes only the anonymous-counts preference; disabling prevents future sends and cancels no wallet action. */
  function setConsent(value: boolean): void {
    consent.value = value === true;
    generation += 1;
    if (!consent.value) delivery.value = 'disabled';
    try {
      window.localStorage.setItem(BUY_XOR_FUNNEL_CONSENT_KEY, consent.value ? 'yes' : 'no');
    } catch {
      // A denied preference store leaves the explicit choice scoped to this mounted page.
    }
  }

  /** Call only at the actual observed step; a submitted hash is not a received/finalized result. */
  async function record(step: BuyXorFunnelStep, reason: BuyXorFunnelReason = 'none'): Promise<void> {
    if (!toValue(options.enabled) || !consent.value || buyXorPrivacyBlocked()) return;
    const source = toValue(options.route);
    const route: BuyXorFunnelRoute = BUY_XOR_FUNNEL_ROUTES.includes(source as BuyXorFunnelRoute)
      ? (source as BuyXorFunnelRoute)
      : 'unset';
    const event = { v: 1 as const, step, route, reason };
    const key = JSON.stringify(event);
    if (attempted.has(key)) return;
    attempted.add(key);
    const request = generation;
    delivery.value = 'pending';
    const result = await sendBuyXorFunnelEvent(event, {
      consent: consent.value,
      privacyBlocked: buyXorPrivacyBlocked(),
      origin: typeof window === 'undefined' ? '' : window.location.origin,
    });
    if (request === generation) delivery.value = result;
  }
  return {
    consent: computed(() => consent.value),
    privacyBlocked,
    delivery: computed(() => delivery.value),
    setConsent,
    record,
  };
}
