<template>
  <section class="bot-playground research-workspace" data-testid="bot-playground" :aria-busy="pending">
    <header class="playground-heading">
      <div>
        <span class="workspace-kicker">{{ t('bots.research.kicker') }}</span>
        <h2>{{ t('bots.research.title') }}</h2>
        <p>{{ t('bots.research.subtitle') }}</p>
      </div>
      <div class="research-history-range" data-testid="research-history-range">
        <strong>{{ t('bots.research.verifiedHistory') }}</strong>
        <span>{{ t('bots.research.historyRange', { start: historyStartLabel, end: historyEndLabel }) }}</span>
      </div>
    </header>
    <div class="research-pair-controls">
      <label
        ><span>{{ t('bots.flow.startingToken') }}</span
        ><select v-model="settings.assetInAddress" data-testid="research-token-in">
          <option
            v-for="asset in assets"
            :key="asset.address"
            :value="asset.address"
            :disabled="asset.address === settings.assetOutAddress"
          >
            {{ asset.symbol }}
          </option>
        </select></label
      ><button
        class="pair-arrow"
        data-testid="research-reverse-pair"
        :aria-label="t('ux.swap.reverseTokens')"
        @click="reversePair"
      >
        ⇄</button
      ><label
        ><span>{{ t('bots.flow.acquiredToken') }}</span
        ><select v-model="settings.assetOutAddress" data-testid="research-token-out">
          <option
            v-for="asset in assets"
            :key="asset.address"
            :value="asset.address"
            :disabled="asset.address === settings.assetInAddress"
          >
            {{ asset.symbol }}
          </option>
        </select></label
      >
      <p data-testid="research-pair-explanation">
        {{
          t('bots.flow.pairExplanation', {
            input: capitalAsset?.symbol || '—',
            output: tradedAsset?.symbol || '—',
          })
        }}
      </p>
    </div>
    <div class="playground-presets" role="group" :aria-label="t('bots.playground.settings')">
      <button
        v-for="(preset, index) in presets"
        :key="preset"
        :data-testid="`playground-preset-${preset}`"
        :aria-pressed="settings.preset === preset"
        @click="settings.preset = preset"
      >
        <span class="preset-index" aria-hidden="true">0{{ index + 1 }}</span
        ><span>{{ t(`bots.playground.presets.${preset}`) }}</span
        ><span class="preset-arrow" aria-hidden="true">↗</span>
      </button>
    </div>
    <div class="playground-body">
      <div class="playground-result">
        <div class="chart-heading">
          <div class="chart-context">
            <strong>{{ pairLabel }}</strong
            ><span class="source-label" data-testid="playground-data-label"
              ><i aria-hidden="true" />{{ t(provenanceKey) }}</span
            >
          </div>
        </div>
        <div class="research-metrics" :data-processed-trades="candidateTrades.length">
          <div>
            <span>{{ t('bots.research.portfolioReturn') }}</span
            ><strong data-testid="playground-return" :class="outcomeClass(studyResult?.returnPercent ?? '0')"
              >{{ displayedReturn }}<small>%</small></strong
            ><small>{{
              calculating && researchProgress
                ? `${t('bots.lab.status.running')} ${Math.floor((researchProgress.completed / Math.max(1, researchProgress.total)) * 100)}%`
                : t('bots.research.fullPeriod')
            }}</small>
          </div>
          <div>
            <span>{{ t('bots.uxResults.maxDrawdown') }}</span>
            <strong
              data-testid="research-max-drawdown"
              :class="{ negative: studyResult && new FPNumber(studyResult.drawdownPercent).gt(FPNumber.ZERO) }"
              >{{ currentDrawdown }}<small>%</small></strong
            >
            <small>{{ t('bots.research.fullPeriod') }}</small>
          </div>
          <div>
            <span>{{ t('bots.uxResults.simulatedFills') }}</span>
            <strong data-testid="research-executions">{{ visibleTrades }}</strong>
            <small>{{ t('bots.research.fullPeriod') }}</small>
          </div>
          <div>
            <span>{{ t('bots.validationInsights.latestTest') }}</span>
            <strong
              data-testid="research-latest-test"
              :class="outcomeClass(lastValidationFold?.test.returnPercent ?? '0')"
              >{{ lastValidationFold ? signed(lastValidationFold.test.returnPercent) : '—' }}<small>%</small></strong
            >
            <small>{{
              t(
                lastValidationFold
                  ? lastValidationFold.test.trades
                    ? 'bots.uxResults.testPeriod'
                    : 'bots.uxResults.noHeldOutFills'
                  : settings.validation === 'none'
                    ? 'bots.uxResults.notTested'
                    : 'bots.validationInsights.awaiting'
              )
            }}</small>
          </div>
        </div>
        <div ref="distributionAnchor" class="distribution-anchor">
          <TradeDistribution
            v-if="studyBot"
            ref="distributionView"
            live
            :calculation="researchProgress"
            :calculating="calculating"
            :paused="!active"
            :trades="candidateTrades"
            :selected-trade-id="selectedTradeId"
            :symbol="studyBot.assetIn.symbol"
            :output-symbol="studyBot.assetOut.symbol"
            :evidence-assets="[studyBot.assetIn, studyBot.assetOut, studyBot.policy.feeAsset]"
            @select="selectTrade"
          />
          <div v-else class="distribution-empty" role="status">
            <p>
              {{
                t(
                  pending
                    ? 'bots.playground.loadingHistory'
                    : feeError && !error
                      ? 'bots.research.feeUnavailable'
                      : error || 'bots.research.noResults'
                )
              }}
            </p>
            <p v-if="historyRangeError" data-testid="research-history-unavailable">
              {{
                t('bots.research.historyUnavailableRange', {
                  start:
                    historyRangeError.availableStartAt === null ? '—' : utcLabel(historyRangeError.availableStartAt),
                  end: historyRangeError.availableEndAt === null ? '—' : utcLabel(historyRangeError.availableEndAt),
                })
              }}
            </p>
          </div>
        </div>
        <div v-if="studyBot" class="cost-summary" data-testid="research-costs">
          <span>{{ t('bots.research.costsTitle') }}</span
          ><span
            >{{ t('bots.research.networkCosts') }} <b>{{ studyCosts?.networkFeeXor ?? '0' }} XOR</b></span
          ><span
            >{{ t('bots.research.swapCosts') }}
            <b data-testid="research-swap-cost-total"
              >{{ formatCost(studyCosts?.swapFeeInCapital ?? '0') }} {{ studyBot.assetIn.symbol }}</b
            ></span
          >
        </div>
        <div v-if="selectedTrade" class="trade-inspector" data-testid="research-inspector">
          <div class="inspector-title">
            <div>
              <span>{{ t('bots.research.trade') }} {{ selectedTrade.id }}</span>
              <h3>
                {{ t(selectedTrade.selected ? 'bots.research.selected' : 'bots.research.excluded') }}
                <small
                  >·
                  {{
                    t(selectedTrade.action === 'buy' ? 'bots.playground.tradeBuy' : 'bots.playground.tradeSell')
                  }}</small
                >
              </h3>
            </div>
            <strong :class="outcomeClass(selectedTrade.pnl)"
              >{{ signed(selectedTrade.pnl) }} {{ studyBot?.assetIn.symbol }}</strong
            >
          </div>
          <div class="trade-facts">
            <span
              >{{ t('bots.research.signalAt')
              }}<b>{{ new Date(selectedTrade.signalTimestamp).toLocaleString() }}</b></span
            ><span
              >{{ t('bots.research.entry')
              }}<b data-testid="research-entry-price"
                >{{ formatPrice(selectedTrade.price) }} · {{ dateLabel(selectedTrade.timestamp) }}</b
              ></span
            ><span
              >{{ t('bots.research.markedAt')
              }}<b data-testid="research-mark-price"
                >{{ formatPrice(selectedTrade.endPrice) }} · {{ dateLabel(selectedTrade.endTimestamp) }}</b
              ></span
            >
          </div>
          <ul class="constraint-list">
            <li v-for="check in selectedTrade.checks" :key="check.key" :class="{ passed: check.passed }">
              <span class="check-mark">{{ check.passed ? '✓' : '×' }}</span
              ><span>{{ t(`bots.research.checks.${check.key}`) }}</span
              ><small>{{ t(check.passed ? 'bots.research.passed' : 'bots.research.filtered') }}</small
              ><span v-if="check.actual || check.limit" class="check-values">{{ checkValue(check) }}</span>
            </li>
          </ul>
          <p>{{ t(selectedTrade.reason) }}</p>
          <div class="trade-costs">
            <span>{{ t('bots.research.networkCosts') }}: {{ selectedTrade.costs.networkFeeXor }} XOR</span
            ><span data-testid="research-trade-swap-cost"
              >{{ t('bots.research.swapCosts') }}: {{ formatCost(selectedTrade.costs.swapFeeInCapital) }}
              {{ studyBot?.assetIn.symbol }}</span
            >
          </div>
        </div>
        <StrategyFlow
          :settings="flowDecision && outcome ? outcome.settings : settings"
          :input-symbol="capitalAsset?.symbol"
          :input-decimals="capitalAsset?.decimals"
          :output-symbol="tradedAsset?.symbol"
          :decision="flowDecision"
          :calculating="calculating && researchProgress?.scope === 'study'"
          :active="active"
        />
        <section class="equity-detail">
          <h4>
            {{ t('bots.research.equityCurve') }}<span>{{ t('bots.playground.drawdown') }} {{ currentDrawdown }}%</span>
          </h4>
          <div class="playground-chart" data-testid="playground-chart">
            <svg viewBox="0 0 800 256" preserveAspectRatio="none" role="img" :aria-label="chartDescription">
              <defs>
                <linearGradient :id="`${chartId}-fill`" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="currentColor" stop-opacity=".14" />
                  <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
                <clipPath :id="`${chartId}-reveal`">
                  <rect x="0" y="0" width="800" height="256" />
                </clipPath>
              </defs>
              <g class="chart-grid" aria-hidden="true">
                <line v-for="y in [24, 82, 140, 198]" :key="y" x1="16" x2="784" :y1="y" :y2="y" />
              </g>
              <path v-if="benchmarkPath" :d="benchmarkPath" class="benchmark-path" />
              <g :clip-path="`url(#${chartId}-reveal)`">
                <path v-if="areaPath" :d="areaPath" :fill="`url(#${chartId}-fill)`" />
                <path v-if="equityPath" :d="equityPath" class="equity-path" />
                <g v-for="(marker, index) in markers" :key="`${marker.timestamp}-${index}`" class="trade-marker">
                  <title>
                    {{ t(marker.action === 'buy' ? 'bots.playground.tradeBuy' : 'bots.playground.tradeSell') }} ·
                    {{ marker.amount }} · {{ t(marker.reason) }}
                  </title>
                  <circle :cx="marker.x" :cy="marker.y" r="4.5" />
                  <path
                    :d="`M ${marker.x - 3} ${marker.action === 'buy' ? 237 : 231} L ${marker.x} ${marker.action === 'buy' ? 233 : 235} L ${marker.x + 3} ${marker.action === 'buy' ? 237 : 231}`"
                  />
                </g>
              </g>
              <line
                v-if="currentPoint"
                :x1="currentPoint.x"
                :x2="currentPoint.x"
                y1="15"
                y2="218"
                class="chart-cursor"
              />
              <circle v-if="currentPoint" :cx="currentPoint.x" :cy="currentPoint.y" r="5" class="current-point" />
            </svg>
            <div v-if="pending && !researchProgress" class="chart-loading" role="status">
              {{ t('bots.playground.loadingHistory') }}
            </div>
          </div>

          <div class="chart-timeline">
            <span>{{ firstDate }}</span
            ><span
              >{{ t('bots.playground.trades') }} <b data-testid="playground-trades">{{ visibleTrades }}</b></span
            ><span>{{ lastDate }}</span>
          </div>
        </section>
        <p class="data-note" data-testid="playground-data-note">
          {{
            t(
              outcome?.source.history.provenance?.kind === 'mixed-pool-spot-and-indexed'
                ? 'bots.research.mixedHistoryNote'
                : outcome?.source.history.provenance
                  ? 'bots.research.archiveHistoryNote'
                  : 'bots.playground.historyNote'
            )
          }}
          <span v-if="outcome" data-testid="research-available-range">{{
            t('bots.research.historyRange', {
              start: utcLabel(
                outcome.source.history.provenance?.availableStartAt ?? outcome.source.history.candles[0].timestamp
              ),
              end: utcLabel(
                outcome.source.history.provenance?.availableEndAt ?? outcome.source.history.candles.at(-1)!.timestamp
              ),
            })
          }}</span>
          <span v-if="outcome" data-testid="playground-history-coverage">
            {{ t('bots.playground.coverage') }}:
            {{ formatDecimal(new FPNumber(String(outcome.result.coverage)).mul(new FPNumber('100')).toString()) }}%
          </span>
        </p>
      </div>
      <form class="playground-settings" @submit.prevent="execute(true)">
        <div class="settings-description">
          <span>{{ t('bots.research.rules') }}</span>
          <p>{{ t(`bots.playground.descriptions.${settings.preset}`) }}</p>
        </div>
        <label class="capital-control"
          ><span>{{ t('bots.playground.capital') }}</span>
          <div class="input-unit">
            <input
              v-model="settings.capital"
              data-testid="playground-capital"
              inputmode="decimal"
              autocomplete="off"
              spellcheck="false"
              maxlength="80"
            /><strong>{{ capitalAsset?.symbol }}</strong>
          </div></label
        >
        <label class="trade-control"
          ><span
            >{{ t('bots.playground.tradeSize') }}<strong>{{ settings.tradePercent }}%</strong></span
          ><input
            v-model.number="settings.tradePercent"
            data-testid="playground-trade-percent"
            type="range"
            min="1"
            max="50"
            step="1"
        /></label>
        <label class="interval-control"
          ><span>{{ t('bots.lab.intervalBlocks') }}</span
          ><select v-model.number="settings.intervalBlocks" data-testid="playground-interval">
            <option v-for="blocks in intervals" :key="blocks" :value="blocks">{{ blocks }}</option>
          </select></label
        >
        <p class="field-note cadence-note" data-testid="research-cadence-explanation">
          <strong>{{ t('bots.flow.hourlyBacktest') }}</strong>
          {{ liveCadenceLabel }} {{ t('bots.flow.cadenceLimit') }}
        </p>
        <label v-if="settings.preset === 'threshold'" class="extra-control"
          ><span
            >{{ t('bots.playground.threshold') }}<strong>{{ settings.thresholdPercent }}%</strong></span
          ><input
            v-model.number="settings.thresholdPercent"
            data-testid="playground-threshold"
            type="range"
            min="0"
            max="50"
            step="1"
        /></label>
        <div v-if="settings.preset === 'sma'" class="window-controls extra-control">
          <label
            ><span>{{ t('bots.playground.fastWindow') }}</span
            ><input
              v-model.number="settings.fastWindow"
              data-testid="playground-fast"
              type="number"
              min="2"
              max="199" /></label
          ><label
            ><span>{{ t('bots.playground.slowWindow') }}</span
            ><input v-model.number="settings.slowWindow" data-testid="playground-slow" type="number" min="3" max="200"
          /></label>
        </div>
        <div class="window-controls">
          <label
            ><span>{{ t('bots.research.slippage') }}</span
            ><input v-model="settings.slippagePercent" inputmode="decimal" data-testid="research-slippage" /></label
          ><label
            ><span>{{ t('bots.research.feeReserve') }}</span
            ><input v-model="settings.feeBudgetXor" inputmode="decimal" data-testid="research-fee-budget"
          /></label>
        </div>
        <div class="window-controls">
          <label
            ><span>{{ t('bots.research.networkFee') }}</span
            ><small>{{ t('bots.playground.tradeBuy') }}</small
            ><output data-testid="research-network-fee">{{ fees?.networkFeeXor ?? '—' }}</output
            ><small>{{ t('bots.playground.tradeSell') }}</small
            ><output data-testid="research-sell-network-fee">{{ fees?.sellNetworkFeeXor ?? '—' }}</output></label
          ><label
            ><span>{{ t('bots.research.swapFee') }}</span
            ><small>{{ t('bots.playground.tradeBuy') }}</small
            ><output data-testid="research-swap-fee">{{
              fees ? new FPNumber(fees.swapFeePercent).toString() : '—'
            }}</output
            ><small>{{ t('bots.playground.tradeSell') }}</small
            ><output data-testid="research-sell-swap-fee">{{
              fees ? new FPNumber(fees.sellSwapFeePercent).toString() : '—'
            }}</output></label
          >
        </div>
        <div class="cost-note" data-testid="research-fee-provenance">
          {{ t(feesExpired ? 'bots.research.feeStale' : 'bots.research.liveFees') }}
          <ResearchFeeNote v-if="fees?.finalizedAt" :fees="fees" />
          <span v-else-if="fees">{{ t('bots.research.liveFeeNote', { block: fees.blockNumber }) }}</span>
        </div>
        <p v-if="feeError" class="playground-error" role="alert">{{ t('bots.research.feeUnavailable') }}</p>
        <div class="validation-settings">
          <h3>{{ t('bots.research.validationTitle') }}</h3>
          <label
            ><span>{{ t('bots.research.validationMethod') }}</span
            ><select v-model="settings.validation" data-testid="research-validation">
              <option value="none">{{ t('bots.research.validationNone') }}</option>
              <option value="holdout">{{ t('bots.research.validationHoldout') }}</option>
              <option value="walk-forward">{{ t('bots.research.validationWalkForward') }}</option>
            </select></label
          >
          <template v-if="settings.validation !== 'none'"
            ><label class="trade-control"
              ><span
                >{{ t('bots.research.trainingShare') }}<strong>{{ settings.trainPercent }}%</strong></span
              ><input
                v-model.number="settings.trainPercent"
                type="range"
                min="50"
                max="80"
                step="5"
                data-testid="research-training-share" /></label
            ><label v-if="settings.validation === 'walk-forward'"
              ><span>{{ t('bots.research.folds') }}</span
              ><select v-model.number="settings.folds" data-testid="research-folds">
                <option v-for="count in [2, 3, 4, 5]" :key="count" :value="count">{{ count }}</option>
              </select></label
            ><label class="check-control"
              ><input v-model="settings.optimize" type="checkbox" data-testid="research-optimize" />{{
                t('bots.research.optimize')
              }}</label
            ></template
          >
        </div>
        <div class="playground-actions">
          <button class="run-button" data-testid="playground-run" type="submit" :disabled="pending">
            <span>{{ t(pending ? 'bots.playground.loadingHistory' : 'bots.research.run') }}</span
            ><span aria-hidden="true">↗</span>
          </button>
        </div>
        <p v-if="!canSave && outcome && !pending" class="field-note">{{ t('bots.research.stale') }}</p>
        <p v-if="error" data-testid="playground-error" class="playground-error" role="alert">{{ t(error) }}</p>
        <div class="save-research">
          <h3>{{ t('bots.research.createTitle') }}</h3>
          <label
            ><span>{{ t('bots.name') }}</span
            ><input
              v-model="botName"
              maxlength="60"
              :placeholder="t(`bots.playground.presets.${settings.preset}`)"
              data-testid="research-bot-name" /></label
          ><button
            class="save-button"
            data-testid="playground-save"
            type="button"
            :disabled="!canSave || saving"
            @click="save"
          >
            {{ t(saving ? 'bots.playground.saving' : 'bots.research.create') }} <span aria-hidden="true">→</span>
          </button>
          <p>{{ t('bots.research.saveNote') }}</p>
        </div>
      </form>
    </div>
    <section class="validation-results" data-testid="research-validation-results">
      <ValidationReport
        :validation="outcome?.validation"
        :progress="pending ? researchProgress : null"
        :active="active"
      />
      <p v-if="outcome?.validation.tuned" class="training-result">
        {{ t('bots.research.searchNote') }}
        <button data-testid="research-apply-trained" :disabled="!canSave" @click="applyRecommended">
          {{ t('bots.research.applyTrained') }}
        </button>
      </p>
    </section>
    <section class="trade-ledger" data-testid="research-ledger">
      <div class="section-title">
        <div>
          <span class="workspace-kicker">03 / {{ t('bots.research.audit') }}</span>
          <h3>
            {{ t('bots.research.filters.all') }} <small>{{ outcome?.candidates.length ?? 0 }}</small>
          </h3>
        </div>
        <label class="ledger-filter"
          ><span>{{ t('bots.research.show') }}</span
          ><select v-model="tradeFilter" data-testid="research-trade-filter">
            <option
              v-for="filter in ['all', 'selected', 'excluded', 'winners', 'losers']"
              :key="filter"
              :value="filter"
            >
              {{ t(`bots.research.filters.${filter}`) }}
            </option>
          </select></label
        >
      </div>
      <p>{{ t('bots.research.ledgerNote') }}</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{{ t('bots.research.trade') }}</th>
              <th>{{ t('bots.research.entryDate') }}</th>
              <th>{{ t('bots.research.direction') }}</th>
              <th>{{ t('bots.research.selection') }}</th>
              <th>{{ t('bots.research.constraints') }}</th>
              <th>{{ t('bots.research.outcome') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trade in pageTrades" :key="trade.id" :class="{ 'active-trade': trade.id === selectedTradeId }">
              <td>
                <button @click="selectedTradeId = trade.id">{{ trade.id }}</button>
              </td>
              <td>{{ new Date(trade.timestamp).toLocaleString() }}</td>
              <td>{{ t(trade.action === 'buy' ? 'bots.playground.tradeBuy' : 'bots.playground.tradeSell') }}</td>
              <td>
                <span class="selection-dot" :class="{ included: trade.selected }" />{{
                  t(trade.selected ? 'bots.research.selected' : 'bots.research.excluded')
                }}
              </td>
              <td>
                <span
                  v-for="check in trade.checks"
                  :key="check.key"
                  :title="t(`bots.research.checks.${check.key}`)"
                  :aria-label="`${t(`bots.research.checks.${check.key}`)}: ${t(check.passed ? 'bots.research.passed' : 'bots.research.filtered')}`"
                  class="ledger-check"
                  :class="{ passed: check.passed }"
                  >{{ check.passed ? '✓' : '×' }}</span
                >
              </td>
              <td :class="outcomeClass(trade.pnl)">{{ signed(trade.pnl) }} {{ studyBot?.assetIn.symbol }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!filteredTrades.length">{{ t('bots.research.noTrades') }}</p>
      <div class="ledger-pagination">
        <span>{{
          t('bots.research.page', { current: tradePage + 1, total: pageCount, count: filteredTrades.length })
        }}</span
        ><button :disabled="tradePage === 0" @click="tradePage--">{{ t('bots.research.previous') }}</button
        ><button :disabled="tradePage + 1 >= pageCount" @click="tradePage++">{{ t('bots.research.next') }}</button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { FPNumber } from '@/lib/substrate/math';
import { fromCodec } from '../amounts';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { createPlaygroundBot, type PlaygroundSettings } from '../playground';
import {
  RESEARCH_DEFAULT_SETTINGS,
  runResearchAsync,
  awaitResearchPaint,
  type ResearchSettings,
  type ResearchCheck,
  type ResearchResult,
  type ResearchProgress,
  type ResearchCandidate,
} from '../research';
import type { ResearchFeeOptions, ResearchFeeSnapshot } from '../research-fees';
import ResearchFeeNote from './ResearchFeeNote.vue';
import { BotHistoryRangeError } from '../playground-history';
import TradeDistribution from './TradeDistribution.vue';
import StrategyFlow from './StrategyFlow.vue';
import ValidationReport from './ValidationReport.vue';
import type { BotAsset, BotDefinition, BotHistory, BotResearchSnapshot, BacktestTrade } from '../types';
import type { BotStrategyPreset } from '../navigation';

/** Unsigned, ephemeral simulation surface. Only the explicit save event can leave this component. */
const props = withDefaults(
  defineProps<{
    assets: BotAsset[];
    loadHistory?: (bot: BotDefinition, settings: PlaygroundSettings) => Promise<BotHistory>;
    loadFees?: (
      bot: BotDefinition,
      settings: ResearchSettings,
      options?: ResearchFeeOptions
    ) => Promise<ResearchFeeSnapshot>;
    saving?: boolean;
    active?: boolean;
    strategyPreset?: BotStrategyPreset;
  }>(),
  { saving: false, active: true }
);
const emit = defineEmits<{
  save: [bot: BotDefinition, settings: ResearchSettings, research: BotResearchSnapshot];
  navigate: [strategy: BotStrategyPreset];
}>();
const distributionView = ref<{ waitForCheckpoint(checkpoint: number, signal?: AbortSignal): Promise<void> }>();
const { t } = useTranslation();
const distributionAnchor = ref<HTMLElement>();
const chartId = `playground-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
const presets = ['dca', 'threshold', 'sma'] as const;
const intervals = [1, 2, 5, 10, 25, 50, 100, 600];
const settings = reactive<ResearchSettings>({
  ...RESEARCH_DEFAULT_SETTINGS,
  preset: props.strategyPreset ?? RESEARCH_DEFAULT_SETTINGS.preset,
  assetInAddress: XOR.address,
  assetOutAddress: VAL.address,
});
/** A strategy URL restores the unsigned historical preview without starting or saving a bot. */
watch(
  () => props.strategyPreset,
  (preset) => {
    if (preset !== undefined) settings.preset = preset;
  }
);
watch(
  () => settings.preset,
  (preset) => {
    if (preset !== props.strategyPreset) emit('navigate', preset);
  }
);
const outcome = shallowRef<ResearchResult | null>(null);
const researchProgress = shallowRef<ResearchProgress | null>(null);
const processedCandidates = shallowRef<ResearchCandidate[]>([]);
const processedMarkers = shallowRef<BacktestTrade[]>([]);
const studyBot = computed(() => outcome.value?.bot ?? researchProgress.value?.bot);
const studyResult = computed(() => outcome.value?.result ?? researchProgress.value?.result);
const lastValidationFold = computed(() => outcome.value?.validation.folds.at(-1));
const studyCosts = computed(() => outcome.value?.costs ?? researchProgress.value?.costs);
const candidateTrades = computed(() => outcome.value?.candidates ?? processedCandidates.value);
const calculating = computed(() => pending.value && !!researchProgress.value);
let computation: AbortController | undefined;
const pending = ref(false);

const error = ref('');
const completedSettings = ref('');
const reducedMotion = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let mounted = false;
let motionQuery: MediaQueryList | undefined;
const fees = shallowRef<ResearchFeeSnapshot | null>(null);
const feesExpired = ref(false);
const feeError = ref(false);
const historyRangeError = shallowRef<BotHistoryRangeError | null>(null);
let feeExpiryTimer: ReturnType<typeof setTimeout> | undefined;
const historyEndAt = ref(Math.floor(Date.now() / 3_600_000) * 3_600_000);
/** Display explicit UTC observations without locale-dependent date ambiguity. */
const utcLabel = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
const historyStartLabel = computed(() =>
  utcLabel(outcome.value?.source.history.candles[0]?.timestamp ?? settings.historyStartAt!)
);
const historyEndLabel = computed(() =>
  utcLabel(outcome.value?.source.history.candles.at(-1)?.timestamp ?? historyEndAt.value)
);
const capitalAsset = computed(() => props.assets.find((asset) => asset.address === settings.assetInAddress));
const tradedAsset = computed(() => props.assets.find((asset) => asset.address === settings.assetOutAddress));
/** Historical bars retain hourly resolution regardless of the configured live interval. */
const liveCadenceLabel = computed(() =>
  settings.intervalBlocks === undefined
    ? t('bots.flow.liveHours', { hours: settings.intervalHours })
    : settings.intervalBlocks >= 600 && settings.intervalBlocks % 600 === 0
      ? t('bots.flow.liveHours', { hours: settings.intervalBlocks / 600 })
      : t('bots.flow.liveBlocks', { blocks: settings.intervalBlocks, seconds: settings.intervalBlocks * 6 })
);
const botName = ref('');
const tradeFilter = ref<'all' | 'selected' | 'excluded' | 'winners' | 'losers'>('all');
const tradePage = ref(0);
const selectedTradeId = ref('');
const signature = computed(() => {
  const {
    networkFeeXor: _networkFee,
    swapFeePercent: _swapFee,
    sellNetworkFeeXor: _sellNetworkFee,
    sellSwapFeePercent: _sellSwapFee,
    priceImpactPercent: _priceImpact,
    sellPriceImpactPercent: _sellPriceImpact,
    ...configuration
  } = settings;
  return JSON.stringify([configuration, props.assets]);
});
const canSave = computed(
  () =>
    !!outcome.value &&
    !!fees.value &&
    !feesExpired.value &&
    !pending.value &&
    !error.value &&
    !feeError.value &&
    completedSettings.value === signature.value
);
const pairLabel = computed(() =>
  studyBot.value ? `${studyBot.value.assetOut.symbol} / ${studyBot.value.assetIn.symbol}` : ''
);

/** Convert to display text after precise arithmetic; numeric coordinates never feed token execution. */
function formatDecimal(value: string): string {
  const amount = new FPNumber(value);
  return amount.isFinity() ? amount.toFixed(2) : '—';
}
/** Preserve six significant price digits without converting exact values to floating point. */
function formatPrice(value: string): string {
  const amount = new FPNumber(value, 36);
  return amount.isFinity() ? amount.value.precision(6, 4).toFixed() : '—';
}
/** Round displayed costs half up; sub-cent fees retain significant digits instead of appearing free. */
function formatCost(value: string): string {
  const amount = new FPNumber(value, 36);
  if (!amount.isFinity()) return '—';
  return !amount.isZero() && amount.abs().lt(new FPNumber('0.01')) ? formatPrice(value) : amount.value.toFixed(2, 4);
}
function dateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const points = computed(() => {
  const equity = studyResult.value?.equity ?? [];
  if (!equity.length) return [];
  const values = equity.flatMap((point) => [new FPNumber(point.value), new FPNumber(point.benchmark)]);
  const low = values.reduce((a, b) => (a.lt(b) ? a : b));
  const high = values.reduce((a, b) => (a.gt(b) ? a : b));
  const spread = high.sub(low);
  let peak = new FPNumber(equity[0].value);
  let drawdown = new FPNumber('0');
  const y = (value: string) =>
    spread.isZero() ? 116 : 198 - Number(new FPNumber(value).sub(low).div(spread).toString()) * 174;
  return equity.map((point, index) => {
    const value = new FPNumber(point.value);
    if (value.gt(peak)) peak = value;
    if (!peak.isZero()) {
      const next = peak.sub(value).div(peak).mul(new FPNumber('100'));
      if (next.gt(drawdown)) drawdown = next;
    }
    return {
      ...point,
      x: 16 + (index / Math.max(1, equity.length - 1)) * 768,
      y: y(point.value),
      benchmarkY: y(point.benchmark),
      drawdown: drawdown.toFixed(2),
    };
  });
});
const path = (field: 'y' | 'benchmarkY') =>
  points.value.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point[field].toFixed(2)}`).join(' ');
const equityPath = computed(() => path('y'));
const benchmarkPath = computed(() => path('benchmarkY'));
const areaPath = computed(() => (equityPath.value ? `${equityPath.value} L784 218 L16 218 Z` : ''));
const currentPoint = computed(() => points.value.at(-1));
const markers = computed(() =>
  (outcome.value?.tradeMarkers ?? processedMarkers.value).map((marker) => {
    const point = points.value.find((point) => point.timestamp >= marker.timestamp) ?? points.value.at(-1);
    return { ...marker, x: point?.x ?? 16, y: point?.y ?? 116 };
  })
);
const visibleTrades = computed(() => studyResult.value?.trades ?? '—');
const currentValue = computed(() => (currentPoint.value ? formatDecimal(currentPoint.value.value) : '—'));
const displayedReturn = computed(() => (studyResult.value ? signed(studyResult.value.returnPercent) : '—'));
const currentDrawdown = computed(() => (studyResult.value ? formatDecimal(studyResult.value.drawdownPercent) : '—'));
const firstDate = computed(() => (points.value.length ? dateLabel(points.value[0].timestamp) : ''));
const lastDate = computed(() => (points.value.length ? dateLabel(points.value.at(-1)!.timestamp) : ''));
const chartDescription = computed(() =>
  t('bots.playground.chartSummary', {
    value: currentValue.value,
    symbol: studyBot.value?.assetIn.symbol ?? '',
    date: currentPoint.value ? dateLabel(currentPoint.value.timestamp) : '',
  })
);

/** Require real history and explicitly dated finalized fee assumptions for a historical simulation. */
async function execute(reveal = false): Promise<void> {
  clearTimeout(debounceTimer);
  clearTimeout(feeExpiryTimer);
  computation?.abort();
  computation = new AbortController();
  const signal = computation.signal;
  const request = ++generation;
  const requestedSignature = signature.value;
  historyEndAt.value = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const snapshot = { ...settings, historyEndAt: historyEndAt.value };
  error.value = '';
  feeError.value = false;
  historyRangeError.value = null;
  outcome.value = null;
  fees.value = null;
  feesExpired.value = false;
  researchProgress.value = null;
  processedCandidates.value = [];
  processedMarkers.value = [];
  pending.value = true;
  try {
    const bot = createPlaygroundBot(snapshot, props.assets);
    const [historyResult, feeResult] = await Promise.allSettled([
      props.loadHistory ? props.loadHistory(bot, snapshot) : Promise.reject(new Error('bots.errors.history')),
      props.loadFees
        ? props.loadFees(bot, snapshot, { allowHistoricalFinalizedState: true })
        : Promise.reject(new Error('bots.errors.fee')),
    ]);
    if (!mounted || request !== generation || signature.value !== requestedSignature) return;
    if (feeResult.status === 'fulfilled' && feeResult.value.expiresAt > Date.now()) {
      fees.value = feeResult.value;
      feeExpiryTimer = setTimeout(() => {
        feesExpired.value = true;
      }, feeResult.value.expiresAt - Date.now());
    } else feeError.value = true;
    if (historyResult.status === 'rejected') {
      if (historyResult.reason instanceof BotHistoryRangeError) historyRangeError.value = historyResult.reason;
      throw historyResult.reason;
    }
    if (feeError.value || !fees.value) return;
    const identity = historyResult.value.identity;
    if (
      !identity ||
      identity.genesisHash !== fees.value.genesisHash ||
      identity.denominator !== fees.value.denominator ||
      fees.value.assetInAddress !== bot.assetIn.address ||
      fees.value.assetOutAddress !== bot.assetOut.address ||
      fees.value.amountIn !== bot.strategy.amount
    ) {
      feeError.value = true;
      return;
    }
    const liveSettings = {
      ...snapshot,
      networkFeeXor: fees.value.networkFeeXor,
      swapFeePercent: fees.value.swapFeePercent,
      sellNetworkFeeXor: fees.value.sellNetworkFeeXor,
      sellSwapFeePercent: fees.value.sellSwapFeePercent,
      priceImpactPercent: fees.value.priceImpactPercent,
      sellPriceImpactPercent: fees.value.sellPriceImpactPercent,
    };
    const result = await runResearchAsync(
      liveSettings,
      props.assets,
      { kind: 'historical', history: historyResult.value },
      Date.now(),
      {
        signal,
        awaitProgress: async (checkpoint) => {
          await nextTick();
          if (checkpoint.scope === 'study' && props.active && distributionView.value?.waitForCheckpoint)
            await distributionView.value.waitForCheckpoint(checkpoint.checkpoint, signal);
          else await awaitResearchPaint(signal);
        },
        onProgress: (checkpoint) => {
          if (
            !mounted ||
            signal.aborted ||
            request !== generation ||
            requestedSignature !== signature.value ||
            checkpoint.checkpoint <= (researchProgress.value?.checkpoint ?? -1)
          )
            return;
          const first = !researchProgress.value;
          researchProgress.value = checkpoint;
          // Validation retains the study array and yields a paint, keeping statistics and input responsive.
          if (checkpoint.candidates.length)
            processedCandidates.value = [...processedCandidates.value, ...checkpoint.candidates];
          if (checkpoint.tradeMarkers.length)
            processedMarkers.value = [...processedMarkers.value, ...checkpoint.tradeMarkers];
          selectedTradeId.value ||= checkpoint.candidates[0]?.id ?? '';
          if (first && reveal)
            void nextTick(() =>
              distributionAnchor.value?.scrollIntoView({
                behavior: reducedMotion.value ? 'instant' : 'smooth',
                block: 'start',
              })
            );
        },
      }
    );
    if (!mounted || signal.aborted || request !== generation || requestedSignature !== signature.value) return;
    outcome.value = result;
    settings.networkFeeXor = liveSettings.networkFeeXor;
    settings.swapFeePercent = liveSettings.swapFeePercent;
    settings.sellNetworkFeeXor = liveSettings.sellNetworkFeeXor;
    settings.sellSwapFeePercent = liveSettings.sellSwapFeePercent;
    settings.priceImpactPercent = liveSettings.priceImpactPercent;
    settings.sellPriceImpactPercent = liveSettings.sellPriceImpactPercent;
    selectedTradeId.value = outcome.value.candidates[0]?.id ?? '';
    tradePage.value = 0;
    completedSettings.value = requestedSignature;
  } catch (failure) {
    if (request === generation) {
      error.value =
        failure instanceof Error && /^bots\.errors\.(config|amount|policy|budget)/.test(failure.message)
          ? 'bots.playground.validationError'
          : 'bots.playground.historyError';
      outcome.value = null;
      researchProgress.value = null;
      processedCandidates.value = [];
      processedMarkers.value = [];
    }
  } finally {
    if (request === generation) pending.value = false;
  }
}
/** Saving transfers a fresh paper definition, never simulated holdings or an execution request. */
function save(): void {
  if (!canSave.value || !outcome.value) return;
  const result = outcome.value;
  // The engine returns a fresh definition; the simulated portfolio is a separate value.
  const bot = structuredClone(result.bot);
  bot.name = botName.value.trim() || t(`bots.playground.presets.${settings.preset}`);
  const candles = result.source.history.candles;
  const research: BotResearchSnapshot = {
    version: 1,
    source: result.source.kind,
    testedAt: Date.now(),
    startAt: candles[0].timestamp,
    endAt: candles.at(-1)!.timestamp,
    coverage: result.result.coverage,
    validation: settings.validation,
    trainPercent: settings.trainPercent,
    folds: settings.folds,
    optimized: settings.optimize,
    returnPercent: result.result.returnPercent,
    drawdownPercent: result.result.drawdownPercent,
    trades: result.result.trades,
    networkFeeXor: result.settings.networkFeeXor,
    swapFeePercent: result.settings.swapFeePercent,
    sellNetworkFeeXor: result.settings.sellNetworkFeeXor,
    sellSwapFeePercent: result.settings.sellSwapFeePercent,
    priceImpactPercent: result.settings.priceImpactPercent,
    sellPriceImpactPercent: result.settings.sellPriceImpactPercent,
    feeObservation: fees.value
      ? {
          blockNumber: fees.value.blockNumber,
          blockHash: fees.value.blockHash,
          genesisHash: fees.value.genesisHash,
          endpoint: fees.value.endpoint,
          queriedAt: fees.value.queriedAt,
          ...(fees.value.finalizedAt === undefined ? {} : { finalizedAt: fees.value.finalizedAt }),
          amountIn: fees.value.amountIn,
          sellAmountIn: fees.value.sellAmountIn,
        }
      : undefined,
  };
  emit('save', bot, { ...settings }, research);
}

/** Reverse both sides atomically so a two-token asset list can always be traded in either direction. */
function reversePair(): void {
  const previous = settings.assetInAddress;
  settings.assetInAddress = settings.assetOutAddress;
  settings.assetOutAddress = previous;
}

/** Show every candidate through an accessible paginated ledger; display filters never change strategy rules. */
const filteredTrades = computed(() =>
  candidateTrades.value.filter((trade) => {
    if (tradeFilter.value === 'selected') return trade.selected;
    if (tradeFilter.value === 'excluded') return !trade.selected;
    if (tradeFilter.value === 'winners') return new FPNumber(trade.pnl).gt(FPNumber.ZERO);
    if (tradeFilter.value === 'losers') return new FPNumber(trade.pnl).lt(FPNumber.ZERO);
    return true;
  })
);
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTrades.value.length / 40)));
const pageTrades = computed(() => filteredTrades.value.slice(tradePage.value * 40, (tradePage.value + 1) * 40));
const selectedTrade = computed(() => candidateTrades.value.find((trade) => trade.id === selectedTradeId.value));
/** Explain only a decision belonging to the current settings; edited controls return to an explicit preview. */
const flowDecision = computed(() => {
  if (calculating.value)
    return researchProgress.value?.scope === 'study'
      ? researchProgress.value.decisions.at(-1)
      : processedCandidates.value.at(-1);
  if (!outcome.value || completedSettings.value !== signature.value) return undefined;
  return selectedTrade.value ?? outcome.value.candidates.at(-1);
});
const provenanceKey = 'bots.playground.historicalData';
/** Only presentation rounds decimal values; signed amount calculations stay in the engine. */
function signed(value: string): string {
  return `${new FPNumber(value).gt(FPNumber.ZERO) ? '+' : ''}${formatDecimal(value)}`;
}
/** Color encodes outcome only, independently of whether a strategy selected the trade. */
function outcomeClass(value: string): string {
  const amount = new FPNumber(value);
  return amount.gt(FPNumber.ZERO) ? 'positive' : amount.lt(FPNumber.ZERO) ? 'negative' : '';
}
/** Selecting a ball also makes its ledger row reachable without dropping other trades. */
function selectTrade(id: string): void {
  selectedTradeId.value = id;
  tradeFilter.value = 'all';
  const index = candidateTrades.value.findIndex((trade) => trade.id === id) ?? 0;
  tradePage.value = Math.max(0, Math.floor(index / 40));
}
/** Render gate evidence in natural token units or hours, never raw codec strings. */
function checkValue(check: ResearchCheck): string {
  if (!studyBot.value || !selectedTrade.value) return '';
  if (check.key === 'goal') return check.reason ? String(t(check.reason)) : '';
  if (check.key === 'priceImpact')
    return `${formatDecimal(check.actual ?? '0')}% / ${formatDecimal(check.limit ?? '0')}%`;
  if (check.key === 'cooldown')
    return `${check.actual ? formatDecimal(new FPNumber(check.actual).div(new FPNumber('3600000')).toString()) : '—'} / ${formatDecimal(new FPNumber(check.limit ?? '0').div(new FPNumber('3600000')).toString())} h`;
  const evidenceAsset = [studyBot.value.assetIn, studyBot.value.assetOut, studyBot.value.policy.feeAsset].find(
    (asset) => asset.address === check.assetAddress
  );
  const asset =
    evidenceAsset ??
    (check.key === 'feeBudget'
      ? studyBot.value.policy.feeAsset
      : selectedTrade.value.action === 'buy'
        ? studyBot.value.assetIn
        : studyBot.value.assetOut);
  return `${formatDecimal(fromCodec(check.actual ?? '0', asset.decimals))} / ${formatDecimal(fromCodec(check.limit ?? '0', asset.decimals))} ${asset.symbol}`;
}
/** Replay the latest training choice without reusing earlier folds as unseen tests. */
function applyRecommended(): void {
  if (!outcome.value || !canSave.value) return;
  // Later walk-forward training includes earlier test windows. Applying that
  // choice can inspect the full period, but cannot relabel those windows unseen.
  Object.assign(settings, outcome.value.recommendedSettings, { validation: 'none', optimize: false });
}
watch(
  tradeFilter,
  () => {
    tradePage.value = 0;
  },
  { flush: 'sync' }
);
function onMotionPreference(event: MediaQueryListEvent): void {
  reducedMotion.value = event.matches;
}
watch(signature, () => {
  if (!mounted) return;
  ++generation;
  computation?.abort();
  clearTimeout(debounceTimer);
  pending.value = false;
  debounceTimer = setTimeout(() => {
    void execute();
  }, 180);
});
onMounted(() => {
  mounted = true;
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  reducedMotion.value = motionQuery?.matches ?? false;
  motionQuery?.addEventListener('change', onMotionPreference);
  void execute();
});
onBeforeUnmount(() => {
  mounted = false;
  ++generation;
  computation?.abort();
  clearTimeout(debounceTimer);
  clearTimeout(feeExpiryTimer);
  motionQuery?.removeEventListener('change', onMotionPreference);
});
</script>

