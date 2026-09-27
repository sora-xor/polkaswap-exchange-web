<template>
  <main class="community-store" :aria-busy="loading" data-testid="community-store">
    <component :is="RefundRehearsal" v-if="RefundRehearsal" />
    <header class="store-heading">
      <p class="store-eyebrow">{{ t('communityStore.eyebrow') }}</p>
      <a class="store-text-link" href="#store-recovery" @click.prevent="showRecovery">{{
        t('communityStore.recoverTitle')
      }}</a>
    </header>

    <section class="store-product" aria-labelledby="store-product-title">
      <StoreProductGallery />
      <div class="store-product__copy">
        <p class="store-eyebrow">{{ t('communityStore.collection') }}</p>
        <h1 id="store-product-title">{{ t('communityStore.product') }}<span aria-hidden="true">.</span></h1>
        <p class="store-product__origin">{{ t('communityStore.origin') }}</p>
        <p class="store-product__description">{{ t('communityStore.description') }}</p>

        <div class="store-price">
          <p class="store-eyebrow">{{ t('communityStore.payInXor') }}</p>
          <p class="store-price__amount">{{ catalog?.product.priceXor || STORE_TEA_UNIT_XOR }} <span>XOR</span></p>
        </div>

        <div class="store-buy-row">
          <div class="store-quantity" role="group" :aria-label="t('communityStore.quantity')">
            <button
              type="button"
              :aria-label="t('communityStore.decreaseQuantity')"
              :disabled="quantity <= 1 || !!order"
              @click="quantity--"
            >
              −
            </button>
            <output :aria-label="t('communityStore.quantity')">{{ quantity }}</output>
            <button
              type="button"
              :aria-label="t('communityStore.increaseQuantity')"
              :disabled="!canIncrease"
              @click="quantity++"
            >
              +
            </button>
          </div>
          <button
            class="store-primary"
            type="button"
            :disabled="!canCheckout || !!order"
            data-testid="store-checkout"
            @click="beginCheckout"
          >
            {{
              loading
                ? t('communityStore.loading')
                : canCheckout
                  ? t('communityStore.startCheckout')
                  : t('communityStore.comingSoon')
            }}
            <span v-if="canCheckout" aria-hidden="true">↗</span>
          </button>
        </div>
        <p v-if="!isAvailable && !loading" class="store-note" data-testid="store-launch-pending">
          {{ t('communityStore.launchPending') }}
        </p>
        <p class="store-note">{{ t('communityStore.sourcedOnDemand') }}</p>
        <p class="store-note">{{ t('communityStore.shippingSeparate') }}</p>
      </div>
    </section>

    <p v-if="error" class="store-error" role="alert">{{ error }}</p>

    <Transition name="store-reveal">
      <section
        v-if="checkoutOpen && !order"
        ref="checkoutSection"
        class="store-checkout store-section"
        aria-labelledby="store-checkout-title"
        tabindex="-1"
      >
        <div class="store-section-heading">
          <div>
            <p class="store-eyebrow">01 / {{ t('communityStore.privateNotice') }}</p>
            <h2 id="store-checkout-title">{{ t('communityStore.checkoutTitle') }}</h2>
          </div>
          <button class="store-text-link" type="button" @click="checkoutOpen = false">
            {{ t('communityStore.backToProduct') }}
          </button>
        </div>
        <p class="store-checkout__intro">{{ t('communityStore.checkoutIntro') }}</p>
        <form ref="checkoutForm" class="store-checkout__grid" @submit.prevent="submitOrder">
          <div class="store-fields">
            <label class="store-field store-field--full" for="store-country"
              ><span>{{ t('communityStore.country') }}</span>
              <select
                id="store-country"
                v-model="shipping.country"
                required
                autocomplete="shipping country"
                :disabled="busy"
              >
                <option value="" disabled>{{ t('communityStore.chooseCountry') }}</option>
                <option v-for="country in countries" :key="country.code" :value="country.code">
                  {{ country.name }}
                </option>
              </select>
            </label>
            <p class="store-note store-field--full">
              {{ t('communityStore.noDestination') }}
              <a :href="supportHref" target="_blank" rel="noopener noreferrer">{{
                t('communityStore.support', { handle: supportHandle })
              }}</a>
            </p>
            <label class="store-field store-field--full" for="store-name"
              ><span>{{ t('communityStore.fullName') }}</span
              ><input
                id="store-name"
                v-model.trim="shipping.name"
                autocomplete="shipping name"
                maxlength="120"
                required
                :disabled="busy"
            /></label>
            <label class="store-field store-field--full" for="store-address1"
              ><span>{{ t('communityStore.address1') }}</span
              ><input
                id="store-address1"
                v-model.trim="shipping.address1"
                autocomplete="shipping address-line1"
                maxlength="160"
                required
                :disabled="busy"
            /></label>
            <label class="store-field store-field--full" for="store-address2"
              ><span>{{ t('communityStore.address2') }}</span
              ><input
                id="store-address2"
                v-model.trim="shipping.address2"
                autocomplete="shipping address-line2"
                maxlength="160"
                :disabled="busy"
            /></label>
            <label class="store-field" for="store-city"
              ><span>{{ t('communityStore.city') }}</span
              ><input
                id="store-city"
                v-model.trim="shipping.city"
                autocomplete="shipping address-level2"
                maxlength="100"
                required
                :disabled="busy"
            /></label>
            <label class="store-field" for="store-region"
              ><span>{{ t('communityStore.region') }}</span
              ><input
                id="store-region"
                v-model.trim="shipping.region"
                autocomplete="shipping address-level1"
                maxlength="100"
                :disabled="busy"
            /></label>
            <label class="store-field store-field--full" for="store-postal"
              ><span>{{ t('communityStore.postalCode') }}</span
              ><input
                id="store-postal"
                v-model.trim="shipping.postalCode"
                autocomplete="shipping postal-code"
                maxlength="24"
                :disabled="busy"
            /></label>
            <label class="store-field" for="store-contact-kind"
              ><span>{{ t('communityStore.contactMethod') }}</span
              ><select id="store-contact-kind" v-model="contact.kind" :disabled="busy">
                <option value="email">{{ t('communityStore.email') }}</option>
                <option value="telegram">{{ t('communityStore.telegram') }}</option>
              </select></label
            >
            <label class="store-field" for="store-contact"
              ><span>{{
                t(contact.kind === 'email' ? 'communityStore.emailAddress' : 'communityStore.telegramHandle')
              }}</span
              ><input
                id="store-contact"
                v-model.trim="contact.value"
                :type="contact.kind === 'email' ? 'email' : 'text'"
                :autocomplete="contact.kind === 'email' ? 'email' : 'off'"
                :pattern="contact.kind === 'telegram' ? '@?[A-Za-z][A-Za-z0-9_]{4,31}' : undefined"
                maxlength="254"
                required
                :disabled="busy"
            /></label>
            <p v-if="contact.kind === 'telegram'" class="store-note store-field--full">
              {{ t('communityStore.telegramHint') }}
            </p>
          </div>
          <aside class="store-order-review" aria-labelledby="store-review-title">
            <h3 id="store-review-title">{{ t('communityStore.reviewTitle') }}</h3>
            <p>
              {{ t('communityStore.product') }}<br /><span class="store-note">{{ t('communityStore.origin') }}</span>
            </p>
            <template v-if="quote">
              <dl class="store-totals">
                <div>
                  <dt>{{ t('communityStore.itemsTotal', { quantity, price: quote.unitXor }) }}</dt>
                </div>
                <div>
                  <dt>{{ quote.shippingLabel || t('communityStore.shipping') }}</dt>
                  <dd>{{ quote.shippingXor }} XOR</dd>
                </div>
                <div class="store-totals__total">
                  <dt>{{ t('communityStore.total') }}</dt>
                  <dd>{{ quote.totalXor }} XOR</dd>
                </div>
              </dl>
              <p class="store-note">{{ t('communityStore.networkFee') }}</p>
            </template>
            <p v-else class="store-note">
              {{ t(shipping.country ? 'communityStore.noShippingRate' : 'communityStore.selectDestination') }}
            </p>
            <p v-if="isConnected" class="store-note store-wallet">
              {{ t('communityStore.connectedWallet') }}<br /><span>{{ walletAddress }}</span>
            </p>
            <label class="store-consent"
              ><input v-model="consent" type="checkbox" required :disabled="busy" /><span
                >{{ t('communityStore.termsAgree') }}
                <a href="#store-terms" @click.prevent="scrollToTerms">{{ t('communityStore.privacyTitle') }}</a></span
              ></label
            >
            <button v-if="!isConnected" type="button" class="store-primary" @click="connectWallet">
              {{ t('communityStore.connectWallet') }}
            </button>
            <button
              v-else
              type="submit"
              class="store-primary"
              :disabled="busy || !quote || !consent"
              data-testid="store-save-order"
            >
              {{ t(busy ? 'communityStore.savingOrder' : 'communityStore.saveOrder') }}
            </button>
            <p v-if="formError" class="store-error" role="alert">{{ formError }}</p>
          </aside>
        </form>
      </section>
    </Transition>

    <section
      v-if="order"
      ref="receiptSection"
      class="store-receipt store-section"
      tabindex="-1"
      aria-labelledby="store-receipt-title"
      data-testid="store-receipt"
    >
      <div class="store-section-heading">
        <div>
          <p class="store-eyebrow">{{ t('communityStore.receiptTitle') }}</p>
          <h2 id="store-receipt-title">{{ t(statusKey) }}</h2>
        </div>
        <button type="button" class="store-text-link" :disabled="busy" @click="refreshOrder">
          {{ t('communityStore.refreshOrder') }} ↻
        </button>
      </div>
      <p class="store-receipt__intro" role="status">{{ statusDescription }}</p>
      <div class="store-receipt__grid">
        <div>
          <dl class="store-receipt__details">
            <div>
              <dt>{{ t('communityStore.orderId') }}</dt>
              <dd>{{ order.orderId }}</dd>
            </div>
            <div>
              <dt>{{ t('communityStore.total') }}</dt>
              <dd>{{ fromCodec(order.paymentRequest.amountCodec, order.paymentRequest.decimals) }} XOR</dd>
            </div>
          </dl>
          <p
            v-if="
              !['refund_pending', 'refunded'].includes(status) ||
              (status === 'refunded' && order.refund?.agreedDeduction)
            "
            class="store-note"
            data-testid="store-order-refund-policy"
          >
            {{ orderRefundPolicyText }}
          </p>
          <p v-if="refundFigures.length" class="store-note">{{ t('communityStore.refundTransaction') }}</p>
          <dl v-if="refundFigures.length" class="store-receipt__details" data-testid="store-refund-breakdown">
            <div v-for="figure in refundFigures" :key="figure.label">
              <dt>{{ t(figure.label) }}</dt>
              <dd>{{ fromCodec(figure.amount, order.paymentRequest.decimals) }} XOR</dd>
            </div>
          </dl>
          <details class="store-recovery-code">
            <summary>{{ t('communityStore.recoveryToken') }}</summary>
            <code>{{ order.recoveryToken }}</code>
            <p class="store-note">{{ t('communityStore.recoveryKeep') }}</p>
          </details>
          <button type="button" class="store-text-link" data-testid="store-download-receipt" @click="downloadReceipt">
            {{ t('communityStore.downloadReceipt') }} ↓
          </button>
          <button
            v-if="canStartNewOrder"
            type="button"
            class="store-secondary"
            data-testid="store-new-order"
            @click="startNewOrder"
          >
            {{ t('communityStore.newOrder') }}
          </button>
          <p
            v-if="['paid', 'shipping_review', 'shipped', 'refund_pending', 'refunded'].includes(status)"
            class="store-note"
          >
            {{
              t(
                order.notificationStatus === 'delivered'
                  ? 'communityStore.notified'
                  : 'communityStore.notificationPending'
              )
            }}
          </p>
          <dl v-if="order.receipt || order.tracking || order.refund?.transactionHash" class="store-receipt__details">
            <div v-if="order.receipt">
              <dt>{{ t('communityStore.transaction') }}</dt>
              <dd>{{ order.receipt.evidence.transactionHash }}</dd>
            </div>
            <div v-if="order.tracking">
              <dt>{{ t('communityStore.tracking') }}</dt>
              <dd>{{ order.tracking }}</dd>
            </div>
            <div v-if="order.refund?.transactionHash">
              <dt>{{ t('communityStore.refundTransaction') }}</dt>
              <dd>{{ order.refund.transactionHash }}</dd>
            </div>
          </dl>
          <p class="store-note">
            <a :href="supportHref" target="_blank" rel="noopener noreferrer">{{
              t('communityStore.support', { handle: supportHandle })
            }}</a>
          </p>
        </div>
        <div v-if="status === 'awaiting_payment'" class="store-receipt__payment">
          <h3>{{ t('communityStore.paymentTitle') }}</h3>
          <p class="store-note">{{ t('communityStore.paymentIntro') }}</p>
          <p class="store-note">{{ t('communityStore.expiresAt', { time: expiryLabel }) }}</p>
          <SoraPayCheckout :key="order.orderId" :mount-payment="createPayment" />
        </div>
      </div>
    </section>

    <section class="store-story store-section" aria-labelledby="store-story-title">
      <div>
        <p class="store-eyebrow">{{ t('communityStore.origin') }}</p>
        <h2 id="store-story-title">{{ t('communityStore.detailsTitle') }}</h2>
        <p>{{ t('communityStore.detailsBody') }}</p>
        <p class="store-note">{{ t('communityStore.storage') }}</p>
      </div>
      <div class="store-brewing">
        <h3>{{ t('communityStore.brewTitle') }}</h3>
        <ol>
          <li><span aria-hidden="true">01</span>{{ t('communityStore.brewWater') }}</li>
          <li><span aria-hidden="true">02</span>{{ t('communityStore.brewLeaves') }}</li>
          <li><span aria-hidden="true">03</span>{{ t('communityStore.brewTime') }}</li>
        </ol>
      </div>
    </section>

    <section
      id="store-terms"
      ref="termsSection"
      class="store-terms store-section"
      tabindex="-1"
      :aria-label="t('communityStore.privacyTitle')"
    >
      <div>
        <h3>{{ t('communityStore.shippingTitle') }}</h3>
        <p>{{ t('communityStore.shippingBody') }}</p>
        <p v-if="catalog">{{ catalog.merchant.dispatchPolicy }}</p>
        <p v-if="catalog">{{ catalog.merchant.customsPolicy }}</p>
      </div>
      <div>
        <h3>{{ t('communityStore.refundTitle') }}</h3>
        <p>{{ catalog?.merchant.cancellationPolicy || t('communityStore.refundBody') }}</p>
      </div>
      <div>
        <h3>{{ t('communityStore.operatorTitle') }}</h3>
        <template v-if="catalog"
          ><p>{{ catalog.merchant.operatorName }}<br />{{ catalog.merchant.name }}</p>
          <details>
            <summary>{{ t('communityStore.privacyTitle') }}</summary>
            <p>{{ catalog.merchant.privacyPolicy }}</p>
          </details></template
        >
        <p v-else>{{ t('communityStore.operatorPending') }}</p>
        <p>
          <a :href="supportHref" target="_blank" rel="noopener noreferrer">{{
            t('communityStore.support', { handle: supportHandle })
          }}</a>
        </p>
      </div>
    </section>

    <section
      id="store-recovery"
      ref="recoverySection"
      class="store-recover store-section"
      tabindex="-1"
      aria-labelledby="store-recover-title"
    >
      <div>
        <h3 id="store-recover-title">{{ t('communityStore.recoverTitle') }}</h3>
        <p class="store-note">{{ t('communityStore.recoverBody') }}</p>
      </div>
      <form class="store-recover__form" @submit.prevent="submitRecovery">
        <label class="store-field" for="store-recover-id"
          ><span>{{ t('communityStore.orderId') }}</span
          ><input
            id="store-recover-id"
            v-model.trim="recoveryId"
            autocomplete="off"
            spellcheck="false"
            maxlength="128"
            required
            :disabled="busy"
        /></label>
        <label class="store-field" for="store-recover-token"
          ><span>{{ t('communityStore.recoveryToken') }}</span
          ><input
            id="store-recover-token"
            v-model.trim="recoveryToken"
            type="password"
            autocomplete="off"
            maxlength="256"
            required
            :disabled="busy"
        /></label>
        <button class="store-secondary" type="submit" :disabled="busy || !recoveryId || !recoveryToken">
          {{ t(busy ? 'communityStore.recovering' : 'communityStore.recoverAction') }}
        </button>
        <p v-if="recoveryError" class="store-error" role="alert">{{ recoveryError }}</p>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { fromCodec } from '@sora/sora-pay/core';
