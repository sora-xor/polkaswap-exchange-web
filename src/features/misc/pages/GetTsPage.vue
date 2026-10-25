<template>
  <main
    class="get-ts"
    :class="{ 'get-ts--quick': buyingXor && activeStep === 'source' }"
    :data-test-name="buyingXor ? 'buyXorPage' : 'getTsPage'"
  >
    <header class="get-ts__header">
      <div>
        <p class="get-ts__brand">{{ buyingXor ? 'POLKASWAP · XOR' : 'TONSWAP · TS' }}</p>
        <h1>{{ purchaseText('title') }}</h1>
        <p>{{ purchaseText('subtitle') }}</p>
      </div>
      <a v-if="!buyingXor" href="https://tonswap.org/ts" target="_blank" rel="noopener noreferrer"
        >{{ t('getTs.guide') }} ↗</a
      >
    </header>
    <div v-if="planProtection" class="get-ts__notice" data-test-name="protectedPurchase" role="status">
      <p>{{ purchaseText('resumeDescription') }}</p>
      <button class="get-ts__text-action" type="button" @click="goToStep(planProtection.step)">
        {{ purchaseText('resumeTitle') }} →
      </button>
    </div>
    <nav class="get-ts__phases" :aria-label="purchaseText('stepsLabel')">
      <button type="button" :aria-current="phase === 'plan' ? 'step' : undefined" @click="goToStep('source')">
        <span>1</span>{{ t('getTs.phases.plan') }}
      </button>
      <button
        type="button"
        :aria-current="phase === 'wallets' ? 'step' : undefined"
        :disabled="!view.source || !validPaymentAmount || (phase === 'plan' && !canContinuePlan)"
        @click="goToStep('wallets')"
      >
        <span>2</span>{{ t('getTs.phases.wallets') }}
      </button>
      <button
        type="button"
        :aria-current="phase === 'actions' ? 'step' : undefined"
        :disabled="!walletsReady || !isMainnet || !validPaymentAmount"
        @click="goToStep(resumeAction)"
      >
        <span>3</span>{{ t('getTs.journey.purchase') }}
      </button>
    </nav>
    <p v-if="!isMainnet" class="get-ts__notice" role="status">{{ purchaseText('mainnetRequired') }}</p>
    <get-ts-purchase-progress
      v-if="phase === 'actions'"
      :items="journey"
      :purpose="purpose"
      :reviewable="reviewableJourney"
      :refreshing="refreshingJourney"
      :refresh-failed="journeyRefreshFailed"
      @refresh="refreshJourney"
      @review="reviewJourneyStage"
    />
    <div
      class="get-ts__layout"
      :class="{
        'get-ts__layout--plan': activeStep === 'source',
        'get-ts__layout--quick': buyingXor && activeStep === 'source',
      }"
    >
      <section class="get-ts__workspace" :data-step="activeStep">
        <buy-xor-quick-start
          v-if="activeStep === 'source' && buyingXor"
          ref="stepHeading"
          :source="view.source"
          :amount="paymentAmount"
          :payment-asset="paymentSymbol"
          :can-continue="canContinuePlan"
          :locked="!!planProtection"
          @select-source="chooseSource"
          @update:amount="setPaymentAmount"
          @update:payment-asset="setPaymentSymbol"
          @preview="onPreview"
          @continue="goToStep(planProtection ? planProtection.step : 'wallets')"
        />
        <template v-else-if="activeStep === 'source'">
          <h2 ref="stepHeading" tabindex="-1">{{ t('getTs.sourceTitle') }}</h2>
          <div class="get-ts__sources" role="group" :aria-label="t('getTs.sourceTitle')">
            <button
              v-for="source in primarySources"
              :key="source"
              type="button"
              :data-source="source"
              :aria-pressed="view.source === source"
              :disabled="!!planProtection && view.source !== source"
              @click="chooseSource(source)"
            >
              <strong>{{ t(`getTs.sources.${source}.title`) }}</strong
              ><small>{{ t(`getTs.sourceLabels.${source}`) }}</small>
            </button>
          </div>
          <details class="get-ts__existing" :open="view.source === 'xor' || view.source === 'sora'">
            <summary>{{ t('getTs.existingSoraFunds') }}</summary>
            <div class="get-ts__sources get-ts__sources--existing" :class="{ 'get-ts__sources--single': buyingXor }">
              <button
                v-for="source in existingSources"
                :key="source"
                type="button"
                :data-source="source"
                :aria-pressed="view.source === source"
                :disabled="!!planProtection && view.source !== source"
                @click="chooseSource(source)"
              >
                <strong>{{ t(`getTs.sources.${source}.title`) }}</strong>
              </button>
            </div>
          </details>
          <template v-if="view.source">
            <get-ts-route-requirements
              :source="view.source"
              :purpose="purpose"
              :disabled="!!planProtection || preparingTransaction"
              @select-source="chooseSource"
            />
            <get-ts-plan-preview
              v-if="!planProtection"
              :purpose="purpose"
              :source="view.source"
              :amount="paymentAmount"
              :payment-asset="paymentSymbol"
              @update:amount="setPaymentAmount"
              @update:payment-asset="setPaymentSymbol"
              @preview="onPreview"
            />
            <p v-else class="get-ts__plan-amount">{{ plan.paymentAmount }} {{ paymentSymbol }}</p>
            <details class="get-ts__route">
              <summary>{{ t('getTs.routeDetails') }}</summary>
              <p>{{ purchaseText(`routes.${view.source}`) }}</p>
              <p>{{ t('getTs.separateReviews') }}</p>
            </details>
            <div class="get-ts__action-bar">
              <s-button
                class="get-ts__primary"
                type="primary"
                native-type="button"
                :disabled="!planProtection && !canContinuePlan"
                @click="goToStep(planProtection ? planProtection.step : 'wallets')"
                >{{ planProtection ? purchaseText('resumeTitle') : t('getTs.continuePlan') }}</s-button
              >
            </div>
          </template>
        </template>
        <template v-else-if="activeStep === 'wallets' && view.source">
          <get-ts-wallet-setup :source="view.source" :purpose="purpose" />
          <div v-if="walletsReady" class="get-ts__action-bar">
            <s-button
              class="get-ts__primary"
              type="primary"
              native-type="button"
              :disabled="!isMainnet"
              @click="continueFromWallets"
              >{{ t('getTs.walletsContinue') }}</s-button
            >
          </div>
        </template>
        <template v-else-if="activeStep === 'fund'">
          <h2 ref="stepHeading" tabindex="-1">
            {{
              t(
                view.source === 'card' && !cardConversion && !conversionStarted
                  ? 'getTs.cardTitle'
                  : view.source === 'ton'
                    ? 'getTs.conversion.tonTitle'
                    : 'getTs.fundTitle'
              )
            }}
          </h2>
          <template v-if="view.source === 'card' && !cardConversion && !conversionStarted">
            <p>{{ t(buyingXor ? 'buyXor.card.description' : 'getTs.cardDescription') }}</p>
            <get-ts-card-readiness
              ref="cardReadiness"
              :purpose="purpose"
              :amount="paymentAmount"
              :paused="moonpayStore.dialogVisibility"
              @checked="onCardReadinessChecked"
            />
            <ol v-if="buyingXor" class="get-ts__card-steps" data-test-name="buyXorCardSteps">
              <li>
                <span>{{ t('buyXor.card.copy') }}</span
                ><code>{{ evmAddress }}</code
                ><button type="button" class="get-ts__text-action" @click="copyCardAddress($event)">
                  {{ t(cardAddressCopied ? 'assets.copied' : 'getTs.copyAddress') }}
                </button>
              </li>
              <li>{{ t('buyXor.card.paste') }}</li>
              <li>{{ t('buyXor.card.return') }}</li>
            </ol>
            <div v-else class="get-ts__destination">
              <span>{{ t('getTs.cardDestination') }}</span
              ><code>{{ evmAddress }}</code
              ><button type="button" @click="handleCopyAddress(evmAddress, $event)">
                {{ t('getTs.copyAddress') }}
              </button>
            </div>
            <p v-if="!buyingXor" class="get-ts__muted">{{ purchaseText('cardDestinationNote') }}</p>
            <p class="get-ts__muted">{{ t('getTs.cardEligibility') }}</p>
            <p v-if="!moonpayEnabled" role="status">{{ t('getTs.cardUnavailable') }}</p>
            <div class="get-ts__action-bar">
              <s-button
                data-test-name="getTsBuyCard"
                class="get-ts__primary"
                type="primary"
                native-type="button"
                :disabled="!moonpayEnabled || !cardQuoteAllowed || !walletsReady || !isMainnet"
                @click="openCardPurchase"
                >{{ t(buyingXor ? 'buyXor.card.open' : 'getTs.cardBuy') }}</s-button
              >
            </div>
            <button class="get-ts__text-action" type="button" @click="cardConversion = true">
              {{ t('getTs.alreadyHaveEth') }}
            </button>
          </template>
          <template v-else>
            <p v-if="cardPurchaseCompleted" role="status">{{ t('getTs.cardCompleted') }}</p>
            <div v-else-if="view.source === 'card' && plan.cardDraft && !conversionStarted" role="status">
              <p>{{ t('getTs.cardResumeDescription') }}</p>
              <router-link to="/deposit/history">{{ t('fiatPayment.historyBtn') }} →</router-link>
            </div>
            <button
              v-if="view.source === 'card' && !conversionStarted"
              class="get-ts__text-action"
              type="button"
              :disabled="conversionPreparing"
              @click="reviewNewCardPurchase"
            >
              {{ t('getTs.cardReviewAgain') }}
            </button>
            <tonswap-conversion-panel
              v-if="!conversionReceived && (!conversionStarted || conversionRetry || conversionPreparing)"
              :purpose="purpose"
              :source="view.source === 'ton' && !conversionStarted ? 'ton' : 'ethereum'"
              :payment-asset="conversionAsset"
              :payment-amount="conversionAmount"
              :dai-intent="plan.daiAmount"
              :eth-budget="cardFundingEth || preview?.paymentEthAmount"
              @phase-change="conversionPhase = $event"
              @update:payment-asset="onConversionAsset"
              @update:payment-amount="onConversionAmount"
              @submitted="onConversionSubmitted"
              @preparing="conversionPreparing = $event"
              @completed="onConversionCompleted"
            />
            <div v-if="conversionStarted && !conversionRetry" class="get-ts__recovery" role="status">
              <p>
                {{
                  t(
                    `getTs.conversionProgress.${conversionProgress.state === 'idle' ? 'pending' : conversionProgress.state}`
                  )
                }}
              </p>
              <a :href="conversionTransactionUrl" target="_blank" rel="noopener noreferrer"
                >{{ t('getTs.conversion.viewTransaction') }} ↗</a
              >
              <button class="get-ts__text-action" type="button" @click="refreshConversionProgress">
                {{ t('getTs.checkStatus') }}
              </button>
              <button
                v-if="conversionProgress.state === 'failed'"
                class="get-ts__text-action"
                type="button"
                @click="retryConversion"
              >
                {{ t('getTs.retry') }}
              </button>
              <get-ts-conversion-recovery
                v-if="!conversionReceived && !downstreamReviewed"
                :reference="plan.references.conversion!"
                :purpose="purpose"
                @verified="onConversionReplacement"
              />
            </div>
            <div v-if="conversionReceived" class="get-ts__received" role="status">
              <h3>{{ t('getTs.conversionConfirmed') }}</h3>
              <p>{{ t('getTs.conversionReady', { asset: 'DAI' }) }}</p>
              <p>{{ plan.daiAmount }} DAI</p>
              <s-button class="get-ts__primary" type="primary" native-type="button" @click="goToStep('bridge')">{{
                t('getTs.goBridge')
              }}</s-button>
            </div>
            <details v-else class="get-ts__route">
              <summary>{{ t('getTs.existingEthereumDai') }}</summary>
              <p>{{ t('getTs.existingEthereumDaiNote') }}</p>
              <button class="get-ts__text-action" type="button" @click="goToStep('bridge')">
                {{ t('getTs.goBridge') }} →
              </button>
            </details>
          </template>
        </template>
        <template v-else-if="activeStep === 'bridge'">
          <h2 ref="stepHeading" tabindex="-1">{{ t('getTs.bridgeTitle') }}</h2>
          <p>{{ t('getTs.bridgeDescription') }}</p>
          <p v-if="plan.daiAmount" class="get-ts__amount">{{ plan.daiAmount }} <span>DAI</span></p>
          <p v-if="bridgeProgress.state !== 'idle'" role="status">
            {{ t(`getTs.bridgeProgress.${bridgeProgress.state}`) }}
          </p>
          <div v-if="bridgeProgress.state === 'received'" class="get-ts__action-bar">
            <s-button
              class="get-ts__primary"
              type="primary"
              native-type="button"
              :disabled="!hasDai"
              @click="goToStep('swap')"
              >{{ t('getTs.continueSwap') }}</s-button
            >
          </div>
          <div v-else-if="!plan.references.bridge" class="get-ts__action-bar">
            <s-button class="get-ts__primary" type="primary" native-type="button" @click="openBridge">{{
              t(plan.bridgeDraft ? 'getTs.bridgeHistory' : 'getTs.openBridge')
            }}</s-button>
          </div>
          <router-link v-if="!plan.bridgeDraft" :to="{ path: '/bridge/history', query: bridgeRoute.query }"
            >{{ t('getTs.bridgeHistory') }} ↗</router-link
          >
          <details class="get-ts__route">
            <summary>{{ t('getTs.transferDetails') }}</summary>
            <p>{{ t('getTs.bridgeReturn') }}</p>
            <strong>{{ purchaseText('claimWallet') }}</strong
            ><code>{{ soraAddress }}</code
            ><button
              v-if="plan.references.bridge"
              class="get-ts__text-action"
              type="button"
              @click="refreshBridgeProgress"
            >
              {{ t('getTs.refreshProgress') }}
            </button>
          </details>
          <details v-if="hasDai && !plan.bridgeDraft && bridgeProgress.state !== 'received'" class="get-ts__route">
            <summary>{{ t('getTs.useExistingBalance') }}</summary>
            <p>{{ t('getTs.existingBalanceNote') }}</p>
            <button class="get-ts__text-action" type="button" @click="goToStep('swap')">
              {{ t('getTs.useDai') }} →
            </button>
          </details>
        </template>
        <template v-else-if="activeStep === 'swap'">
          <h2 ref="stepHeading" tabindex="-1">
            {{ t(buyingXor && swapProgress.state === 'received' ? 'buyXor.receivedTitle' : 'getTs.swapTitle') }}
          </h2>
          <p v-if="swapProgress.state !== 'received'">{{ purchaseText('swapDescription') }}</p>
          <swap-form-widget
            v-if="swapPairReady && (!swapStarted || swapRetry || swapPreparing)"
            fixed-pair
            compact-details
            :purchase-purpose="purpose"
            max-price-impact="5"
            full
            @preparing="swapPreparing = $event"
            @submitted="onSwapSubmitted"
          />
          <p v-else-if="!swapStarted" role="status">
            {{ t(swapPairError ? 'getTs.swapFailed' : 'getTs.swapLoading') }}
          </p>
          <s-button v-if="swapPairError" native-type="button" @click="prepareSwapPair">{{ t('getTs.retry') }}</s-button>
          <p v-if="swapStarted && !swapRetry && !swapPreparing" role="status">
            {{
              t(
                buyingXor && swapProgress.state === 'received'
                  ? 'buyXor.swapReceived'
                  : plan.swapDraft && !plan.references.swap
                    ? 'getTs.swapProgress.unavailable'
                    : swapProgress.state === 'idle'
                      ? 'getTs.swapSubmitted'
                      : `getTs.swapProgress.${swapProgress.state}`
              )
            }}
          </p>
          <div v-if="swapStarted && !swapRetry && !swapPreparing" class="get-ts__recovery">
            <router-link to="/wallet">{{ t('getTs.walletHistory') }} ↗</router-link>
            <button class="get-ts__text-action" type="button" @click="refreshSwapProgress">
              {{ t('getTs.checkStatus') }}
            </button>
            <button
              v-if="swapProgress.state === 'failed'"
              class="get-ts__text-action"
              type="button"
              @click="swapRetry = true"
            >
              {{ t('getTs.reviewSwapAgain') }}
            </button>
          </div>
          <div v-if="buyingXor && swapProgress.state === 'received'" class="get-ts__received" role="status">
            <p>{{ t('buyXor.receivedDescription') }}</p>
            <p v-if="swapProgress.xorReceived" class="get-ts__amount">
              {{ formatAmount(swapProgress.xorReceived) }} <span>XOR</span>
            </p>
            <s-button class="get-ts__primary" type="primary" native-type="button" @click="router.push('/wallet')">{{
              t('buyXor.viewWallet')
            }}</s-button>
            <details class="get-ts__route">
              <summary>{{ t('buyXor.moreUses') }}</summary>
              <router-link :to="{ path: '/get-ts', query: { source: 'xor', step: 'source' } }"
                >{{ t('buyXor.optionalTs') }} →</router-link
              >
              <p>{{ t('buyXor.optionalTsNotice') }}</p>
            </details>
          </div>
          <div v-else-if="!buyingXor && swapProgress.state === 'received' && hasXor" class="get-ts__action-bar">
            <s-button class="get-ts__primary" type="primary" native-type="button" @click="goToStep('burn')">{{
              t('getTs.useXor')
            }}</s-button>
          </div>
          <details v-else-if="!buyingXor && hasXor" class="get-ts__route">
            <summary>{{ t('getTs.useExistingBalance') }}</summary>
            <button class="get-ts__text-action" type="button" @click="goToStep('burn')">
              {{ t('getTs.useXor') }} →
            </button>
          </details>
          <p v-if="!buyingXor && swapProgress.state === 'received' && !hasXor" class="get-ts__muted">
            {{ t('getTs.waitForXor') }}
          </p>
        </template>
        <template v-else-if="!buyingXor && activeStep === 'burn'">
          <h2 ref="stepHeading" tabindex="-1">{{ t('getTs.burnTitle') }}</h2>
          <p>{{ t('getTs.burnDescription') }}</p>
          <tonswap-burn-campaign
            :initial-amount="plan.xorAmount"
            @amount-change="onBurnAmount"
            @submitted="onBurnSubmitted"
          />
        </template>
        <div v-if="activeStep !== 'source'" class="get-ts__back">
          <button type="button" :disabled="preparingTransaction" @click="goBack">← {{ t('getTs.back') }}</button
          ><button type="button" :disabled="preparingTransaction" @click="goToStep('source')">
            {{ t('getTs.editPlan') }}
          </button>
        </div>
      </section>
      <aside v-if="activeStep !== 'source'" class="get-ts__context">
        <h2>{{ t('getTs.yourPlan') }}</h2>
        <p v-if="plan.paymentAmount" class="get-ts__plan-amount">{{ plan.paymentAmount }} {{ paymentSymbol }}</p>
        <p v-if="buyingXor && preview?.spendableXor" class="get-ts__estimate">
          ≈ {{ formatAmount(preview.spendableXor) }} XOR
          <span v-if="preview.costCoverage === 'partial'">{{ t('buyXor.preview.beforeGasXor') }}</span>
          <span>{{ purchaseText('initialEstimate') }}</span>
        </p>
        <p v-else-if="!buyingXor && preview?.estimatedTs" class="get-ts__estimate">
          ≈ {{ formatAmount(preview.estimatedTs) }} TS<span v-if="preview.costCoverage === 'partial'">{{
            t('getTs.preview.beforeGasTs')
          }}</span
          ><span>{{ t('getTs.initialEstimate') }}</span>
        </p>
        <p class="get-ts__claim">{{ t(buyingXor ? 'buyXor.receivingNotice' : 'getTs.claimNotice') }}</p>
        <details class="get-ts__route">
          <summary>{{ t('getTs.routeDetails') }}</summary>
          <p v-if="view.source">{{ purchaseText(`routes.${view.source}`) }}</p>
          <p>{{ t('getTs.separateReviews') }}</p>
        </details>
        <details v-if="isLoggedIn" class="get-ts__route">
          <summary>{{ t('getTs.balancesTitle') }}</summary>
          <dl>
            <div>
              <dt>DAI</dt>
              <dd data-test-name="getTsDaiBalance">{{ balanceText(daiBalance) }}</dd>
            </div>
            <div>
              <dt>XOR</dt>
              <dd data-test-name="getTsXorBalance">{{ balanceText(xorBalance) }}</dd>
            </div>
          </dl>
          <p v-if="!balancesReady">{{ t('getTs.balancesLoading') }}</p>
          <p v-else>{{ t('getTs.existingBalanceNote') }}</p>
          <button
            v-if="hasDai && !planProtection && activeStep !== 'swap'"
            class="get-ts__text-action"
            type="button"
            @click="useExistingFunds('sora', 'swap')"
          >
            {{ t('getTs.useDai') }} →</button
          ><button
            v-if="!buyingXor && hasXor && !planProtection && activeStep !== 'burn'"
            class="get-ts__text-action"
            type="button"
            @click="useExistingFunds('xor', 'burn')"
          >
            {{ t('getTs.useXor') }} →
          </button>
          <router-link v-if="buyingXor && hasXor" to="/wallet">{{ t('buyXor.existingXor') }} →</router-link>
        </details>
      </aside>
    </div>
    <div v-if="buyingXor" class="get-ts__measurement">
      <label>
        <input
          data-test-name="buyXorMeasurementConsent"
          type="checkbox"
          :checked="funnel.consent.value"
          :disabled="funnel.privacyBlocked.value"
          @change="onMeasurementConsent"
        />
        <span>{{ t('buyXor.measurement.consent') }}</span>
      </label>
      <p v-if="funnel.privacyBlocked.value">{{ t('buyXor.measurement.privacy') }}</p>
      <p v-else-if="funnel.delivery.value === 'unavailable'" role="status">
        {{ t('buyXor.measurement.unavailable') }}
      </p>
    </div>
    <template v-if="moonpayEnabled && view.source === 'card' && isLoggedIn"
      ><moonpay
        currency-code="eth"
        :base-currency-amount="plan.paymentAmount"
        :receiving-address="evmAddress"
        :auto-prepare-bridge="false"
        @completed="onCardCompleted" /><moonpay-notification /><moonpay-confirmation
    /></template>
    <select-provider-dialog />
  </main>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { Operation } from '@sora-substrate/sdk/build/types';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import SelectProviderDialog from '@/components/shared/Dialog/SelectProvider.vue';