<style scoped lang="scss">
.bot-playground {
  --playground-accent: var(--s-color-theme-accent, #f8087b);
  --playground-muted: var(--s-color-base-content-secondary, #80757b);
  --playground-border: var(--s-color-base-border-secondary, #eae4e8);
  color: var(--s-color-base-content-primary, #30232a);
  min-width: 0;
  button,
  input,
  select {
    font: inherit;
  }
  button {
    cursor: pointer;
    color: inherit;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--playground-accent);
    outline-offset: 4px;
  }
  input,
  select {
    color: inherit;
    min-width: 0;
  }
}
.playground-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}
.playground-heading h2 {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.7px;
  margin: 0 0 7px;
}
.playground-heading p {
  color: var(--playground-muted);
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
}
.source-switch {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--playground-border);
  border-radius: 7px;
}
.source-switch button {
  padding: 8px 12px;
  font-size: 11px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  white-space: nowrap;
}
.source-switch button[aria-pressed='true'] {
  background: var(--s-color-utility-surface, #fff);
  box-shadow: 0 1px 4px #30232a0d;
}
.playground-presets {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  border-bottom: 1px solid var(--playground-border);
}
.playground-presets button {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px 13px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  text-align: left;
  font-size: 13px;
  transition:
    color 0.18s,
    border-color 0.18s;
}
.playground-presets button[aria-pressed='true'] {
  color: var(--playground-accent);
  border-bottom-color: var(--playground-accent);
}
.preset-index {
  font-size: 10px;
  color: var(--playground-muted);
}
.preset-arrow {
  margin-left: auto;
  font-size: 18px;
}
.playground-body {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr)'} 234px;
}
.playground-result {
  min-width: 0;
  padding: 27px 30px 0 0;
}
.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.chart-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 13px;
  font-size: 13px;
}
.source-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--playground-muted);
  font-size: 10px;
}
.source-label i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--playground-accent);
}
.period-switch {
  display: flex;
  gap: 3px;
}
.period-switch button {
  background: transparent;
  border: 0;
  border-radius: 4px;
  padding: 7px;
  color: var(--playground-muted);
  font-size: 11px;
}
.period-switch button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--playground-accent) 7%, transparent);
  color: var(--playground-accent);
}
.result-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 25px;
}
.return-metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.return-metric > span {
  color: var(--playground-muted);
  font-size: 11px;
}
.return-metric > strong {
  font-size: 42px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
}
.return-metric small {
  font-size: 24px;
  margin-left: 3px;
}
.chart-legend {
  display: flex;
  gap: 14px;
  color: var(--playground-muted);
  font-size: 10px;
  padding-bottom: 4px;
}
.chart-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.chart-legend i {
  display: inline-block;
  width: 15px;
  height: 0;
  border-top: 2px solid var(--playground-accent);
}
.chart-legend .benchmark-line {
  border-top-style: dashed;
  border-top-color: var(--playground-muted);
  opacity: 0.7;
}
.playground-chart {
  position: relative;
  height: 260px;
  margin-top: 18px;
  color: var(--playground-accent);
}
.playground-chart svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chart-grid line {
  stroke: var(--playground-border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.equity-path,
.benchmark-path {
  fill: none;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.equity-path {
  stroke: currentColor;
  stroke-width: 2.3;
}
.benchmark-path {
  stroke: var(--playground-muted);
  stroke-width: 1;
  stroke-dasharray: 4 5;
  opacity: 0.42;
}
.trade-marker circle {
  fill: var(--s-color-base-background, #fff);
  stroke: currentColor;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
.trade-marker path {
  stroke: currentColor;
  fill: none;
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
  opacity: 0.55;
}
.chart-cursor {
  stroke: currentColor;
  stroke-width: 1;
  stroke-dasharray: 2 5;
  opacity: 0.24;
  vector-effect: non-scaling-stroke;
}
.current-point {
  fill: currentColor;
  stroke: var(--s-color-base-background, #fff);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.chart-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  color: var(--playground-muted);
  font-size: 12px;
  background: color-mix(in srgb, var(--s-color-base-background, #fff) 86%, transparent);
}
.chart-timeline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 10px;
  color: var(--playground-muted);
}
.replay-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.replay-controls button {
  display: grid;
  place-content: center;
  border: 0;
  background: none;
  width: 30px;
  height: 30px;
  font-size: 20px;
}
.replay-controls input {
  width: 110px;
  height: 3px;
  accent-color: var(--playground-accent);
  cursor: pointer;
}
.playground-metrics {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  border-top: 1px solid var(--playground-border);
  margin: 20px 0 0;
  padding: 18px 0 15px;
}
.playground-metrics dt {
  color: var(--playground-muted);
  font-size: 10px;
  margin-bottom: 7px;
}
.playground-metrics dd {
  margin: 0;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.4px;
}
.playground-metrics small {
  font-size: 10px;
  color: var(--playground-muted);
}
.data-note {
  color: var(--playground-muted);
  font-size: 10px;
  line-height: 1.7;
  margin: 0;
}
.data-note > span {
  display: block;
}
.playground-settings {
  display: flex;
  flex-direction: column;
  gap: 25px;
  border-left: 1px solid var(--playground-border);
  padding: 28px 0 0 27px;
}
.settings-description > span {
  font-size: 11px;
  font-weight: 600;
}
.settings-description p {
  margin: 9px 0 0;
  color: var(--playground-muted);
  font-size: 11px;
  line-height: 1.7;
}
.playground-settings label {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.playground-settings label > span {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  color: var(--playground-muted);
}
.playground-settings label strong {
  color: var(--s-color-base-content-primary, #30232a);
  font-weight: 500;
}
.input-unit {
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid var(--playground-border);
  padding-bottom: 9px;
}
.input-unit input {
  width: 100%;
  font-size: 22px;
  border: 0;
  background: none;
  outline-offset: 2px;
}
.input-unit strong {
  font-size: 11px;
}
.playground-settings input[type='range'] {
  width: 100%;
  accent-color: var(--playground-accent);
  height: 4px;
  margin: 5px 0;
}
.playground-settings select,
.window-controls input {
  width: 100%;
  border: 1px solid var(--playground-border);
  border-radius: 5px;
  padding: 9px;
  background: transparent;
  font-size: 12px;
}
.window-controls {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  gap: 12px;
}
.playground-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 7px;
}
.run-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  padding: 13px 15px;
  border-radius: 6px;
  color: #fff !important;
  background: var(--playground-accent);
  font-size: 12px;
}
.run-button > span:last-child {
  font-size: 17px;
}
.save-button {
  border: 1px solid var(--playground-border);
  background: transparent;
  padding: 11px;
  border-radius: 6px;
  font-size: 11px;
}
.no-wallet {
  text-align: center;
  font-size: 9px;
  color: var(--playground-muted);
  line-height: 1.7;
}
.playground-error {
  font-size: 12px;
  line-height: 1.6;
  border-left: 2px solid var(--playground-accent);
  padding-left: 12px;
  margin: 20px 0 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1000px) {
  .playground-body {
    grid-template-columns: #{'minmax(0, 1fr)'} 205px;
  }
  .playground-result {
    padding-right: 20px;
  }
  .playground-settings {
    padding-left: 20px;
  }
  .chart-context {
    gap: 7px;
  }
  .source-label {
    font-size: 9px;
  }
}
@media (max-width: 700px) {
  .playground-heading {
    align-items: flex-start;
    margin-bottom: 15px;
    gap: 10px;
  }
  .playground-heading h2 {
    font-size: 20px;
    margin-bottom: 5px;
  }
  .playground-heading p {
    display: none;
  }
  .source-switch {
    padding: 2px;
  }
  .source-switch button {
    font-size: 10px;
    min-height: 32px;
    padding: 7px 8px;
  }
  .playground-presets button {
    gap: 5px;
    padding: 12px 4px;
    font-size: 10px;
    line-height: 1.5;
  }
  .preset-index {
    display: none;
  }
  .preset-arrow {
    font-size: 14px;
  }
  .playground-body {
    display: flex;
    flex-direction: column;
  }
  .playground-result {
    display: contents;
    padding: 0;
  }
  .chart-heading {
    order: 1;
    margin-top: 17px;
    gap: 4px;
  }
  .chart-context {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    font-size: 11px;
  }
  .source-label {
    font-size: 10px;
  }
  .period-switch button {
    padding: 7px 5px;
    font-size: 10px;
  }
  .result-summary {
    order: 2;
    margin-top: 19px;
  }
  .return-metric > strong {
    font-size: 34px;
  }
  .return-metric small {
    font-size: 21px;
  }
  .chart-legend {
    font-size: 9px;
    gap: 9px;
  }
  .playground-chart {
    order: 3;
    height: 173px;
    margin-top: 11px;
  }
  .chart-timeline {
    order: 4;
    font-size: 9px;
  }
  .playground-metrics {
    order: 6;
    padding: 14px 0;
    margin-top: 18px;
  }
  .playground-metrics dd {
    font-size: 18px;
  }
  .data-note {
    order: 7;
    font-size: 10px;
  }
  .playground-settings {
    order: 5;
    display: grid;
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 16px 20px;
    border: 0;
    padding: 17px 0 0;
  }
  .settings-description {
    display: none;
  }
  .capital-control {
    order: 1;
  }
  .trade-control {
    order: 2;
  }
  .playground-settings label {
    gap: 8px;
  }
  .playground-settings label > span {
    font-size: 10px;
  }
  .input-unit {
    padding-bottom: 7px;
  }
  .input-unit input {
    font-size: 19px;
  }
  .interval-control {
    order: 4;
  }
  .extra-control {
    order: 5;
  }
  .playground-actions {
    order: 3;
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 9px;
    padding: 0;
    margin: 0;
  }
  .no-wallet {
    grid-column: 1 / -1;
    font-size: 8px;
  }
  .run-button {
    padding: 10px;
    font-size: 10px;
  }
  .save-button {
    padding: 10px 5px;
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bot-playground *,
  .bot-playground *::before,
  .bot-playground *::after {
    animation: none !important;
    transition: none !important;
  }
}

.research-workspace {
  --research-positive: var(--s-color-status-success-text);
  --research-negative: var(--s-color-status-error-text);
}
.workspace-kicker {
  color: var(--playground-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.research-workspace .playground-heading h2 {
  font-size: 26px;
  margin: 7px 0;
}
.research-workspace .playground-heading {
  align-items: center;
  padding-bottom: 24px;
}
.research-workspace .playground-body {
  grid-template-columns: #{'minmax(0, 1fr)'} 270px;
}
.research-workspace .playground-settings {
  padding: 22px 0 20px 24px;
}
.cadence-note {
  color: var(--playground-muted);
  font-size: 12px;
  line-height: 1.65;
  margin: -6px 0 18px;
  strong {
    display: block;
    color: var(--s-color-base-content-primary);
    font-weight: 600;
  }
}
.research-workspace .playground-result {
  padding-right: 26px;
}
.research-workspace .chart-heading {
  padding: 22px 0 0;
}
.research-metrics {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  gap: 14px;
  padding: 28px 0 20px;
}
.research-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.research-metrics span {
  font-size: 11px;
  color: var(--playground-muted);
}
.research-metrics strong {
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}
.research-metrics strong small {
  font-size: 10px;
  color: var(--playground-muted);
  letter-spacing: 0;
}
.research-metrics > div > small {
  font-size: 9px;
  color: var(--playground-muted);
}
.positive {
  color: var(--research-positive);
}
.negative {
  color: var(--research-negative);
}
.research-workspace .attribution-note,
.research-workspace .data-note {
  font-size: 10px;
  line-height: 1.7;
  color: var(--playground-muted);
  margin: 12px 0 !important;
}
.trade-inspector {
  border-top: 1px solid var(--playground-border);
  padding: 20px 0;
}
.inspector-title,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.inspector-title > div > span {
  font-size: 10px;
  color: var(--playground-muted);
}
.inspector-title h3 {
  font-size: 16px;
  font-weight: 600;
  margin-top: 5px;
}
.inspector-title h3 small {
  font-size: 11px;
  font-weight: 400;
}
.inspector-title > strong {
  font-size: 22px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.trade-facts {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: 12px;
  margin: 18px 0;
}
.trade-facts span {
  color: var(--playground-muted);
  font-size: 10px;
}
.trade-facts b {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--s-color-base-content-primary);
  margin-top: 6px;
}
.constraint-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  list-style: none;
  padding: 0;
}
.constraint-list li {
  display: flex;
  gap: 5px;
  align-items: center;
  color: var(--playground-muted);
  font-size: 10px;
}
.constraint-list small {
  font-size: 9px;
}
.constraint-list .passed .check-mark {
  color: var(--research-positive);
}
.check-mark {
  font-size: 14px;
}
.trade-inspector > p {
  font-size: 10px;
  margin-top: 12px;
  color: var(--playground-muted);
}
.equity-detail {
  border-top: 1px solid var(--playground-border);
  padding-top: 14px;
}
.equity-detail h4 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 0;
  font-weight: 600;
  font-size: 11px;
}
.equity-detail h4 span {
  color: var(--playground-muted);
  font-weight: 400;
}
.research-workspace .playground-chart {
  height: 170px;
  margin-top: 14px;
}
.validation-settings,
.save-research {
  border-top: 1px solid var(--playground-border);
  margin-top: 20px;
  padding-top: 20px;
}
.research-workspace h3 {
  font-size: 15px;
  margin-bottom: 14px;
  font-weight: 500;
}
.research-workspace .check-control {
  display: flex;
  flex-direction: row;
  align-items: start;
  gap: 8px;
  font-size: 11px;
  line-height: 1.6;
}
.research-workspace .check-control input {
  width: 15px;
  min-width: 15px;
  height: 15px;
  min-height: 15px;
  margin: 2px 0;
  accent-color: var(--playground-accent);
}
.save-research p {
  color: var(--playground-muted);
  font-size: 10px;
  line-height: 1.7;
  margin-top: 12px;
}
.research-workspace .save-button {
  width: 100%;
  justify-content: space-between;
  border-color: var(--playground-accent);
  color: var(--playground-accent);
}
.validation-results,
.trade-ledger {
  border-top: 1px solid var(--playground-border);
  padding: 28px 0;
}
.section-title h3 {
  margin: 8px 0 0;
  font-size: 21px;
}
.section-title h3 small {
  font-size: 13px;
  color: var(--playground-muted);
  margin-left: 8px;
}
.validation-results > p,
.trade-ledger > p {
  font-size: 11px;
  line-height: 1.7;
  color: var(--playground-muted);
  margin: 16px 0 !important;
  max-width: 820px;
}
.validation-badge {
  color: var(--research-positive);
  font-size: 11px;
}
.table-scroll {
  overflow-x: auto;
  max-width: 100%;
}
.research-workspace table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
  font-size: 11px;
}
.research-workspace th {
  font-weight: 500;
  color: var(--playground-muted);
  font-size: 10px;
  padding: 15px 14px 15px 0;
  border-bottom: 1px solid var(--playground-border);
}
.research-workspace td {
  padding: 12px 14px 12px 0;
  border-bottom: 1px solid var(--playground-border);
  font-variant-numeric: tabular-nums;
}
.research-workspace td button {
  border: 0;
  padding: 0 6px;
  min-height: 28px;
}
.active-trade {
  background: color-mix(in srgb, var(--playground-accent) 5%, transparent);
}
.selection-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border: 1px solid var(--playground-muted);
  border-radius: 50%;
  margin-right: 7px;
}
.selection-dot.included {
  background: var(--playground-accent);
  border-color: var(--playground-accent);
}
.ledger-check {
  padding-right: 9px;
  color: var(--playground-muted);
}
.ledger-check.passed {
  color: var(--research-positive);
}
.ledger-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}
.research-workspace select {
  color: inherit;
  background: var(--s-color-base-background);
  border: 1px solid var(--playground-border);
  border-radius: 6px;
  padding: 8px;
}
.ledger-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  font-size: 11px;
}
.ledger-pagination > span {
  margin-right: auto;
  color: var(--playground-muted);
}
.training-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.import-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
  border-top: 1px solid var(--playground-border);
  padding: 20px 0;
  font-size: 11px;
}
.import-panel label {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.import-panel p {
  color: var(--playground-muted);
  line-height: 1.8;
}
.distribution-empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 28px;
  color: var(--playground-muted);
}
.research-history-range {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  color: var(--playground-muted);
}
.research-workspace output {
  min-height: 36px;
  padding: 8px 0;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
@media (max-width: 1100px) {
  .research-metrics {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  }
  .research-workspace .playground-body {
    display: flex;
    flex-direction: column;
  }
  .research-workspace .playground-result {
    display: block;
    padding-right: 0;
  }
  .research-workspace .playground-settings {
    padding: 20px 0;
    border-left: 0;
    border-top: 1px solid var(--playground-border);
  }
}
@media (max-width: 760px) {
  .research-workspace .playground-body {
    display: flex;
    flex-direction: column;
  }
  .research-workspace .playground-settings {
    padding: 20px 0;
    border-left: 0;
    border-top: 1px solid var(--playground-border);
    display: block;
  }
  .research-workspace .playground-result {
    display: block;
    padding-right: 0;
  }
  .research-workspace .playground-heading {
    align-items: flex-start;
  }
  .research-workspace .research-metrics {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  }
  .research-metrics strong {
    font-size: 22px;
  }
  .trade-facts {
    grid-template-columns: 1fr;
  }
  .constraint-list {
    gap: 8px;
  }
  .import-panel {
    grid-template-columns: 1fr;
  }
  .source-switch {
    flex-wrap: wrap;
  }
  .section-title {
    align-items: start;
  }
  .ledger-filter {
    flex-direction: column;
    align-items: start;
    gap: 5px;
  }
  .training-result {
    flex-direction: column;
    align-items: start;
  }
}

.research-pair-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0 22px;
}
.research-pair-controls label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 150px;
}
.research-pair-controls label span {
  color: var(--playground-muted);
  font-size: 10px;
}
.research-pair-controls select {
  font-size: 14px;
  font-weight: 600;
  min-height: 42px;
}
.pair-arrow {
  margin-top: 16px;
  color: var(--playground-muted);
}
.research-pair-controls p,
.cost-note {
  color: var(--playground-muted);
  font-size: 10px;
  line-height: 1.7;
}
.research-pair-controls p {
  max-width: 400px;
  margin-left: auto;
}
@media (max-width: 760px) {
  .research-pair-controls {
    flex-wrap: wrap;
    gap: 12px;
  }
  .research-pair-controls label {
    min-width: 0;
    flex: 1;
  }
  .research-pair-controls p {
    flex-basis: 100%;
    max-width: none;
  }
}
.cost-summary,
.trade-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  color: var(--playground-muted);
  font-size: 10px;
  line-height: 1.7;
}
.cost-summary {
  border-top: 1px solid var(--playground-border);
  padding-top: 14px;
}
.cost-summary b {
  color: var(--s-color-base-content-primary);
  font-weight: 500;
}
.trade-costs {
  margin-top: 10px;
}
.constraint-list li {
  flex-wrap: wrap;
  max-width: 160px;
}
.check-values {
  flex-basis: 100%;
  padding-left: 18px;
  font-size: 9px;
}
.distribution-anchor {
  scroll-margin-top: 250px;
}
.research-workspace .playground-heading {
  padding-bottom: 14px;
}
.research-workspace .playground-heading h2 {
  font-size: 23px;
}
.research-workspace .research-pair-controls {
  padding-bottom: 16px;
}
.research-workspace .playground-presets button {
  padding-top: 12px;
  padding-bottom: 12px;
}
.research-workspace .research-metrics {
  padding-top: 18px;
  padding-bottom: 18px;
}
@media (min-width: 1101px) {
  .research-metrics {
    position: static;
  }
  .distribution-anchor {
    scroll-margin-top: 180px;
  }
}
</style>