import { computed, defineAsyncComponent, nextTick, onMounted, reactive, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { STORE_SUPPORT_TELEGRAM, STORE_TEA_UNIT_XOR } from '@/features/store/client';
import SoraPayCheckout from '@/features/store/components/SoraPayCheckout.vue';
import StoreProductGallery from '@/features/store/components/StoreProductGallery.vue';
import { useCommunityStore } from '@/features/store/useCommunityStore';

// Production constant folding removes this import and the entire private rehearsal surface.
const RefundRehearsal =
  import.meta.env.DEV &&
  import.meta.env.MODE === 'store-rehearsal' &&
  import.meta.env.VITE_STORE_REFUND_REHEARSAL === '1'
    ? defineAsyncComponent(() => import('../rehearsal/RefundRehearsal.vue'))
    : null;

const { t, language } = useTranslation();
const {
  catalog,
  loading,
  busy,
  error,
  isAvailable,
  order,
  status,
  isConnected,
  walletAddress,
  connectWallet,
  refreshCatalog,
  createOrder,
  getQuote,
  refreshOrder,
  recoverOrder,
  createPayment,
  resetOrder,
} = useCommunityStore();
const quantity = ref(1);
const checkoutOpen = ref(false);
const consent = ref(false);
const formError = ref('');
const recoveryError = ref('');
const canStartNewOrder = computed(
  () =>
    !!order.value &&
    (['shipped', 'refunded'].includes(order.value.status) ||
      (order.value.status === 'expired' && !order.value.paymentPending))
);
const recoveryId = ref('');
const recoveryToken = ref('');
const checkoutForm = ref<HTMLFormElement | null>(null);
const checkoutSection = ref<HTMLElement | null>(null);
const receiptSection = ref<HTMLElement | null>(null);
const termsSection = ref<HTMLElement | null>(null);
const recoverySection = ref<HTMLElement | null>(null);
const shipping = reactive({ name: '', country: '', address1: '', address2: '', city: '', region: '', postalCode: '' });
const contact = reactive<{ kind: 'email' | 'telegram'; value: string }>({ kind: 'email', value: '' });
const canCheckout = computed(() => isAvailable.value && !!catalog.value);
const maxQuantity = computed(() => {
  if (!catalog.value) return 1;
  const maxWeight = Math.max(0, ...catalog.value.shipping.map((rate) => rate.maxGrams));
  return Math.min(
    300,
    Math.max(
      1,
      Math.floor((maxWeight - (catalog.value.product.packagingGrams ?? 0)) / catalog.value.product.packedGrams)
    )
  );
});
const canIncrease = computed(() => !order.value && quantity.value < maxQuantity.value);
const quote = computed(() => getQuote(quantity.value, shipping.country));
const supportHandle = `@${STORE_SUPPORT_TELEGRAM}`;
const supportHref = `https://t.me/${STORE_SUPPORT_TELEGRAM}`;
const countries = computed(() => {
  const codes = [...new Set(catalog.value?.shipping.flatMap((rate) => rate.countries) ?? [])];
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([language.value || 'en'], { type: 'region' });
  } catch {
    /* Country codes remain usable in unsupported locales. */
  }
  return codes
    .map((code) => ({ code, name: displayNames?.of(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name));
});
const expiryLabel = computed(() =>
  order.value ? new Date(order.value.paymentRequest.expiresAt).toLocaleString(language.value || 'en') : ''
);
const statusKey = computed(
  () =>
    ({
      awaiting_payment: 'communityStore.pendingPayment',
      payment_pending: 'communityStore.confirmingPayment',
      paid: 'communityStore.paid',
      shipping_review: 'communityStore.shippingReview',
      shipped: 'communityStore.shipped',
      refund_pending: 'communityStore.refundPending',
      refunded: 'communityStore.refunded',
      expired: 'communityStore.expired',
      review: 'communityStore.review',
    })[status.value] || 'communityStore.statusUnknown'
);
const orderRefundPolicyText = computed(() => {
  const saved = order.value;
  if (saved?.refund?.agreedDeduction)
    return t('communityStore.refundAmendedBody', {
      amount: fromCodec(saved.refund.agreedDeduction.amountCodec, saved.paymentRequest.decimals),
    });
  return t(
    saved?.refundPolicy?.mode === 'net-network-fee' ? 'communityStore.refundBody' : 'communityStore.legacyRefundBody'
  );
});
/** Each breakdown describes the latest transfer; corrections use the relay's outstanding total. */
const refundFigures = computed(() => {
  const figures: Array<{ label: string; amount: string }> = [];
  const refund = order.value?.refund;
  if (refund) {
    figures.push({ label: 'communityStore.refundGross', amount: refund.grossAmountCodec });
    const fee = refund.deductedFeeCodec ?? (refund.feeExempt ? '0' : refund.feeQuote?.feeCodec);
    if (refund.agreedDeduction) {
      figures.push({ label: 'communityStore.refundAgreedDeduction', amount: refund.agreedDeduction.amountCodec });
      if (refund.actualFeeCodec !== undefined)
        figures.push({ label: 'communityStore.refundActualFee', amount: refund.actualFeeCodec });
    } else if (fee !== undefined)
      figures.push({
        label:
          refund.deductedFeeCodec !== undefined || refund.feeExempt
            ? 'communityStore.refundFee'
            : 'communityStore.refundEstimatedFee',
        amount: fee,
      });
    if (refund.amountCodec !== undefined)
      figures.push({
        label: refund.transactionHash ? 'communityStore.refundNet' : 'amountText',
        amount: refund.amountCodec,
      });
  }
  const correction = order.value?.refundFeeCorrectionCodec;
  if (correction && BigInt(correction) > 0n)
    figures.push({ label: 'communityStore.refundRemainder', amount: correction });
  return figures;
});
const statusDescription = computed(() => {
  if (status.value === 'expired') return t('communityStore.expiredBody');
  if (status.value === 'review') return t('communityStore.reviewBody');
  if (status.value === 'payment_pending') return t('communityStore.paymentPendingBody');
  if (status.value === 'refund_pending') return orderRefundPolicyText.value;
  if (status.value === 'refunded')
    return t(
      order.value?.refund?.agreedDeduction ||
        BigInt(order.value?.refundAgreedDeductionsCodec ?? '0') > 0n ||
        order.value?.refundPolicy?.mode === 'net-network-fee'
        ? 'communityStore.refundedBody'
        : 'communityStore.legacyRefundedBody'
    );
  if (status.value === 'paid' || status.value === 'shipping_review') return t('communityStore.paidBody');
  return '';
});

/** Move focus to the next step without putting sensitive state in navigation URLs. */
function focusSection(element: HTMLElement | null): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

/** Open the address step only for an available, configured store. */
async function beginCheckout(): Promise<void> {
  if (!canCheckout.value || order.value) return;
  checkoutOpen.value = true;
  await nextTick();
  focusSection(checkoutSection.value);
}

/** Preserve a downloadable receipt before starting another order after a terminal state. */
async function startNewOrder(): Promise<void> {
  if (!canStartNewOrder.value) return;
  downloadReceipt();
  resetOrder();
  consent.value = false;
  await beginCheckout();
}

/** Persist validated private delivery details before creating a payment widget. */
async function submitOrder(): Promise<void> {
  formError.value = '';
  if (!checkoutForm.value?.reportValidity() || !consent.value) {
    formError.value = t('communityStore.formInvalid');
    return;
  }
  if (!quote.value || !canCheckout.value) {
    formError.value = t('communityStore.noQuote');
    return;
  }
  if (!isConnected.value) {
    connectWallet();
    return;
  }
  await createOrder({ quantity: quantity.value, shipping: { ...shipping }, contact: { ...contact } });
}

/** Recover an existing order using credentials supplied deliberately by the customer. */
async function submitRecovery(): Promise<void> {
  recoveryError.value = '';
  if (!recoveryId.value || !recoveryToken.value) {
    recoveryError.value = t('communityStore.recoverRequired');
    return;
  }
  await recoverOrder(recoveryId.value, recoveryToken.value);
  if (order.value) recoveryToken.value = '';
}

/** Save a portable receipt locally, excluding delivery and contact information. */
function downloadReceipt(): void {
  if (!order.value) return;
  const receipt = {
    orderId: order.value.orderId,
    recoveryToken: order.value.recoveryToken,
    paymentRequest: order.value.paymentRequest,
    status: status.value,
    refundPolicy: order.value.refundPolicy ?? { version: 1, mode: 'full' },
    refund: order.value.refund,
    refundFeeCorrectionCodec: order.value.refundFeeCorrectionCodec ?? '0',
    refundAgreedDeductionsCodec: order.value.refundAgreedDeductionsCodec ?? '0',
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `polkaswap-order-${order.value.orderId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Keep navigation to terms and receipt recovery local to this page. */
function scrollToTerms(): void {
  focusSection(termsSection.value);
}
function showRecovery(): void {
  focusSection(recoverySection.value);
}

watch(
  () => order.value?.orderId,
  async (id) => {
    if (id) {
      checkoutOpen.value = false;
      Object.assign(shipping, {
        name: '',
        country: '',
        address1: '',
        address2: '',
        city: '',
        region: '',
        postalCode: '',
      });
      contact.value = '';
      consent.value = false;
      await nextTick();
      focusSection(receiptSection.value);
    }
  }
);
watch(maxQuantity, (limit) => {
  if (quantity.value > limit) quantity.value = limit;
});
onMounted(refreshCatalog);
</script>

<style scoped lang="scss">
.community-store {
  --store-ink: var(--s-color-base-content-primary, #25242a);
  --store-muted: var(--s-color-base-content-secondary, #79767b);
  --store-line: var(--s-color-base-border-secondary, #e4e1df);
  --store-accent: var(--s-color-theme-accent, #e64a92);
  width: 100%;
  max-width: 1256px;
  margin: 0 auto 28px;
  padding: 30px 36px 48px;
  color: var(--store-ink);
  box-sizing: border-box;
  border-radius: 24px;
  background: var(--s-color-utility-surface, #f4f3f5);
  box-shadow: var(--s-shadow-element, 7px 7px 18px #00000010, -7px -7px 18px #ffffffb3);
  font-size: 14px;
  line-height: 1.6;
}
.community-store * {
  box-sizing: border-box;
}
.community-store h1,
.community-store h2,
.community-store h3,
.community-store p {
  margin: 0;
}
.community-store button,
.community-store input,
.community-store select {
  font: inherit;
}
.community-store button,
.community-store a {
  -webkit-tap-highlight-color: transparent;
}
.community-store a {
  color: inherit;
  text-underline-offset: 4px;
}
.community-store button:focus-visible,
.community-store a:focus-visible,
.community-store summary:focus-visible {
  outline: 2px solid var(--store-accent);
  outline-offset: 5px;
}
.community-store button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.community-store h2 {
  font-size: clamp(25px, 2.8vw, 38px);
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: -0.035em;
}
.community-store h3 {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.025em;
}
.store-heading,
.store-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.store-heading {
  padding-bottom: 30px;
}
.store-eyebrow {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.13em;
  line-height: 1.5;
  text-transform: uppercase;
}
.store-text-link {
  background: none;
  border: 0;
  padding: 4px 0;
  color: var(--store-ink);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 5px;
  text-decoration-color: var(--store-line);
}
.store-product {
  display: grid;
  // Interpolation avoids the global breakpoint helper named minmax.
  grid-template-columns: #{'minmax' }(0, 1.05fr) #{'minmax' }(0, 0.85fr);
  gap: clamp(32px, 5vw, 72px);
  align-items: start;
}
.store-product__copy {
  position: sticky;
  top: 32px;
  padding-top: 28px;
  animation: store-enter 600ms 100ms both ease-out;
}
.store-product h1 {
  font-size: clamp(42px, 5vw, 72px);
  line-height: 0.99;
  font-weight: 500;
  letter-spacing: -0.055em;
  margin: 18px 0;
  max-width: 340px;
}
.store-product h1 span {
  color: var(--store-accent);
}
.store-product__origin {
  font-size: 14px;
}
.store-product__description {
  max-width: 380px;
  margin-top: 22px !important;
  color: var(--store-muted);
  font-size: 14px;
}
.store-price {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--store-line);
}
.store-price__amount {
  font-size: 32px;
  letter-spacing: -0.04em;
  line-height: 1.4;
  margin-top: 6px !important;
  font-variant-numeric: tabular-nums;
}
.store-price__amount span {
  font-size: 17px;
  letter-spacing: 0;
}
.store-buy-row {
  display: flex;
  gap: 12px;
  margin: 26px 0 14px;
}
.store-quantity {
  display: flex;
  align-items: center;
  border: 0;
  border-radius: 12px;
  box-shadow: var(--s-shadow-element-pressed, inset 3px 3px 7px #00000012, inset -3px -3px 7px #ffffffb3);
}
.store-quantity button {
  border: 0;
  padding: 13px 12px;
  background: transparent;
  color: var(--store-ink);
  cursor: pointer;
  font-size: 18px;
}
.store-quantity output {
  min-width: 24px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.store-primary,
.store-secondary {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 14px 18px;
  line-height: 1.4;
  cursor: pointer;
  font-weight: 500;
  transition:
    transform 140ms ease,
    opacity 140ms ease;
}
.store-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: var(--store-accent);
  color: white;
  flex: 1;
  box-shadow: var(--s-shadow-element, 4px 4px 9px #00000016, -4px -4px 9px #ffffffb3);
}
.store-primary:hover:not(:disabled),
.store-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
}
.store-secondary {
  background: var(--s-color-utility-surface, #f4f3f5);
  color: var(--store-ink);
  border: 0;
  box-shadow: var(--s-shadow-element, 4px 4px 9px #00000016, -4px -4px 9px #ffffffb3);
}
.store-note {
  font-size: 12px;
  color: var(--store-muted);
  line-height: 1.7;
}
.store-product__copy > .store-note + .store-note {
  margin-top: 6px;
}
.store-terms summary,
.store-recovery-code summary {
  cursor: pointer;
  text-underline-offset: 3px;
}
.store-section {
  border-top: 1px solid var(--store-line);
  padding-top: 46px;
  margin-top: 56px;
  scroll-margin-top: 32px;
}
.store-section:focus {
  outline: none;
}
.store-section-heading .store-eyebrow {
  margin-bottom: 12px;
  color: var(--store-muted);
}
.store-checkout__intro {
  max-width: 680px;
  color: var(--store-muted);
  margin-top: 22px !important;
}
.store-checkout__grid {
  display: grid;
  grid-template-columns: #{'minmax' }(0, 1.3fr) #{'minmax' }(0, 0.85fr);
  gap: 64px;
  margin-top: 32px;
}
.store-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 18px;
  align-items: start;
}
.store-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  min-width: 0;
}
.store-field--full {
  grid-column: 1 / -1;
}
.store-field input,
.store-field select {
  border: 1px solid transparent;
  background: var(--s-color-base-background, #f1f0f2);
  color: var(--store-ink);
  border-radius: 10px;
  box-shadow: var(--s-shadow-element-pressed, inset 3px 3px 7px #00000010, inset -3px -3px 7px #ffffffb3);
  padding: 11px 12px;
  width: 100%;
  min-height: 46px;
  outline-offset: 2px;
}
.store-field input:focus,
.store-field select:focus {
  outline: 1px solid var(--store-accent);
  border-color: var(--store-accent);
}
.store-order-review {
  align-self: start;
  position: sticky;
  top: 32px;
  border-left: 1px solid var(--store-line);
  padding-left: 34px;
}
.store-order-review > p {
  margin-top: 18px;
}
.store-order-review > .store-primary {
  width: 100%;
}
.store-totals {
  margin: 28px 0 0;
  font-size: 12px;
}
.store-totals > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
}
.store-totals dd {
  margin: 0;
  white-space: nowrap;
}
.store-totals__total {
  border-top: 1px solid var(--store-line);
  margin-top: 14px;
  padding-top: 18px !important;
  font-size: 16px;
  font-weight: 500;
}
.store-wallet span {
  overflow-wrap: anywhere;
  font-family: monospace;
}
.store-consent {
  display: flex;
  gap: 10px;
  align-items: start;
  font-size: 11px;
  color: var(--store-muted);
  margin: 24px 0;
}
.store-consent input {
  accent-color: var(--store-accent);
  flex: none;
  margin-top: 4px;
}
.store-error {
  color: var(--s-color-status-error, #be3555);
  margin-top: 16px !important;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.store-receipt__intro {
  margin-top: 18px !important;
  max-width: 650px;
  color: var(--store-muted);
}
.store-receipt__grid {
  display: grid;
  grid-template-columns: #{'minmax' }(0, 1fr) #{'minmax' }(0, 1fr);
  gap: 64px;
  margin-top: 24px;
}
.store-receipt__details {
  margin-top: 0;
}
.store-receipt__details > div {
  margin-bottom: 16px;
}
.store-receipt__details dt {
  color: var(--store-muted);
  font-size: 12px;
}
.store-receipt__details dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
}
.store-receipt__payment .store-note {
  margin: 12px 0 20px;
}
.store-recovery-code {
  font-size: 12px;
  margin: 18px 0;
  padding: 14px 16px;
  border-radius: 12px;
  box-shadow: var(--s-shadow-element-pressed, inset 3px 3px 7px #00000010, inset -3px -3px 7px #ffffffb3);
}
.store-recovery-code code {
  display: block;
  overflow-wrap: anywhere;
  padding: 12px 0;
}
.store-receipt__grid > div > .store-note {
  margin-top: 16px;
}
.store-story {
  display: grid;
  grid-template-columns: 1fr 0.85fr;
  gap: 90px;
}
.store-story h2 {
  max-width: 350px;
  margin: 14px 0 20px;
}
.store-story p:not(.store-eyebrow) {
  color: var(--store-muted);
  max-width: 510px;
}
.store-story .store-note {
  margin-top: 18px;
}
.store-brewing {
  padding-top: 4px;
}
.store-brewing ol {
  padding: 0;
  margin: 22px 0 0;
  list-style: none;
}
.store-brewing li {
  display: flex;
  gap: 20px;
  padding: 16px 0;
  border-top: 1px solid var(--store-line);
  font-size: 13px;
}
.store-brewing li span {
  color: var(--store-muted);
  font-size: 11px;
  padding-top: 2px;
}
.store-terms {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 38px;
}
.store-terms h3 {
  font-size: 16px;
}
.store-terms p,
.store-terms details {
  font-size: 12px;
  color: var(--store-muted);
  margin-top: 16px;
}
.store-recover {
  display: grid;
  grid-template-columns: 0.8fr 1.5fr;
  gap: 56px;
}
.store-recover .store-note {
  margin-top: 10px;
}
.store-recover__form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.store-recover__form button {
  grid-column: 1 / -1;
  justify-self: start;
  font-size: 12px;
}
.store-reveal-enter-active,
.store-reveal-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.store-reveal-enter-from,
.store-reveal-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
@keyframes store-enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 1100px) {
  .community-store {
    padding: 24px 28px 64px;
  }
  .store-product {
    gap: 32px;
  }
  .store-product__copy {
    padding-top: 8px;
  }
  .store-product__description {
    margin-top: 16px !important;
  }
  .store-price {
    margin-top: 22px;
    padding-top: 18px;
  }
  .store-checkout__grid,
  .store-receipt__grid {
    gap: 32px;
  }
  .store-story {
    gap: 40px;
  }
  .store-order-review {
    padding-left: 24px;
  }
}
@media (max-width: 760px) {
  .community-store {
    padding: 20px 20px 50px;
  }
  .store-heading {
    padding-bottom: 22px;
  }
  .store-heading .store-text-link {
    font-size: 10px;
    max-width: 110px;
    text-align: right;
  }
  .store-heading .store-eyebrow {
    max-width: 150px;
  }
  .store-product {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .store-product__copy {
    position: static;
    padding-top: 0;
  }
  .store-product h1 {
    max-width: none;
    font-size: clamp(44px, 9vw, 62px);
  }
  .store-product__description {
    max-width: 490px;
  }
  .store-price {
    margin-top: 26px;
  }
  .store-buy-row {
    max-width: 480px;
  }
  .store-section {
    margin-top: 40px;
    padding-top: 32px;
  }
  .store-section-heading {
    align-items: start;
  }
  .store-section-heading .store-text-link {
    text-align: right;
  }
  .store-checkout__grid,
  .store-receipt__grid,
  .store-story,
  .store-recover {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .store-order-review {
    position: static;
    border-left: 0;
    border-top: 1px solid var(--store-line);
    padding: 26px 0 0;
  }
  .store-terms {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .store-story h2 {
    max-width: 280px;
  }
  .store-recover__form {
    grid-template-columns: 1fr;
  }
  .store-checkout__intro {
    font-size: 13px;
  }
}
@media (max-width: 380px) {
  .community-store {
    padding-right: 14px;
    padding-left: 14px;
  }
  .store-fields {
    grid-template-columns: 1fr;
  }
  .store-buy-row {
    gap: 8px;
  }
  .store-primary {
    padding: 13px 10px;
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .store-product__copy {
    animation: none;
  }
  .store-primary,
  .store-secondary,
  .store-reveal-enter-active,
  .store-reveal-leave-active {
    transition: none;
  }
  .store-primary:hover:not(:disabled),
  .store-secondary:hover:not(:disabled) {
    transform: none;
  }
}
</style>