import { useCopyAddress } from '@/composables/useCopyAddress';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { SoraNetwork } from '@/consts';
import Moonpay from '@/features/deposit/components/moonpay/Moonpay.vue';
import MoonpayNotification from '@/features/deposit/components/moonpay/Notification.vue';
import MoonpayConfirmation from '@/features/deposit/components/moonpay/Confirmation.vue';
import TonswapBurnCampaign from '@/features/misc/components/burn/TonswapBurnCampaign.vue';
import TonswapConversionPanel from '@/features/misc/components/burn/TonswapConversionPanel.vue';
import GetTsCardReadiness from '@/features/misc/components/burn/GetTsCardReadiness.vue';
import type { GetTsCardReadiness as CardReadiness } from '@/features/misc/lib/getTsCardReadiness';
import GetTsWalletSetup from '@/features/misc/components/burn/GetTsWalletSetup.vue';
import GetTsPlanPreview from '@/features/misc/components/burn/GetTsPlanPreview.vue';
import BuyXorQuickStart from '@/features/misc/components/buy-xor/BuyXorQuickStart.vue';
import GetTsRouteRequirements from '@/features/misc/components/burn/GetTsRouteRequirements.vue';
import GetTsPurchaseProgress from '@/features/misc/components/burn/GetTsPurchaseProgress.vue';
import { getTsJourney, type GetTsJourneyStage } from '@/features/misc/lib/getTsJourney';
import GetTsConversionRecovery from '@/features/misc/components/burn/GetTsConversionRecovery.vue';
import type { GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import type { GetTsPlanPreviewResult } from '@/features/misc/lib/getTsPlanQuote';
import { useBuyXorFunnel } from '@/features/misc/composables/useBuyXorFunnel';
import { buyXorFunnelReason } from '@/features/misc/lib/buyXorFunnel';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { useGetTsSwapProgress } from '@/features/misc/composables/useGetTsSwapProgress';
import { useGetTsBridgeProgress } from '@/features/misc/composables/useGetTsBridgeProgress';
import { useGetTsConversionProgress } from '@/features/misc/composables/useGetTsConversionProgress';
import { useTonswapTonWallet } from '@/features/misc/composables/useTonswapTonWallet';
import { getTsPlanProtection, normalizeGetTsAmount, type GetTsPaymentAsset } from '@/features/misc/lib/getTsPlan';
import SwapFormWidget from '@/features/swap/components/widgets/Form.vue';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { normalizeCodecBalanceValue } from '@/utils/asset-formatting';
import {
  buildGetTsBridgeRoute,
  getTsSteps,
  getTsWalletsReady,
  readGetTsView,
  resolveGetTsView,
  writeGetTsView,
  type GetTsSource,
  type GetTsStep,
  type GetTsViewState,
  type GetTsPurpose,
} from '@/features/misc/lib/getTsFlow';

defineOptions({ name: 'GetTsPage' });
const props = withDefaults(defineProps<{ purpose?: GetTsPurpose }>(), { purpose: 'ts' });
const buyingXor = computed(() => props.purpose === 'xor');
const purchasePath = computed(() => (buyingXor.value ? '/buy-xor' : '/get-ts'));
type PaymentSymbol = 'USD' | 'ETH' | 'USDT' | 'TON' | 'DAI' | 'XOR';
const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const { withApi } = useLoading();
const { handleCopyAddress } = useCopyAddress();
const { isLoggedIn, soraAddress } = useInternalConnect();
const { evmAddress } = useWeb3Connection();
const wallet = useWalletStore();
const settings = useSettingsStore();
const moonpayStore = useMoonpayStore();
const swapStore = useSwapStore();
const ton = useTonswapTonWallet();
const { plan, updatePlan, trackTransaction, rememberCardDraft, forgetCardDraft } = useGetTsPlan(() => props.purpose);
const { progress: bridgeProgress, refresh: refreshBridgeProgress } = useGetTsBridgeProgress(() => props.purpose);
const { progress: swapProgress, refresh: refreshSwapProgress } = useGetTsSwapProgress(() => props.purpose);
const { progress: conversionProgress, refresh: refreshConversionProgress } = useGetTsConversionProgress(
  () => props.purpose
);
const conversionPreparing = ref(false);
const swapPreparing = ref(false);
const preparingTransaction = computed(() => conversionPreparing.value || swapPreparing.value);
// Keep the signing component mounted until it records the returned transaction reference.
onBeforeRouteLeave(() => !preparingTransaction.value);
const planProtection = computed(() =>
  getTsPlanProtection(
    plan.value,
    {
      conversion: conversionProgress.value,
      bridge: bridgeProgress.value,
      swap: swapProgress.value,
    },
    conversionPreparing.value ? 'conversion' : swapPreparing.value ? 'swap' : undefined
  )
);
const view = ref<GetTsViewState>(resolvePurchaseView(readGetTsView(undefined, props.purpose)));
const funnel = useBuyXorFunnel({ enabled: buyingXor, route: () => view.value.source });
const bridgeRoute = computed(() => buildGetTsBridgeRoute(props.purpose));
const stepHeading = ref<Pick<HTMLElement, 'focus'> | null>(null);
const paymentAmount = ref(plan.value.paymentAmount);
const planningRequired = ref(!normalizeGetTsAmount(plan.value.paymentAmount));
const preview = ref<GetTsPlanPreviewResult | null>(null);
const primarySources: GetTsSource[] = ['ethereum', 'card', 'ton'];
const existingSources = computed<GetTsSource[]>(() => (buyingXor.value ? ['sora'] : ['xor', 'sora']));
const lastAction = ref<GetTsStep | null>(
  ['fund', 'bridge', 'swap', 'burn'].includes(view.value.step) ? view.value.step : null
);
const cardConversion = ref(!!plan.value.cardDraft);
const conversionPhase = ref<'ton' | 'ethereum'>('ton');
const cardPurchaseCompleted = ref(false);
const supplementalConversionAmount = ref(plan.value.cardDraft?.conversionEth ?? '');
const supplementalConversionAsset = ref<'eth' | 'usdt-ethereum'>('eth');
const receivedAsset = ref<'DAI' | 'ETH' | null>(null);
const conversionRetry = ref(false);
const conversionStarted = computed(() => !!plan.value.references.conversion);
const downstreamReviewed = computed(
  () =>
    !!(
      plan.value.bridgeDraft ||
      plan.value.swapDraft ||
      plan.value.references.bridge ||
      plan.value.references.swap ||
      plan.value.references.burn
    )
);
const conversionReceived = computed(() =>
  conversionStarted.value ? conversionProgress.value.state === 'received' : receivedAsset.value === 'DAI'
);
const conversionTransactionUrl = computed(() =>
  plan.value.references.conversion ? `https://etherscan.io/tx/${plan.value.references.conversion}` : ''
);
const cardCheck = ref<CardReadiness | null>(null);
/** Visible confirmation that the Ethereum address for MoonPay is on the clipboard. */
const cardAddressCopied = ref(false);
const cardReadiness = ref<InstanceType<typeof GetTsCardReadiness> | null>(null);
const cardFundingEth = ref(plan.value.cardDraft?.deliveredEth ?? '');
const swapSubmitted = ref(false);
const swapStarted = computed(() => swapSubmitted.value || !!plan.value.swapDraft || !!plan.value.references.swap);
const swapRetry = ref(false);
const now = ref(Date.now());
const clock = setInterval(() => {
  now.value = Date.now();
}, 1_000);
const swapPairReady = ref(false);
const swapPairError = ref(false);
let pairRequest = 0;
let disposed = false;
const isMainnet = computed(() => settings.soraNetwork === SoraNetwork.Prod);
const needsConversion = computed(
  () => !(view.value.source === 'ethereum' && plan.value.paymentAsset === 'dai-ethereum')
);
const steps = computed(() =>
  getTsSteps(view.value.source, props.purpose).filter((step) => step !== 'fund' || needsConversion.value)
);
const walletsReady = computed(
  () =>
    getTsWalletsReady(view.value.source, isLoggedIn.value, !!evmAddress.value) &&
    (view.value.source !== 'ton' || (!!ton.address.value && ton.chain.value === '-239'))
);
const activeStep = computed<GetTsStep>(() => {
  if (preparingTransaction.value && planProtection.value) return planProtection.value.step;
  if (planningRequired.value) return 'source';
  if (view.value.step === 'source' || view.value.step === 'wallets') return view.value.step;
  const step = planProtection.value?.step ?? view.value.step;
  if (!isMainnet.value || !isLoggedIn.value || (['fund', 'bridge'].includes(step) && !walletsReady.value))
    return 'wallets';
  return step === 'fund' && !needsConversion.value ? 'bridge' : step;
});
const phase = computed(() =>
  activeStep.value === 'source' ? 'plan' : activeStep.value === 'wallets' ? 'wallets' : 'actions'
);
/** The overview consumes receipt readers; it never promotes a saved draft into a successful payment. */
const journey = computed(() =>
  getTsJourney({
    source: view.value.source,
    purpose: props.purpose,
    plan: plan.value,
    activeStep: activeStep.value,
    contextReady: {
      card: isMainnet.value && walletsReady.value,
      conversion: !!evmAddress.value,
      bridge: isMainnet.value && isLoggedIn.value && !!evmAddress.value,
      swap: isMainnet.value && isLoggedIn.value,
    },
    cardConversion: cardConversion.value,
    cardReported: cardPurchaseCompleted.value,
    tonOnEthereum: conversionPhase.value === 'ethereum',
    conversion: conversionProgress.value,
    bridge: bridgeProgress.value,
    swap: swapProgress.value,
  })
);
const refreshingJourney = ref(false);
const journeyRefreshFailed = ref(false);
const reviewableJourney = computed(() =>
  journey.value
    .filter(
      (item) =>
        item.id !== 'card' &&
        !preparingTransaction.value &&
        canVisit(item.step) &&
        (!planProtection.value || item.step === planProtection.value.step)
    )
    .map((item) => item.id)
);
/** Refreshing statuses is read-only; provider orders and wallet approval dialogs are never opened. */
async function refreshJourney(): Promise<void> {
  if (refreshingJourney.value) return;
  refreshingJourney.value = true;
  journeyRefreshFailed.value = false;
  try {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => refreshConversionProgress()),
      Promise.resolve().then(() => refreshBridgeProgress()),
      Promise.resolve().then(() => refreshSwapProgress()),
    ]);
    journeyRefreshFailed.value = results.some((result) => result.status === 'rejected');
  } finally {
    refreshingJourney.value = false;
  }
}
/** Recovery navigation remains subject to the same unresolved-transaction and signing guards. */
function reviewJourneyStage(id: GetTsJourneyStage): void {
  if (!reviewableJourney.value.includes(id)) return;
  const item = journey.value.find((item) => item.id === id);
  if (item) goToStep(item.step);
}
const firstAction = computed<GetTsStep>(() =>
  view.value.source === 'xor'
    ? 'burn'
    : view.value.source === 'sora'
      ? 'swap'
      : plan.value.paymentAsset === 'dai-ethereum'
        ? 'bridge'
        : 'fund'
);
/** Resumes the recorded stage without treating any submitted reference as confirmed. */
const resumeAction = computed<GetTsStep>(() => {
  if (planProtection.value) return planProtection.value.step;
  if (!buyingXor.value && plan.value.references.burn) return 'burn';
  if (plan.value.swapDraft || plan.value.references.swap) return 'swap';
  if (plan.value.bridgeDraft || plan.value.references.bridge || receivedAsset.value === 'DAI') return 'bridge';
  return lastAction.value && steps.value.includes(lastAction.value) ? lastAction.value : firstAction.value;
});
const paymentSymbol = computed<PaymentSymbol>(() => {
  if (view.value.source === 'card') return 'USD';
  if (view.value.source === 'xor') return 'XOR';
  if (view.value.source === 'sora') return 'DAI';
  if (view.value.source === 'ton') return plan.value.paymentAsset === 'ton' ? 'TON' : 'USDT';
  return plan.value.paymentAsset === 'dai-ethereum'
    ? 'DAI'
    : plan.value.paymentAsset === 'usdt-ethereum'
      ? 'USDT'
      : 'ETH';
});
const validPaymentAmount = computed(
  () =>
    !!normalizeGetTsAmount(
      paymentAmount.value,
      paymentSymbol.value === 'USD' ? 2 : paymentSymbol.value === 'USDT' ? 6 : paymentSymbol.value === 'TON' ? 9 : 18
    )
);
const canContinuePlan = computed(
  () =>
    !!view.value.source &&
    validPaymentAmount.value &&
    preview.value?.state !== 'loading' &&
    preview.value?.feasible !== false
);
const conversionAsset = computed(() =>
  view.value.source === 'ethereum'
    ? plan.value.paymentAsset === 'usdt-ethereum'
      ? 'usdt-ethereum'
      : 'eth'
    : supplementalConversionAsset.value
);
const conversionAmount = computed(() =>
  view.value.source === 'ethereum' ||
  (view.value.source === 'ton' && conversionPhase.value === 'ton' && plan.value.paymentAsset === 'usdt-ton')
    ? plan.value.paymentAsset === 'ton'
      ? ''
      : paymentAmount.value
    : supplementalConversionAmount.value
);
const moonpayEnabled = computed(() => Boolean(settings.moonpayEnabled));
const balancesReady = computed(
  () => isMainnet.value && isLoggedIn.value && wallet.accountAssetsLoaded && !wallet.accountAssetsLoading
);
const daiBalance = computed(() => readBalance(DAI.address, DAI.decimals));
const xorBalance = computed(() => readBalance(XOR.address, XOR.decimals));
const hasDai = computed(() => daiBalance.value?.gt(FPNumber.ZERO) ?? false);
const hasXor = computed(() => xorBalance.value?.gt(FPNumber.ZERO) ?? false);
const cardQuoteAllowed = computed(
  () =>
    !!cardCheck.value?.allowed &&
    cardCheck.value.expiresAt > now.value &&
    normalizeGetTsAmount(cardCheck.value.amount, 2) === normalizeGetTsAmount(paymentAmount.value, 2)
);

/** Only a direct checkbox action changes the optional measurement preference. */
function onMeasurementConsent(event: Event): void {
  funnel.setConsent((event.target as HTMLInputElement).checked);
}

/** Shared transaction steps use purpose-specific copy only where the buyer's outcome differs. */
function purchaseText(key: string): string {
  return t(`${buyingXor.value ? 'buyXor' : 'getTs'}.${key}`);
}

/** Maps only supported payment choices into a validated draft; no URL can supply a token address. */
function paymentKey(source: GetTsSource, symbol?: PaymentSymbol): GetTsPaymentAsset {
  if (source === 'card') return 'card';
  if (source === 'sora') return 'dai-sora';
  if (source === 'xor') return 'xor-sora';
  if (source === 'ton') return symbol === 'TON' ? 'ton' : 'usdt-ton';
  return symbol === 'DAI' ? 'dai-ethereum' : symbol === 'USDT' ? 'usdt-ethereum' : 'eth';
}
/** Revokes current-session progress whenever the original budget or payment asset changes. */
function resetTransientProgress(): void {
  lastAction.value = null;
  receivedAsset.value = null;
  conversionRetry.value = false;
  swapSubmitted.value = false;
  swapPreparing.value = false;
  swapRetry.value = false;
  cardCheck.value = null;
  cardFundingEth.value = '';
  cardPurchaseCompleted.value = false;
  cardConversion.value = false;
  supplementalConversionAsset.value = 'eth';
  supplementalConversionAmount.value = '';
}
/** Retains invalid text for correction while revoking any previously valid saved budget. */
function setPaymentAmount(value: string): void {
  if (planProtection.value || swapPreparing.value) return;
  if (value !== paymentAmount.value) resetTransientProgress();
  paymentAmount.value = value;
  preview.value = null;
  const decimals =
    paymentSymbol.value === 'USD' ? 2 : paymentSymbol.value === 'USDT' ? 6 : paymentSymbol.value === 'TON' ? 9 : 18;
  updatePlan({ paymentAmount: normalizeGetTsAmount(value, decimals) ?? '' });
}
/** Switching a funding asset starts a new draft without converting units silently. */
function setPaymentSymbol(symbol: PaymentSymbol): void {
  if (planProtection.value || swapPreparing.value) return;
  if (!view.value.source) return;
  const allowed =
    view.value.source === 'ethereum'
      ? ['ETH', 'USDT', 'DAI']
      : view.value.source === 'ton'
        ? ['USDT', 'TON']
        : [paymentSymbol.value];
  if (!allowed.includes(symbol) || symbol === paymentSymbol.value) return;
  resetTransientProgress();
  updatePlan({ paymentAsset: paymentKey(view.value.source, symbol), paymentAmount: '' });
  paymentAmount.value = '';
  preview.value = null;
}
/** Indicative amounts are suggestions, never an executable quote or proof of funds. */
function onPreview(value: GetTsPlanPreviewResult): void {
  if (
    (value.purpose ?? 'ts') !== props.purpose ||
    value.source !== view.value.source ||
    value.amount !== paymentAmount.value ||
    value.paymentAsset !== paymentSymbol.value
  )
    return;
  preview.value = value;
  if (
    value.feasible &&
    value.expiresAt &&
    value.expiresAt > Date.now() &&
    !plan.value.bridgeDraft &&
    !plan.value.swapDraft &&
    !Object.values(plan.value.references).some(Boolean) &&
    !receivedAsset.value
  )
    updatePlan({
      daiAmount: value.daiIntent ?? value.daiAmount ?? '',
      xorAmount: buyingXor.value ? (value.spendableXor ?? '') : (value.burnableXor ?? ''),
    });
}
/** Reads only this account's synchronized spendable balance with the SDK denomination. */
function readBalance(address: string, decimals: number): FPNumber | null {
  if (!balancesReady.value) return null;
  const codec = normalizeCodecBalanceValue(wallet.accountAssetsAddressTable?.[address]?.balance?.transferable);
  if (codec === null) return null;
  const amount = FPNumber.fromCodecValue(codec, decimals);
  return amount.isFinity() && !amount.lt(FPNumber.ZERO) ? amount : null;
}
/** Balance rendering never converts exact amounts through JavaScript floating point. */
function balanceText(amount: FPNumber | null): string {
  return amount === null ? '—' : amount.toLocaleString();
}
/** Rounds a display copy only; executable values retain their original precision. */
function formatAmount(amount: string): string {
  return new FPNumber(amount).toLocaleString(4);
}
/** Navigation never opens a connection or a signing request. */
function canVisit(step: GetTsStep): boolean {
  if (preparingTransaction.value && step !== planProtection.value?.step) return false;
  if (buyingXor.value && step === 'burn') return false;
  if (step === 'source') return true;
  if (!view.value.source) return false;
  if (step === 'wallets') return activeStep.value !== 'source' || canContinuePlan.value;
  if (!isMainnet.value || !isLoggedIn.value) return false;
  return !['fund', 'bridge'].includes(step) || walletsReady.value;
}
/** Saves navigation independently of the purchase draft and its chain references. */
function updateView(next: GetTsViewState): void {
  if (['fund', 'bridge', 'swap', 'burn'].includes(next.step)) lastAction.value = next.step;
  view.value = next;
  writeGetTsView(next, undefined, props.purpose);
  void router.replace({
    path: purchasePath.value,
    query: { ...(next.source ? { source: next.source } : {}), step: next.step },
  });
}
/** A deep link may navigate the current purchase but cannot replace its funding source while unresolved. */
function resolvePurchaseView(saved: unknown): GetTsViewState {
  const next = resolveGetTsView(route.query.source, route.query.step, saved, props.purpose);
  const protectedPlan = planProtection.value;
  if (!protectedPlan) return next;
  return {
    version: 1,
    source: protectedPlan.source,
    step:
      !preparingTransaction.value && next.source === protectedPlan.source && ['source', 'wallets'].includes(next.step)
        ? next.step
        : protectedPlan.step,
  };
}
/** Selecting a payment method reveals its amount and route before account setup. */
function chooseSource(source: GetTsSource): void {
  if (planProtection.value || swapPreparing.value) return;
  if (view.value.source !== source) {
    resetTransientProgress();
    updatePlan({ paymentAsset: paymentKey(source), paymentAmount: '' });
    paymentAmount.value = '';
    preview.value = null;
    cardCheck.value = null;
    cardConversion.value = false;
    cardPurchaseCompleted.value = false;
    receivedAsset.value = null;
    swapSubmitted.value = false;
    conversionPhase.value = 'ton';
    supplementalConversionAmount.value = '';
  }
  updateView({ version: 1, source, step: 'source' });
}
/** Opens only a stage supported by this route and its current wallet prerequisites. */
function goToStep(step: GetTsStep): void {
  if (preparingTransaction.value && step !== planProtection.value?.step) return;
  if (planProtection.value && !['source', 'wallets'].includes(step)) step = planProtection.value.step;
  if (step === planProtection.value?.step) {
    updateView({ ...view.value, step });
    return;
  }
  if (step === 'wallets' && validPaymentAmount.value) planningRequired.value = false;
  if (steps.value.includes(step) && canVisit(step)) updateView({ ...view.value, step });
}
/** Explicit existing-balance shortcuts do not pretend that a purchase or bridge completed. */
function useExistingFunds(source: 'sora' | 'xor', step: 'swap' | 'burn'): void {
  if (planProtection.value || swapPreparing.value) return;
  const balance = source === 'sora' ? daiBalance.value : xorBalance.value;
  if (!balance?.gt(FPNumber.ZERO)) return;
  updatePlan({ paymentAsset: paymentKey(source), paymentAmount: balance.toString() });
  updatePlan(source === 'sora' ? { daiAmount: balance.toString() } : { xorAmount: balance.toString() });
  paymentAmount.value = balance.toString();
  preview.value = null;
  updateView({ version: 1, source, step });
}
/** Wallet connection is followed by a separate explicit continuation action. */
function continueFromWallets(): void {
  if (walletsReady.value && isMainnet.value) goToStep(resumeAction.value);
}
/** Returns one screen without resetting the user's budget or wallet connection. */
function goBack(): void {
  goToStep(steps.value[Math.max(0, steps.value.indexOf(activeStep.value) - 1)]);
}
/** Replaces readiness on every automatic quote result and revocation. */
function onCardReadinessChecked(check: CardReadiness): void {
  cardCheck.value = check;
  now.value = Date.now();
  if (!buyingXor.value) return;
  if (check.allowed && check.expiresAt > now.value) void funnel.record('quote_available');
  else if (check.reason)
    void funnel.record(
      check.reason === 'budget' || check.reason === 'liquidity' ? 'quote_blocked' : 'quote_unavailable',
      buyXorFunnelReason(check.reason)
    );
}
/** Rechecks the complete wallet-bound cost review before opening a separate provider order. */
function openCardPurchase(): void {
  if (planProtection.value) return;
  now.value = Date.now();
  if (
    !moonpayEnabled.value ||
    !isMainnet.value ||
    !walletsReady.value ||
    !cardQuoteAllowed.value ||
    !cardReadiness.value?.canContinue()
  )
    return;
  const check = cardCheck.value!;
  if (!rememberCardDraft({ deliveredEth: check.deliveredEth ?? '', conversionEth: check.conversionEth ?? '' })) return;
  updatePlan({
    daiAmount: check.daiAmount ?? '',
    xorAmount: buyingXor.value ? (check.spendableXor ?? '') : (check.burnableXor ?? ''),
  });
  cardFundingEth.value = check.deliveredEth ?? '';
  supplementalConversionAsset.value = 'eth';
  supplementalConversionAmount.value = check.conversionEth ?? '';
  cardConversion.value = true;
  // Buy XOR's button says it copies: MoonPay cannot be given the address without a signed URL.
  if (buyingXor.value) copyCardAddress();
  moonpayStore.setDialogVisibility(true);
  void funnel.record('provider_handoff');
}
/** Copies the connected Ethereum address that MoonPay asks for; the SORA address is never offered here. */
function copyCardAddress(event?: MouseEvent): void {
  if (!evmAddress.value) return;
  cardAddressCopied.value = true;
  void handleCopyAddress(evmAddress.value, event);
}
/** A fresh payment is an explicit choice; the cost component must obtain a new wallet-bound review. */
function reviewNewCardPurchase(): void {
  if (conversionPreparing.value || conversionStarted.value || planProtection.value) return;
  forgetCardDraft();
  cardConversion.value = false;
  cardPurchaseCompleted.value = false;
  cardCheck.value = null;
  cardFundingEth.value = '';
  supplementalConversionAsset.value = 'eth';
  supplementalConversionAmount.value = '';
}
/** Provider completion reveals the next task, without calling a blockchain transfer complete. */
function onCardCompleted(): void {
  cardPurchaseCompleted.value = true;
  cardConversion.value = true;
}
/** Upstream TON/card amounts are kept in their own units as the buyer switches to Ethereum funds. */
function onConversionAsset(asset: 'eth' | 'usdt-ethereum'): void {
  if (view.value.source === 'ethereum') setPaymentSymbol(asset === 'eth' ? 'ETH' : 'USDT');
  else supplementalConversionAsset.value = asset;
}
/** Ethereum edits update the original budget; intermediary conversion edits preserve the original source. */
function onConversionAmount(amount: string): void {
  if (
    view.value.source === 'ethereum' ||
    (view.value.source === 'ton' && conversionPhase.value === 'ton' && plan.value.paymentAsset === 'usdt-ton')
  )
    setPaymentAmount(amount);
  else supplementalConversionAmount.value = amount;
}
/** Retains the submitted reference before waiting; recovery never infers completion from balances. */
function onConversionSubmitted(result: { transactionHash: string }): void {
  if (downstreamReviewed.value) return;
  if (trackTransaction('conversion', result.transactionHash)) {
    conversionPreparing.value = false;
    conversionRetry.value = false;
    receivedAsset.value = null;
  }
}
/** Rebinds only a same-request replacement whose canonical Ethereum receipt was independently checked. */
function onConversionReplacement(result: GetTsConversionProgress): void {
  if (!result.reference || !['received', 'failed'].includes(result.state) || downstreamReviewed.value) return;
  if (trackTransaction('conversion', result.reference)) {
    conversionRetry.value = false;
    receivedAsset.value = null;
    void refreshConversionProgress();
  }
}
/** A failed Ethereum transaction retries only that conversion, preserving any earlier TON/card funding. */
function retryConversion(): void {
  if (conversionProgress.value.state !== 'failed' || planProtection.value || downstreamReviewed.value) return;
  conversionPhase.value = 'ethereum';
  conversionRetry.value = true;
}
/** Records only a transaction-receipt-verified result and its submitted transaction reference. */
function onConversionCompleted(result: {
  receivedAsset: 'DAI' | 'ETH';
  amount: string;
  transactionHash?: string;
}): void {
  if (downstreamReviewed.value) return;
  if (!normalizeGetTsAmount(result.amount)) return;
  if (result.transactionHash) trackTransaction('conversion', result.transactionHash);
  receivedAsset.value = result.receivedAsset;
  if (result.receivedAsset === 'DAI') updatePlan({ daiAmount: result.amount });
}
/** The real bridge validates the draft amount, registered assets, wallets and fees again. */
async function openBridge(): Promise<void> {
  if (!walletsReady.value || !isMainnet.value) return;
  writeGetTsView({ ...view.value, step: 'bridge' }, undefined, props.purpose);
  await router.push(
    plan.value.bridgeDraft ? { path: '/bridge/history', query: bridgeRoute.value.query } : bridgeRoute.value
  );
}
/** Carries the intended DAI amount into the existing live-quote form, without submitting it. */
async function prepareSwapPair(): Promise<void> {
  if (planProtection.value && planProtection.value.step !== 'swap') return;
  const request = ++pairRequest;
  swapPairReady.value = false;
  swapPairError.value = false;
  try {
    await withApi(async () => {
      if (disposed || request !== pairRequest || activeStep.value !== 'swap') return;
      swapStore.setFromValue('');
      swapStore.setToValue('');
      swapStore.setExchangeB(false);
      swapStore.selectDexId();
      swapStore.setLiquiditySource(LiquiditySourceTypes.Default);
      await swapStore.setTokenFromAddress(DAI.address);
      await swapStore.setTokenToAddress(XOR.address);
      if (!disposed && request === pairRequest && activeStep.value === 'swap') {
        swapStore.setFromValue(plan.value.daiAmount);
        swapPairReady.value = true;
      }
    });
  } catch {
    if (!disposed && request === pairRequest) swapPairError.value = true;
  }
}
/** Submission stays pending; only the campaign journey reserves a fee for its later burn. */
function onSwapSubmitted(result: { expectedXor: string; transactionHash?: string }): void {
  swapSubmitted.value = true;
  swapRetry.value = false;
  const amount = normalizeGetTsAmount(result.expectedXor);
  if (buyingXor.value && amount) updatePlan({ xorAmount: amount });
  else if (!buyingXor.value && amount) {
    const fee = normalizeCodecBalanceValue(settings.networkFees?.[Operation.BurnWithRemark]);
    if (fee) {
      const available = new FPNumber(amount).sub(FPNumber.fromCodecValue(fee));
      if (available.gt(FPNumber.ZERO)) updatePlan({ xorAmount: available.toString() });
    }
  }
  if (result.transactionHash) trackTransaction('swap', result.transactionHash);
}
/** A burn receipt owns its status; the draft stores only a submitted reference for recovery. */
function onBurnSubmitted(result: { transactionHash: string }): void {
  trackTransaction('burn', result.transactionHash);
}
/** Saves only an exact edited suggestion, never a signed burn or a receipt status. */
function onBurnAmount(value: string): void {
  updatePlan({ xorAmount: normalizeGetTsAmount(value) ?? '' });
}
/** Count observed stages only; receipt checks must belong to this saved purchase. */
watch(
  [
    funnel.consent,
    buyingXor,
    () => view.value.source,
    walletsReady,
    preview,
    () => plan.value.references,
    conversionProgress,
    bridgeProgress,
    swapProgress,
    isMainnet,
  ],
  () => {
    if (!buyingXor.value || !funnel.consent.value) return;
    void funnel.record('view');
    if (!view.value.source) return;
    if (walletsReady.value && isMainnet.value) void funnel.record('wallets_ready');
    const quote = preview.value;
    if (quote?.state === 'loading') void funnel.record('quote_requested');
    else if (quote?.state === 'ready' && quote.feasible && (quote.expiresAt ?? 0) > Date.now())
      void funnel.record('quote_available');
    else if (quote?.state === 'blocked' || quote?.state === 'unavailable')
      void funnel.record(
        quote.state === 'blocked' ? 'quote_blocked' : 'quote_unavailable',
        buyXorFunnelReason(quote.reason)
      );
    for (const stage of ['conversion', 'bridge', 'swap'] as const) {
      const reference = plan.value.references[stage];
      if (!reference) continue;
      void funnel.record(`${stage}_submitted`);
      const progress =
        stage === 'conversion'
          ? conversionProgress.value
          : stage === 'bridge'
            ? bridgeProgress.value
            : swapProgress.value;
      if (progress.reference !== reference) continue;
      if (progress.state === 'received') void funnel.record(stage === 'swap' ? 'xor_received' : `${stage}_received`);
      else if (progress.state === 'failed') void funnel.record(`${stage}_failed`);
    }
  },
  { immediate: true, deep: true }
);
watch(
  () => view.value.source,
  (source) => {
    if (!source) return;
    const asset = plan.value.paymentAsset;
    const compatible =
      source === 'ethereum'
        ? ['eth', 'usdt-ethereum', 'dai-ethereum'].includes(asset ?? '')
        : source === 'ton'
          ? ['usdt-ton', 'ton'].includes(asset ?? '')
          : asset === paymentKey(source);
    if (!compatible) {
      if (planProtection.value) return;
      updatePlan({ paymentAsset: paymentKey(source), paymentAmount: '' });
      paymentAmount.value = '';
      preview.value = null;
      resetTransientProgress();
      planningRequired.value = true;
    }
  },
  { immediate: true }
);
watch(swapProgress, (value) => {
  if (value.state !== 'received' || !value.xorReceived) return;
  if (buyingXor.value) {
    const amount = normalizeGetTsAmount(value.xorReceived);
    if (amount) updatePlan({ xorAmount: amount });
    return;
  }
  const fee = normalizeCodecBalanceValue(settings.networkFees?.[Operation.BurnWithRemark]);
  if (!fee) return;
  const available = new FPNumber(value.xorReceived).sub(FPNumber.fromCodecValue(fee));
  if (available.gt(FPNumber.ZERO)) updatePlan({ xorAmount: available.toString() });
});
watch(
  conversionProgress,
  (value) => {
    // Once a bridge amount has been reviewed, a restored conversion receipt cannot replace it.
    if (downstreamReviewed.value) return;
    const amount = value.state === 'received' ? normalizeGetTsAmount(value.amount) : null;
    if (amount) updatePlan({ daiAmount: amount });
  },
  { immediate: true }
);
watch(
  () => [route.query.source, route.query.step],
  () => {
    view.value = resolvePurchaseView(view.value);
  }
);
watch(
  activeStep,
  async (step, previous) => {
    pairRequest += 1;
    swapPairReady.value = false;
    if (step === 'swap') void prepareSwapPair();
    if (previous !== undefined) {
      await nextTick();
      stepHeading.value?.focus({ preventScroll: true });
    }
  },
  { immediate: true }
);
watch([soraAddress, evmAddress], () => {
  cardCheck.value = null;
  cardAddressCopied.value = false;
  cardPurchaseCompleted.value = false;
  receivedAsset.value = null;
  conversionRetry.value = false;
  swapSubmitted.value = false;
});
if (view.value.source && !plan.value.paymentAsset) updatePlan({ paymentAsset: paymentKey(view.value.source) });
onBeforeUnmount(() => {
  disposed = true;
  pairRequest += 1;
  clearInterval(clock);
});
</script>

<style scoped lang="scss">
.get-ts {
  max-width: 1060px;
  margin: 0 auto;
  padding: 32px 28px 64px;
  color: var(--s-color-base-content-primary);
  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }
  h1 {
    font-size: 30px;
    line-height: 1.2;
    margin-bottom: 10px;
  }
  h2 {
    font-size: 23px;
    line-height: 1.35;
    margin-bottom: 16px;
  }
  h2[tabindex='-1']:focus {
    outline: none !important;
  }
  h3 {
    font-size: 18px;
  }
  p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--s-color-base-content-secondary);
  }
  a {
    color: var(--s-color-action-text, var(--s-color-theme-accent));
  }
  button {
    cursor: pointer;
    font: inherit;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  :is(button, a, summary):focus-visible {
    outline: 2px solid var(--s-color-focus-ring, var(--s-color-theme-accent));
    outline-offset: 4px;
  }
  code {
    display: block;
    overflow-wrap: anywhere;
    font-size: 12px;
    line-height: 1.6;
    margin-block: 8px 12px;
  }
  &__measurement {
    max-width: 720px;
    margin: 28px auto 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);
    label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      padding-block: 10px;
    }
    input {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      accent-color: var(--s-color-theme-accent);
    }
    p {
      font-size: 12px;
      margin: 4px 0 0 28px;
    }
  }
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;
  }
  &__header p {
    margin-bottom: 0;
    max-width: 560px;
  }
  &__header a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 12px;
    white-space: nowrap;
    padding: 10px 14px;
    border-radius: var(--s-border-radius-small);
  }
  &__brand {
    font-size: 11px !important;
    color: var(--s-color-theme-accent) !important;
    font-weight: 700;
    letter-spacing: 0.1em;
    margin-bottom: 8px !important;
  }
  &__phases {
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: var(--s-border-radius-medium);
    background: var(--s-color-base-background);
    box-shadow: var(--s-shadow-element);
    margin-bottom: 30px;
  }
  &__phases button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 48px;
    padding: 12px 8px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    color: var(--s-color-base-content-secondary);
    background: none;
    font-size: 13px;
    transition:
      color 0.16s ease,
      background-color 0.16s ease,
      box-shadow 0.16s ease;
  }
  &__phases span {
    font-size: 11px;
  }
  &__phases [aria-current='step'] {
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element-pressed);
    font-weight: 600;
  }
  &__layout {
    display: grid;
    grid-template-columns: #{'minmax(0, 1fr) 268px'};
    gap: 28px;
    align-items: start;
  }
  &__layout--plan {
    grid-template-columns: #{'minmax(0, 1fr)'};
    max-width: 720px;
    margin-inline: auto;
  }
  // The Buy XOR start screen narrows the whole page, header and steps included.
  &--quick {
    max-width: 656px;
  }
  &__layout--quick {
    max-width: none;
  }
  &__workspace {
    min-width: 0;
    padding: 28px;
    border-radius: var(--s-border-radius-medium);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
  }
  &__sources {
    display: grid;
    grid-template-columns: #{'repeat(3, minmax(0, 1fr))'};
    gap: 14px;
    margin-block: 20px;
  }
  &__sources button {
    min-height: 88px;
    padding: 18px 16px;
    border: 1px solid transparent;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
    color: inherit;
    text-align: start;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease,
      color 0.16s ease;
  }
  &__sources button[aria-pressed='true'] {
    border-color: var(--s-color-action-text, var(--s-color-theme-accent));
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    box-shadow: var(--s-shadow-element);
  }
  &__sources strong {
    display: block;
    font-size: 14px;
    margin-bottom: 6px;
  }
  &__sources small {
    display: block;
    font-size: 11px;
    color: var(--s-color-base-content-secondary);
    line-height: 1.5;
  }
  &__sources--existing {
    grid-template-columns: #{'repeat(2, minmax(0, 1fr))'};
  }
  &__sources--single {
    grid-template-columns: #{'minmax(0, 1fr)'};
  }
  &__sources--existing button {
    min-height: 54px;
  }
  &__existing {
    margin-bottom: 24px;
    font-size: 12px;
  }
  summary {
    cursor: pointer;
    min-height: 44px;
    padding-block: 12px;
    line-height: 1.5;
  }
  &__notice {
    border-inline-start: 3px solid var(--s-color-action-text, var(--s-color-theme-accent));
    border-radius: var(--s-border-radius-base);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    padding: 14px 18px;
  }
  &__recovery {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 20px;
    margin-bottom: 16px;
  }
  &__recovery > p {
    flex-basis: 100%;
  }
  &__recovery > a,
  &__recovery > button {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  &__route-note {
    font-size: 12px !important;
  }
  &__claim {
    border-top: 1px solid var(--s-color-base-border-secondary);
    padding-top: 16px;
    margin-top: 24px;
    font-size: 12px !important;
  }
  &__route {
    font-size: 12px;
    padding-inline: 16px;
    border-radius: var(--s-border-radius-base);
    background: var(--s-color-utility-body);
    margin-block: 16px;
  }
  &__route[open] {
    padding-bottom: 12px;
    box-shadow: var(--s-shadow-element);
  }
  &__route p {
    font-size: 12px;
  }
  &__action-bar {
    margin-top: 24px;
  }
  &__primary {
    width: 100%;
    min-height: 48px;
  }
  &__text-action,
  &__back button,
  &__destination button {
    background: none;
    border: 0;
    min-height: 44px;
    padding: 12px 14px;
    border-radius: var(--s-border-radius-small);
    color: var(--s-color-action-text, var(--s-color-theme-accent));
    text-align: start;
    font-size: 12px;
    transition:
      background-color 0.16s ease,
      box-shadow 0.16s ease;
  }
  &__card-steps {
    margin: 20px 0;
    padding: 16px;
    padding-inline-start: 36px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    font-size: 13px;
    line-height: 1.55;
    li + li {
      margin-top: 10px;
    }
    code {
      margin-block: 6px 0;
      font-size: 13px;
      direction: ltr;
      unicode-bidi: isolate;
    }
    .get-ts__text-action {
      padding-inline: 0;
      font-weight: 600;
    }
  }
  &__destination {
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
    padding: 20px;
    margin-block: 20px;
    font-size: 12px;
  }
  &__muted {
    font-size: 12px !important;
  }
  &__amount {
    font-size: 32px !important;
    color: var(--s-color-base-content-primary) !important;
    margin-block: 24px;
  }
  &__amount span {
    font-size: 16px;
  }
  &__context {
    padding: 24px;
    min-width: 0;
    border-radius: var(--s-border-radius-medium);
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    position: sticky;
    top: 24px;
  }
  &__context h2 {
    font-size: 13px;
    color: var(--s-color-base-content-secondary);
  }
  &__context p {
    font-size: 12px;
  }
  &__plan-amount {
    color: var(--s-color-base-content-primary) !important;
    font-size: 24px !important;
    overflow-wrap: anywhere;
  }
  &__estimate {
    color: var(--s-color-base-content-primary) !important;
    font-size: 18px !important;
  }
  &__estimate span {
    display: block;
    font-size: 11px;
    color: var(--s-color-base-content-secondary);
    margin-top: 6px;
  }
  &__context dl > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-block: 8px;
  }
  &__context dd {
    margin: 0;
    text-align: end;
    overflow-wrap: anywhere;
  }
  &__back {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: 28px;
    padding-top: 4px;
  }
  &__back button {
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element-pressed);
  }
  :deep(.el-button) {
    max-width: 100%;
    white-space: normal;
    height: auto;
    min-height: 46px;
  }
  :deep(.tonswap-burn.container) {
    width: 100%;
    max-width: none;
    margin: 0;
  }
  @media (hover: hover) {
    &__sources button:hover {
      border-color: var(--s-color-action-text, var(--s-color-theme-accent));
    }
    &__phases button:not(:disabled):hover {
      color: var(--s-color-action-text, var(--s-color-theme-accent));
    }
    &__text-action:hover,
    &__back button:hover,
    &__destination button:hover {
      background: var(--s-color-utility-body);
      box-shadow: var(--s-shadow-element-pressed);
    }
  }
  &__sources button:active,
  &__back button:active,
  &__text-action:active,
  &__destination button:active {
    box-shadow: var(--s-shadow-element);
  }
  @media (max-width: 760px) {
    padding: 24px 20px 40px;
    &__layout {
      grid-template-columns: #{'minmax(0, 1fr)'};
      gap: 28px;
    }
    &__context {
      position: static;
      padding: 24px;
    }
    &__header {
      gap: 12px;
    }
    &__header a {
      white-space: normal;
      text-align: end;
    }
  }
  @media (max-width: 480px) {
    padding: 20px 14px 32px;
    &__workspace,
    &__context {
      padding: 20px;
      border-radius: var(--s-border-radius-small);
    }
    h1 {
      font-size: 26px;
    }
    h2 {
      font-size: 21px;
    }
    &__brand {
      display: none;
    }
    &__header p {
      font-size: 12px;
    }
    &__header a {
      max-width: 85px;
      font-size: 11px;
      padding: 10px 0;
    }
    &__phases {
      margin-bottom: 24px;
      gap: 4px;
    }
    &__phases button {
      font-size: 12px;
      gap: 6px;
    }
    &__sources {
      gap: 10px;
    }
    &__sources button {
      padding: 14px 10px;
      min-height: 88px;
      border-radius: var(--s-border-radius-base);
    }
    &__sources strong {
      font-size: 12px;
    }
    &__sources small {
      font-size: 10px;
    }
    &__action-bar {
      position: sticky;
      bottom: 0;
      padding: 12px 0;
      background: var(--s-color-utility-surface);
      z-index: 2;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none !important;
    }
  }
}
</style>
