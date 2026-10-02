<template>
  <section
    class="strategy-lab"
    :class="{ 'is-running': running && active }"
    data-testid="strategy-lab"
    :aria-label="t('bots.lab.title')"
  >
    <Teleport :to="marketControlsTarget || 'body'" :disabled="!marketControlsTarget" defer>
      <div v-show="active" class="lab-market-controls" data-testid="lab-market-controls">
        <label
          ><span>{{ t('bots.lab.inputToken') }}</span
          ><select v-model="settings.assetInAddress" data-testid="lab-input-token">
            <option v-for="asset in sortedAssets" :key="asset.address" :value="asset.address">
              {{ asset.symbol }}
            </option>
          </select></label
        >
        <button
          class="lab-reverse"
          data-testid="lab-reverse"
          :aria-label="t('bots.lab.reversePair')"
          @click="reversePair"
        >
          ⇄
        </button>
        <label
          ><span>{{ t('bots.lab.outputToken') }}</span
          ><select v-model="settings.assetOutAddress" data-testid="lab-output-token">
            <option
              v-for="asset in sortedAssets"
              :key="asset.address"
              :value="asset.address"
              :disabled="asset.address === settings.assetInAddress"
            >
              {{ asset.symbol }}
            </option>
          </select></label
        >
        <label class="lab-starting-capital"
          ><span>{{ t('bots.lab.startingCapital') }}</span>
          <div class="lab-unit-input">
            <input
              v-model="settings.capital"
              inputmode="decimal"
              data-testid="lab-capital"
              :aria-invalid="!!inputAsset && !validStartingCapital"
              :aria-describedby="!!inputAsset && !validStartingCapital ? capitalErrorId : undefined"
            /><span>{{ inputAsset?.symbol }}</span>
          </div></label
        >
        <section class="lab-strategy-choice" data-testid="lab-strategy-disclosure">
          <header class="lab-choice-heading">
            <h3 class="lab-choice-label">{{ t('bots.simpleSetup.chooseStrategy') }}</h3>
            <strong>{{ selectedStrategyName }}</strong>
          </header>
          <div
            class="lab-strategy-picker"
            data-testid="lab-strategy-picker"
            role="group"
            :aria-label="t('bots.simpleSetup.chooseStrategy')"
          >
            <button
              v-for="choice in strategyChoices"
              :key="`${choice.kind}-${choice.id}`"
              type="button"
              :data-testid="choice.kind === 'preset' ? `lab-quick-preset-${choice.id}` : `rule-recipe-${choice.id}`"
              :aria-pressed="selectedChoice === choice"
              :disabled="running"
              @click="chooseStrategy(choice)"
            >
              <svg viewBox="0 0 48 24" aria-hidden="true"><path :d="choice.glyph" /></svg>
              <strong>{{ t(choice.nameKey) }}</strong>
            </button>
          </div>
        </section>
        <p v-if="rulesMode || customStrategy" class="lab-selected-idea" data-testid="lab-selected-strategy-idea">
          {{ selectedStrategyIdea }}
        </p>
        <div class="lab-quick-options">
          <label class="lab-history-choice">
            <span>{{ t('bots.simpleSetup.history') }}</span>
            <select
              :value="historyRange"
              data-testid="lab-history-range"
              :disabled="running"
              @change="changeHistoryRange"
            >
              <option v-if="historyRange === 'custom'" value="custom">{{ t('bots.simpleSetup.savedPeriod') }}</option>
              <option value="30">{{ t('bots.simpleSetup.last30Days') }}</option>
              <option value="90">{{ t('bots.simpleSetup.last90Days') }}</option>
              <option value="all">{{ t('bots.simpleSetup.allHistory') }}</option>
            </select>
          </label>
        </div>
        <div class="lab-strategy-preview" data-testid="lab-strategy-preview">
          <template v-if="rulesMode">
            <RuleFlow v-if="validRules" :rules="ruleDraft" :active="active" />
            <p v-else class="lab-error" role="alert" data-testid="lab-preview-invalid">
              {{ t('bots.rules.invalid') }}
            </p>
          </template>
          <div v-else-if="customStrategy" class="lab-custom-explanation" data-testid="lab-custom-explanation">
            <h3>{{ customStrategyName }}</h3>
            <p>
              {{
                t(`bots.uxWorkspace.strategyDescriptions.${customStrategy.kind}`, {
                  capital: inputAsset?.symbol,
                  traded: outputAsset?.symbol,
                })
              }}
            </p>
            <p v-if="customStrategy.kind === 'threshold'">
              {{ t('bots.threshold') }}: {{ customStrategy.threshold }} ·
              {{ t(`bots.rules.${customStrategy.direction}`) }}
            </p>
            <p v-if="customStrategy.kind === 'sma'">
              {{ t('bots.fastWindow') }}: {{ customStrategy.fastWindow }} · {{ t('bots.slowWindow') }}:
              {{ customStrategy.slowWindow }}
            </p>
          </div>
          <StrategyFlow
            v-else
            :settings="{ ...settings, preset: previewPreset }"
            :input-symbol="inputAsset?.symbol ?? ''"
            :input-decimals="inputAsset?.decimals ?? 18"
            :output-symbol="outputAsset?.symbol ?? ''"
            :active="active"
          />
        </div>
        <dl class="lab-limit-summary" data-testid="lab-limit-summary">
          <div>
            <dt>{{ t('bots.calmSetup.orderSize') }}</dt>
            <dd>
              {{ settings.tradePercent }}% <small>{{ orderAmount }} {{ inputAsset?.symbol }}</small>
            </dd>
          </div>
          <div>
            <dt>{{ t('bots.calmSetup.minimumGap') }}</dt>
            <dd>{{ cadenceLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('bots.research.feeReserve') }}</dt>
            <dd>{{ settings.feeBudgetXor }} XOR</dd>
          </div>
        </dl>
        <section ref="builderSection" class="lab-builder" data-testid="lab-advanced">
          <div class="lab-advanced-content">
            <section
              v-if="rulesMode"
              ref="rulesDetails"
              class="lab-settings"
              tabindex="-1"
              data-testid="lab-rule-settings"
            >
              <h4>{{ t('bots.simpleSetup.customize') }}</h4>
              <RuleBuilder
                v-model="ruleDraft"
                v-model:name="ruleName"
                :active="active"
                :editing="rulesMode"
                :show-recipes="false"
                :show-flow="false"
              />
            </section>
            <section ref="settingsDetails" class="lab-settings" tabindex="-1" data-testid="lab-trading-settings">
              <h4>{{ t('bots.calmSetup.tradingLimits') }}</h4>
              <div class="lab-settings-grid">
                <label v-if="!rulesMode && !customStrategy && presets.includes('sma')"
                  ><span>{{ t('bots.calmSetup.signalTiming') }}</span
                  ><select
                    :value="settings.signalTiming ?? 'closed-hour'"
                    data-testid="lab-signal-timing"
                    @change="
                      settings.signalTiming = ($event.target as HTMLSelectElement).value as 'live-price' | 'closed-hour'
                    "
                  >
                    <option value="live-price">{{ t('bots.calmSetup.livePrices') }}</option>
                    <option value="closed-hour">{{ t('bots.calmSetup.hourlyCloses') }}</option>
                  </select></label
                >

                <label>
                  <span>{{ t('bots.uxLab.tradeInterval') }}</span>
                  <select v-model.number="cadenceBlocks" data-testid="lab-interval-blocks">
                    <option
                      v-if="![1, 5, 10, 50, 150, 300, 600, 2400, 7200, 14400].includes(cadenceBlocks)"
                      :value="cadenceBlocks"
                    >
                      {{ t('bots.uxLab.savedCadence', { count: cadenceBlocks }) }}
                    </option>
                    <option v-for="blocks in rulesMode ? [] : [1, 5, 10]" :key="`blocks-${blocks}`" :value="blocks">
                      {{
                        blocks === 10
                          ? t('bots.calmSetup.everyMinutes', { count: 1 })
                          : t('bots.uxLab.everyBlocks', { count: blocks, seconds: blocks * 6 })
                      }}
                    </option>
                    <option
                      v-for="minutes in rulesMode ? [] : [5, 15, 30]"
                      :key="`minutes-${minutes}`"
                      :value="minutes * 10"
                    >
                      {{ t('bots.calmSetup.everyMinutes', { count: minutes }) }}
                    </option>
                    <option v-for="hours in [1, 4, 12, 24]" :key="hours" :value="hours * 600">
                      {{ t('bots.uxLab.everyHours', { count: hours }) }}
                    </option>
                  </select>
                </label>
                <label
                  ><span>{{ t('bots.lab.perTrade') }} (%)</span
                  ><input
                    v-model.number="settings.tradePercent"
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    data-testid="lab-trade-percent"
                    ref="orderSizeInput"
                /></label>
                <label v-if="!rulesMode && !customStrategy && presets.includes('threshold')"
                  ><span>{{ t('bots.lab.dipPercent') }}</span
                  ><input
                    data-testid="lab-dip-percent"
                    v-model.number="settings.thresholdPercent"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                /></label>
                <label v-if="!rulesMode && !customStrategy && presets.includes('sma')"
                  ><span>{{ t('bots.lab.fastWindow') }}</span
                  ><input
                    data-testid="lab-fast-window"
                    v-model.number="settings.fastWindow"
                    type="number"
                    min="2"
                    max="199"
                    step="1"
                /></label>
                <label v-if="!rulesMode && !customStrategy && presets.includes('sma')"
                  ><span>{{ t('bots.lab.slowWindow') }}</span
                  ><input
                    data-testid="lab-slow-window"
                    v-model.number="settings.slowWindow"
                    type="number"
                    min="3"
                    max="200"
                    step="1"
                /></label>
                <label
                  ><span>{{ t('bots.research.slippage') }}</span
                  ><input v-model="settings.slippagePercent" inputmode="decimal"
                /></label>
                <label
                  ><span>{{ t('bots.research.feeReserve') }}</span
                  ><input v-model="settings.feeBudgetXor" inputmode="decimal" ref="feeBudgetInput"
                /></label>
              </div>
              <p>{{ t(cadenceBlocks < 600 ? 'bots.uxLab.subhourWarning' : 'bots.uxLab.historyResolution') }}</p>
            </section>
            <details class="lab-settings" data-testid="lab-validation-settings">
              <summary>{{ t('bots.calmSetup.testQuality') }}</summary>
              <div class="lab-settings-grid">
                <label
                  ><span>{{ t('bots.research.validationMethod') }}</span
                  ><select v-model="settings.validation">
                    <option value="holdout">{{ t('bots.research.validationHoldout') }}</option>
                    <option value="walk-forward">{{ t('bots.research.validationWalkForward') }}</option>
                    <option value="none">{{ t('bots.research.validationNone') }}</option>
                  </select></label
                >
                <label v-if="settings.validation !== 'none'"
                  ><span>{{ t('bots.research.trainingShare') }} (%)</span
                  ><input v-model.number="settings.trainPercent" type="number" min="50" max="80" step="1"
                /></label>
                <label v-if="settings.validation === 'walk-forward'"
                  ><span>{{ t('bots.research.folds') }}</span
                  ><select v-model.number="settings.folds">
                    <option v-for="fold in [2, 3, 4, 5]" :key="fold" :value="fold">{{ fold }}</option>
                  </select></label
                >
              </div>
              <p>{{ t('bots.research.chronological') }}</p>
            </details>
            <details class="lab-settings" data-testid="lab-comparison-settings">
              <summary>{{ t('bots.lab.compareExperiments') }}</summary>
              <div class="lab-preset-row">
                <fieldset v-if="!rulesMode && !customStrategy" class="lab-compare-presets" :disabled="running">
                  <label v-for="preset in presetOptions" :key="preset">
                    <input
                      type="checkbox"
                      :data-testid="`lab-preset-${preset}`"
                      :checked="presets.includes(preset)"
                      @change="togglePreset(preset)"
                    />
                    <span>{{ t('bots.lab.compareRun', { name: t(`bots.playground.presets.${preset}`) }) }}</span>
                  </label>
                </fieldset>
                <label class="lab-add-market"
                  ><span>{{ t('bots.lab.alsoTest') }}</span
                  ><select
                    :value="''"
                    data-testid="lab-add-output"
                    :disabled="outputs.length >= 4 || !!customStrategy"
                    @change="addOutput"
                  >
                    <option value="">＋ {{ t('bots.lab.addOutput') }}</option>
                    <option v-for="asset in extraOutputAssets" :key="asset.address" :value="asset.address">
                      {{ asset.symbol }}
                    </option>
                  </select></label
                >
              </div>
              <div v-if="extraOutputs.length" class="lab-market-tags">
                <span>{{ inputAsset?.symbol }} →</span><span class="lab-current-market">{{ outputAsset?.symbol }}</span
                ><button
                  v-for="address in extraOutputs"
                  :key="address"
                  :aria-label="t('bots.lab.removeMarket', { token: symbol(address) })"
                  @click="extraOutputs = extraOutputs.filter((value) => value !== address)"
                >
                  {{ symbol(address) }} ×
                </button>
              </div>
              <div class="lab-settings-grid">
                <label
                  ><span>{{ t('bots.lab.parameterSets') }}</span
                  ><select v-model.number="variations" data-testid="lab-variations" :disabled="rulesMode">
                    <option :value="1">{{ t('bots.lab.oneConfiguration') }}</option>
                    <option :value="3">{{ t('bots.lab.threeVariations') }}</option>
                  </select></label
                >
              </div>
              <p>{{ t('bots.lab.variationExplanation') }}</p>
            </details>
            <div class="lab-advanced-actions">
              <button type="button" data-testid="lab-reset-defaults" :disabled="running" @click="resetTradingDefaults">
                {{ t('bots.calmSetup.reset') }}
              </button>
              <button
                type="button"
                data-testid="lab-compose"
                :title="t('bots.uxLab.aiRequirement')"
                @click="focusComposer"
              >
                {{ t('bots.uxLab.aiEntry') }}
              </button>
            </div>
          </div>
        </section>
        <div class="lab-launch" data-testid="lab-launch">
          <button
            class="lab-primary lab-run-results"
            data-testid="lab-run-batch"
            :disabled="running || !canBuild"
            :aria-busy="running"
            @click="startBatch"
          >
            <span>{{
              t(running ? 'bots.uxLab.runningResults' : runs.length ? 'bots.uxLab.runAgain' : 'bots.uxLab.runResults')
            }}</span>
            <span aria-hidden="true">{{ running ? '⋯' : '→' }}</span>
          </button>
          <p v-if="inputAsset && !validStartingCapital" :id="capitalErrorId" class="lab-error" role="alert">
            {{ t('bots.uxLab.capitalRequired') }}
          </p>
          <p v-if="error" class="lab-error" role="alert">{{ t(error) }}</p>
          <p v-if="cadenceBlocks < 600" class="lab-frequency-note" data-testid="lab-frequency-note">
            {{ t('bots.calmSetup.hourlyLimit') }}
          </p>
          <div class="lab-launch-details">
            <span v-if="canBuild && !running">{{ t('bots.simpleSetup.previewSummary', { count: batchCount }) }}</span>
            <span>{{ t('bots.simpleSetup.previewNote') }}</span>
          </div>
          <div class="lab-source-line" role="status" data-testid="lab-data-status">
            <span class="lab-source" :class="{ verified: completedCount > 0, pending: !canBuild }">
              <i :class="{ working: running }" aria-hidden="true" />{{ t(sourceState) }}
            </span>
            <span>{{ t('bots.flow.hourlyBacktest') }}</span>
          </div>
          <div
            v-if="running"
            class="lab-compute-progress"
            role="progressbar"
            :aria-label="t('bots.lab.computeProgress')"
            :aria-valuenow="overallProgress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <i :style="{ width: `${overallProgress}%` }" />
          </div>
        </div>
      </div>
    </Teleport>
    <p v-if="storageError" class="lab-notice" role="status">{{ t('bots.lab.storageUnavailable') }}</p>

    <div ref="composerSection" class="lab-composer-section" data-testid="lab-composer-section" tabindex="-1">
      <StrategyComposer
        :assets="assets"
        :settings="settings"
        :busy="running"
        :load-history="loadHistory"
        :selected-rules="rulesMode ? ruleDraft : undefined"
        :selected-strategy="customStrategy"
        @propose="addSuggested"
      />
    </div>

    <div v-if="runs.length && (running || summaryRuns.length > 1)" class="lab-run-toolbar">
      <div>
        <span class="lab-kicker">{{ t('bots.lab.parallelRuns') }}</span
        ><strong
          >{{ summaryCompletedCount }}<span> / {{ summaryRuns.length }}</span></strong
        ><span class="lab-muted">{{ t('bots.lab.complete') }}</span>
      </div>
      <div class="lab-playback-actions">
        <button v-if="running" data-testid="lab-cancel" @click="cancelBatch">
          {{ t('bots.lab.cancelRemaining') }}
        </button>
      </div>
    </div>
    <section v-if="displayedRuns.length" ref="decisionSection" class="lab-decisions" data-testid="lab-decisions">
      <div class="lab-section-title">
        <div>
          <h3>{{ t('bots.simpleSetup.yourPreview') }}</h3>
        </div>
      </div>
      <div v-if="displayedRuns.length" class="lab-experiment-grid" data-testid="lab-experiment-grid">
        <ExperimentCard
          v-for="run in displayedRuns"
          :key="run.id"
          :ref="(view) => registerCheckpointView(run.id, view)"
          :run="run"
          :assets="assets"
          :selected="selectedId === run.id"
          :pinned="pinnedIds.includes(run.id)"
          :paused="!active"
          @select="selectRun(run.id)"
          @pin="togglePin(run.id)"
          @create-bot="createFromRun(run)"
          @save-paper="createFromRun(run, 'paper')"
          @review-settings="reviewRunSettings(run, $event)"
          @duplicate="duplicateRun(run)"
        />
      </div>
      <div v-if="runs.length > 3" class="lab-view-note">
        {{ t('bots.lab.compareSlots', { count: displayedRuns.length }) }}
      </div>
    </section>
    <section v-if="runs.length" class="lab-more-analysis" data-testid="lab-more-analysis">
      <h3>{{ t('bots.simpleSetup.moreAnalysis') }}</h3>
      <ValidationReport
        v-if="selectedRun?.result && !running"
        class="lab-validation"
        :validation="selectedRun.result.validation"
        :active="active"
      />
      <section v-if="equityResults.length" class="lab-equity-section">
        <ExperimentEquity :results="equityResults" :selected-id="selectedId" @select="selectRun" />
      </section>

      <section v-if="runs.length" class="lab-comparison" data-testid="lab-comparison">
        <div class="lab-section-title">
          <div>
            <h3>{{ t('bots.lab.compareExperiments') }}</h3>
          </div>
          <label class="lab-sort"
            ><span>{{ t('bots.uxLab.compareScope') }}</span>
            <select v-model="comparisonScope" data-testid="lab-comparison-scope">
              <option value="matching">{{ t('bots.uxLab.matchingScope') }}</option>
              <option value="all">{{ t('bots.uxLab.allScope') }}</option>
            </select>
          </label>
          <label class="lab-sort"
            ><span>{{ t('bots.lab.sortBy') }}</span
            ><select v-model="sort">
              <option value="recent">{{ t('bots.lab.mostRecent') }}</option>
              <option value="return">{{ t('bots.lab.return') }}</option>
              <option value="test">{{ t('bots.lab.latestTest') }}</option>
              <option value="drawdown">{{ t('bots.lab.drawdown') }}</option>
            </select></label
          >
        </div>
        <p v-if="comparisonScope === 'all'" class="lab-method-note">{{ t('bots.uxLab.unlikeWarning') }}</p>
        <p v-else-if="selectedRun?.result" class="lab-method-note">
          {{ t('bots.uxLab.matchingNote', { count: runs.length - sortedRuns.length }) }}
        </p>
        <div class="lab-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ t('bots.lab.compare') }}</th>
                <th>{{ t('bots.lab.experiment') }}</th>
                <th>{{ t('bots.lab.market') }}</th>
                <th>{{ t('bots.lab.return') }}</th>
                <th>{{ t('bots.lab.latestTest') }}</th>
                <th>{{ t('bots.uxResults.holdStartingAssets') }}</th>
                <th>{{ t('bots.lab.drawdown') }}</th>
                <th>{{ t('bots.swaps') }}</th>
                <th>{{ t('bots.lab.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="run in sortedRuns"
                :key="run.id"
                :class="{ focused: selectedId === run.id }"
                :data-run-id="run.id"
              >
                <td>
                  <input
                    type="checkbox"
                    :checked="visibleIds.includes(run.id)"
                    :aria-label="t('bots.lab.compareRun', { name: run.name })"
                    @change="toggleVisible(run.id)"
                  />
                </td>
                <td>
                  <button class="lab-run-name" @click="selectRun(run.id, true)">{{ run.name }}</button
                  ><small
                    >{{ t(`bots.lab.status.${run.status}`)
                    }}<template v-if="run.result"> · {{ period(run) }}</template></small
                  >
                </td>
                <td>
                  {{ symbol(run.settings.assetInAddress) }} → {{ symbol(run.settings.assetOutAddress) }}
                  <small v-if="run.result">{{
                    t('bots.uxLab.coverageDetail', {
                      count: run.result.source.history.candles.length,
                      coverage: coverageLabel(run.result.result.coverage),
                    })
                  }}</small>
                </td>
                <td class="lab-number">
                  {{ labDecimal(run.result?.result.returnPercent, true) }}<template v-if="run.result">%</template>
                </td>
                <td class="lab-number">
                  {{ labDecimal(run.result?.validation.folds.at(-1)?.test.returnPercent, true)
                  }}<template v-if="run.result?.validation.folds.length">%</template>
                  <small v-if="run.result?.validation.folds.length">{{
                    experimentDateRange(
                      run.result.validation.folds.at(-1)?.testStart,
                      run.result.validation.folds.at(-1)?.testEnd
                    )
                  }}</small>
                </td>
                <td class="lab-number">
                  {{ labDecimal(holdingBenchmarkReturn(run.result?.result.equity ?? []), true)
                  }}<template v-if="holdingBenchmarkReturn(run.result?.result.equity ?? []) !== undefined">%</template>
                </td>
                <td class="lab-number">
                  {{ labDecimal(run.result?.result.drawdownPercent) }}<template v-if="run.result">%</template>
                </td>
                <td class="lab-number">{{ run.result?.result.trades ?? '—' }}</td>
                <td>
                  <div class="lab-row-actions">
                    <button
                      :aria-pressed="pinnedIds.includes(run.id)"
                      :aria-label="t('bots.lab.pinRun', { name: run.name })"
                      @click="togglePin(run.id)"
                    >
                      {{ t(pinnedIds.includes(run.id) ? 'bots.lab.pinned' : 'bots.lab.pin') }}</button
                    ><button :disabled="running" @click="duplicateRun(run)">{{ t('bots.lab.duplicate') }}</button
                    ><button :disabled="!run.result || saving || promoting" @click="createFromRun(run)">
                      {{ t('bots.lab.createBot') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="lab-method-note">{{ t('bots.lab.comparisonNote') }}</p>
      </section>
      <section v-if="selectedRun?.result" class="lab-inspection" data-testid="lab-inspection">
        <div class="lab-section-title">
          <h3>{{ selectedRun.name }}</h3>
          <button
            class="lab-primary"
            :disabled="saving || promoting"
            data-testid="lab-create-bot"
            @click="createFromRun(selectedRun)"
          >
            {{ t('bots.lab.createBot') }} →
          </button>
        </div>
        <div class="lab-inspection-facts">
          <span
            >{{ symbol(selectedRun.settings.assetInAddress) }} →
            {{ symbol(selectedRun.settings.assetOutAddress) }}</span
          ><span>{{ t('bots.lab.coverage') }} {{ coverageLabel(selectedRun.result.result.coverage) }}%</span
          ><span>{{ t('bots.lab.feeBlock') }} #{{ selectedRun.fees?.blockNumber }}</span
          ><span>{{ t('bots.lab.testedAt') }} {{ timestamp(selectedRun.createdAt) }}</span>
        </div>
        <p>{{ t('bots.simpleResults.startNote') }}</p>
        <section
          v-if="selectedRun.strategy?.kind === 'rules' && selectedRun.strategy.rules"
          data-testid="lab-rule-evidence"
        >
          <h4>{{ t('bots.rules.inspect') }}</h4>
          <RuleFlow
            :rules="selectedRun.strategy.rules"
            :candles="selectedRun.result.source.history.candles"
            :active="active"
          />
          <p>{{ t('bots.rules.searchWarning') }}</p>
        </section>
        <section>
          <h4>{{ t('bots.lab.studyEvidence') }}</h4>
          <p>{{ t('bots.research.chronological') }}</p>
          <p>
            {{
              t('bots.lab.feeAssumptions', {
                buy: selectedRun.fees?.networkFeeXor ?? '—',
                sell: selectedRun.fees?.sellNetworkFeeXor ?? '—',
                swap: selectedRun.fees?.swapFeePercent ?? '—',
              })
            }}
          </p>
        </section>
      </section>
    </section>
    <span class="lab-sr" aria-live="polite">{{ announcement }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { awaitResearchPaint, RESEARCH_DEFAULT_SETTINGS, type ResearchSettings } from '../research';
import { createPlaygroundBot, type PlaygroundSettings } from '../playground';
import type { BotAsset, BotDefinition, BotHistory, BotResearchSnapshot, StrategyConfig } from '../types';
import type { ResearchFeeOptions, ResearchFeeSnapshot } from '../research-fees';
import { makeExperimentSnapshot, type ExperimentDefinition, type ExperimentRun } from '../experiments';
import { createExperimentRunner } from '../research-runner';
import { createExperimentStorage } from '../experiment-storage';
import {
  buildLabBatch,
  labDecimal,
  labVariants,
  parseLabPins,
  sortLabRuns,
  coverageLabel,
  comparableLabRuns,
  createLabDefaultSettings,
} from '../lab-config';
import { holdingBenchmarkReturn, experimentDateRange } from '../experiment-results';
import StrategyFlow from './StrategyFlow.vue';
import ValidationReport from './ValidationReport.vue';
import ExperimentCard from './ExperimentCard.vue';
import ExperimentEquity from './ExperimentEquity.vue';
import StrategyComposer from './StrategyComposer.vue';
import RuleBuilder from './RuleBuilder.vue';
import RuleFlow from './RuleFlow.vue';
import { ruleRecipe, decodeRuleShare, buildRuleBatch, RULE_RECIPE_IDS, type RuleRecipeId } from '../rule-recipes';
import { parseStrategyRules } from '../strategy-rules';
import type { BotStrategyPreset, BotNavigation } from '../navigation';
import { codec, toCodec } from '../amounts';

/** Parallel public research workspace. Saved experiments contain no wallet or provider connection. */
const props = withDefaults(
  defineProps<{
    assets: BotAsset[];
    loadHistory: (bot: BotDefinition, settings: PlaygroundSettings) => Promise<BotHistory>;
    loadFees: (
      bot: BotDefinition,
      settings: ResearchSettings,
      options?: ResearchFeeOptions
    ) => Promise<ResearchFeeSnapshot>;
    saving?: boolean;
    active?: boolean;
    strategyPreset?: BotStrategyPreset;
    composerOpen?: boolean;
    sharedRules?: string;
    /** Optional page-first target for the same market controls, preserving a single research draft. */
    marketControlsTarget?: string;
  }>(),
  { saving: false, active: true }
);
const emit = defineEmits<{
  save: [bot: BotDefinition, settings: ResearchSettings, research: BotResearchSnapshot];
  start: [
    bot: BotDefinition,
    settings: ResearchSettings,
    research: BotResearchSnapshot,
    identity: NonNullable<BotHistory['identity']>,
  ];
  navigate: [state: Pick<BotNavigation, 'strategy' | 'composer'>];
}>();
const { t } = useTranslation();
const capitalErrorId = useId();
const ruleDraft = ref(ruleRecipe('trend'));
const ruleName = ref(t('bots.rules.recipes.trend.name'));
const rulesMode = ref(false);
const customStrategy = shallowRef<StrategyConfig>();
const customStrategyName = ref('');
const validRules = computed(() => {
  try {
    parseStrategyRules(ruleDraft.value);
    return !!ruleName.value.trim() && ruleName.value.length <= 80;
  } catch {
    return false;
  }
});
const settings = reactive<ResearchSettings>(createLabDefaultSettings(Date.now()));
type StrategyChoice = ({ kind: 'preset'; id: ResearchSettings['preset'] } | { kind: 'recipe'; id: RuleRecipeId }) & {
  nameKey: string;
  ideaKey: string;
  glyph: string;
};
const recipeGlyphs: Record<RuleRecipeId, string> = {
  spring: 'M2 12H7L10 3L15 21L20 3L25 21L30 3L35 21L38 12H46',
  persistent: 'M2 22L9 18L15 19L22 13L28 14L35 7L40 8L46 2',
  range: 'M2 12L8 5L16 19L24 5L32 19L40 5L46 12M2 3H46M2 21H46',
  rebound: 'M2 18L11 6L20 9L27 16L34 14L40 7L46 3M11 5H46',
  expansion: 'M2 12L8 10L14 13L20 11L26 12L33 7L39 9L46 2',
  trend: 'M2 21L12 16L21 18L31 9L38 11L46 3M2 22L46 8',
  breakout: 'M2 14L10 10L19 17L28 12L35 14L46 2M2 9H46',
  dip: 'M2 6L13 9L22 18L31 11L39 13L46 4M2 12H46',
  quiet: 'M2 12L10 10L18 12L25 11L31 12L38 7L46 2M2 7H32M2 16H32',
};
const presetGlyphs: Record<ResearchSettings['preset'], string> = {
  dca: 'M2 20H46M10 5V20M24 5V20M38 5V20',
  threshold: 'M2 6L13 9L22 7L31 20L46 13M2 15H46',
  sma: 'M2 19C15 19 25 5 46 5M2 6C18 6 28 16 46 16',
};
const presetOptions: ResearchSettings['preset'][] = ['dca', 'threshold', 'sma'];
const strategyChoices: StrategyChoice[] = [
  ...presetOptions.map((id) => ({
    kind: 'preset' as const,
    id,
    nameKey: `bots.playground.presets.${id}`,
    ideaKey: `bots.simpleSetup.presetHint.${id}`,
    glyph: presetGlyphs[id],
  })),
  ...RULE_RECIPE_IDS.map((id) => ({
    kind: 'recipe' as const,
    id,
    nameKey: `bots.rules.recipes.${id}.name`,
    ideaKey: `bots.rules.recipes.${id}.idea`,
    glyph: recipeGlyphs[id],
  })),
];
const presets = ref<ResearchSettings['preset'][]>([props.strategyPreset ?? settings.preset]);
const extraOutputs = ref<string[]>([]);
const variations = ref<1 | 3>(1);
const runs = shallowRef<ExperimentRun[]>([]);
const visibleIds = ref<string[]>([]);
const pinnedIds = ref<string[]>([]);
const selectedId = ref('');
const historyRange = ref<'30' | '90' | 'all' | 'custom'>('90');
const builderSection = ref<HTMLElement>();
const rulesDetails = ref<HTMLElement>();
const settingsDetails = ref<HTMLElement>();
const composerSection = ref<HTMLElement>();
const orderSizeInput = ref<HTMLInputElement>();
const feeBudgetInput = ref<HTMLInputElement>();
const previewPreset = ref<ResearchSettings['preset']>(props.strategyPreset ?? settings.preset);
const comparisonScope = ref<'matching' | 'all'>('matching');
const composerOpen = ref(props.composerOpen ?? false);
/** The primary strategy remains selected while explicit comparison runs are added. */
const selectedChoice = computed(() => {
  if (customStrategy.value) return undefined;
  return strategyChoices.find((choice) =>
    choice.kind === 'recipe'
      ? rulesMode.value && JSON.stringify(ruleRecipe(choice.id)) === JSON.stringify(ruleDraft.value)
      : !rulesMode.value && previewPreset.value === choice.id && presets.value.includes(choice.id)
  );
});
/** Name the selected preset, recipe, or reviewed custom strategy above the visible library. */
const selectedStrategyName = computed(() =>
  selectedChoice.value ? t(selectedChoice.value.nameKey) : rulesMode.value ? ruleName.value : customStrategyName.value
);
/** Summarize the actual minimum trade interval, including preserved legacy settings. */
const cadenceLabel = computed(() =>
  cadenceBlocks.value % 600 === 0
    ? t('bots.uxLab.everyHours', { count: cadenceBlocks.value / 600 })
    : cadenceBlocks.value % 10 === 0
      ? t('bots.calmSetup.everyMinutes', { count: cadenceBlocks.value / 10 })
      : t('bots.uxLab.everyBlocks', { count: cadenceBlocks.value, seconds: cadenceBlocks.value * 6 })
);
/** Display the engine's exact order amount; invalid drafts never fabricate an amount. */
const orderAmount = computed(() => {
  try {
    return createPlaygroundBot(settings, props.assets).strategy.amount;
  } catch {
    return '—';
  }
});
/** Reset trading/validation defaults only; preserve the chosen market, capital and strategy. */
function resetTradingDefaults(): void {
  if (running.value) return;
  const { assetInAddress, assetOutAddress, capital, preset } = settings;
  const { thresholdPercent, fastWindow, slowWindow, signalTiming } = settings;
  Object.assign(settings, createLabDefaultSettings(Date.now()), {
    assetInAddress,
    assetOutAddress,
    capital,
    preset,
    thresholdPercent,
    fastWindow,
    slowWindow,
    signalTiming,
  });
  if (rulesMode.value) settings.intervalBlocks = Math.max(600, settings.intervalBlocks ?? 600);
  historyRange.value = '90';
  extraOutputs.value = [];
  variations.value = 1;
  presets.value = [previewPreset.value];
}
/** Explain the selected strategy at the point of choice, before the Run action. */
const selectedStrategyIdea = computed(() => {
  if (selectedChoice.value) return t(selectedChoice.value.ideaKey);
  if (rulesMode.value) return t('bots.rules.execution');
  if (customStrategy.value)
    return t(`bots.uxWorkspace.strategyDescriptions.${customStrategy.value.kind}`, {
      capital: inputAsset.value?.symbol,
      traded: outputAsset.value?.symbol,
    });
  return t('bots.motion.selectStrategy');
});
/** Route changes restore only public view choices; drafts, provider credentials and research stay local. */
watch(
  () => [props.strategyPreset, props.composerOpen] as const,
  ([preset, composer]) => {
    if (preset !== undefined) {
      previewPreset.value = preset;
      if (!rulesMode.value && presets.value.length === 1) presets.value = [preset];
    }
    if (composer !== undefined) composerOpen.value = composer;
  }
);
watch([previewPreset, composerOpen], ([strategy, composer]) => {
  if (strategy !== props.strategyPreset || composer !== props.composerOpen) emit('navigate', { strategy, composer });
});
/** Old studies retain their hour cadence until the user explicitly edits it. */
const cadenceBlocks = computed({
  get: () => settings.intervalBlocks ?? settings.intervalHours * 600,
  set: (value: number) => {
    settings.intervalBlocks = value;
  },
});
const running = ref(false);
const promoting = ref(false);
const ready = ref(false);
const error = ref('');
const storageError = ref(false);
const announcement = ref('');
const sort = ref<'recent' | 'return' | 'test' | 'drawdown'>('recent');
interface CheckpointView {
  waitForCheckpoint(checkpoint: number, signal?: AbortSignal): Promise<void>;
}
const decisionSection = ref<HTMLElement>();
const checkpointViews = new Map<string, CheckpointView>();
/** Track only mounted graph lanes; offscreen studies can compute without waiting for an absent renderer. */
function registerCheckpointView(id: string, view: unknown): void {
  if (view && typeof (view as CheckpointView).waitForCheckpoint === 'function')
    checkpointViews.set(id, view as CheckpointView);
  else checkpointViews.delete(id);
}
const store = createExperimentStorage();
let runner: ReturnType<typeof createExperimentRunner> | null = null;
let mounted = false;
let generation = 0;
const batchIds = ref<string[]>([]);
const PIN_KEY = 'polkaswap.bot-lab.pins.v1';
const sortedAssets = computed(() => [...props.assets].sort((a, b) => a.symbol.localeCompare(b.symbol)));
const inputAsset = computed(() => props.assets.find((asset) => asset.address === settings.assetInAddress));
const outputAsset = computed(() => props.assets.find((asset) => asset.address === settings.assetOutAddress));
/** Match the engine's exact amount bounds before offering to queue a study. */
const validStartingCapital = computed(() => {
  if (!inputAsset.value) return false;
  try {
    const amount = codec(toCodec(settings.capital, inputAsset.value.decimals));
    return amount > 0n && amount <= codec(toCodec('1000000000', inputAsset.value.decimals));
  } catch {
    return false;
  }
});
const outputs = computed(() => [
  ...new Set(
    [settings.assetOutAddress, ...extraOutputs.value].filter(
      (address): address is string => !!address && address !== settings.assetInAddress
    )
  ),
]);
const extraOutputAssets = computed(() =>
  sortedAssets.value.filter(
    (asset) => asset.address !== settings.assetInAddress && !outputs.value.includes(asset.address)
  )
);
const batchCount = computed(
  () =>
    outputs.value.length *
    (rulesMode.value || customStrategy.value
      ? 1
      : presets.value.reduce((sum, preset) => sum + labVariants({ ...settings, preset }, variations.value).length, 0))
);
const canBuild = computed(
  () =>
    ready.value &&
    !!inputAsset.value &&
    !!outputAsset.value &&
    validStartingCapital.value &&
    batchCount.value > 0 &&
    batchCount.value <= 36 &&
    (!rulesMode.value || validRules.value) &&
    settings.assetInAddress !== settings.assetOutAddress
);
const selectedRun = computed(() => runs.value.find((run) => run.id === selectedId.value));
const completedCount = computed(() => runs.value.filter((run) => run.status === 'complete').length);
/** Batch progress excludes saved studies; a restored workspace summarizes its saved library until a new run starts. */
const currentBatchRuns = computed(() => runs.value.filter((run) => batchIds.value.includes(run.id)));
const summaryRuns = computed(() => (batchIds.value.length ? currentBatchRuns.value : runs.value));
const summaryCompletedCount = computed(() => summaryRuns.value.filter((run) => run.status === 'complete').length);
/** A matching cohort needs a completed reference; pending or failed studies never admit unrelated returns. */
const comparisonRuns = computed(() => {
  if (comparisonScope.value === 'all') return runs.value;
  const reference = selectedRun.value;
  return runs.value.filter((run) => {
    if (!run.result) return batchIds.value.includes(run.id) || run.id === reference?.id;
    return !!reference?.result && comparableLabRuns(run, reference);
  });
});
const displayedRuns = computed(() =>
  visibleIds.value
    .map((id) => comparisonRuns.value.find((run) => run.id === id))
    .filter((run): run is ExperimentRun => !!run)
);
const sortedRuns = computed(() => sortLabRuns(comparisonRuns.value, sort.value));
const sourceState = computed(() => {
  if (!ready.value) return 'bots.uxLab.restoring';
  if (running.value)
    return runs.value.some((run) => run.status === 'running') ? 'bots.uxLab.computing' : 'bots.uxLab.loadingHistory';
  if (!inputAsset.value || !outputAsset.value) return 'bots.uxLab.waitingForAssets';
  if (!validStartingCapital.value) return 'bots.uxLab.capitalRequired';
  if (rulesMode.value && !validRules.value) return 'bots.lab.invalidConfiguration';
  if (!rulesMode.value && !presets.value.length) return 'bots.motion.selectStrategy';
  if (completedCount.value > 0) return 'bots.uxLab.savedEvidence';
  if (!canBuild.value) return 'bots.uxLab.waitingForAssets';
  if (runs.value.some((run) => run.status === 'error')) return 'bots.uxLab.historyUnavailable';
  return 'bots.uxLab.readyToTest';
});
const overallProgress = computed(() => {
  const batch = currentBatchRuns.value;
  return batch.length
    ? Math.round(
        (batch.reduce(
          (sum, run) => sum + (['complete', 'error', 'cancelled'].includes(run.status) ? 1 : run.progress),
          0
        ) /
          batch.length) *
          100
      )
    : 0;
});
const equityResults = computed(() =>
  displayedRuns.value.flatMap((run) => (run.result ? [{ id: run.id, name: run.name, result: run.result }] : []))
);

/** Public metadata determines token labels; old saved pairs retain their source symbols. */
function symbol(address?: string): string {
  return (
    props.assets.find((asset) => asset.address === address)?.symbol ??
    runs.value
      .flatMap((run) => (run.result ? [run.result.bot.assetIn, run.result.bot.assetOut] : []))
      .find((asset) => asset.address === address)?.symbol ??
    '—'
  );
}
/** Keep settings on a valid pair as asset metadata arrives or the input changes. */
function ensurePair(): void {
  if (props.assets.length < 2) return;
  if (!inputAsset.value)
    settings.assetInAddress =
      props.assets.find((asset) => asset.address === XOR.address)?.address ?? props.assets[0].address;
  if (!outputAsset.value || settings.assetOutAddress === settings.assetInAddress)
    settings.assetOutAddress =
      props.assets.find((asset) => asset.address === VAL.address && asset.address !== settings.assetInAddress)
        ?.address ?? props.assets.find((asset) => asset.address !== settings.assetInAddress)!.address;
  extraOutputs.value = extraOutputs.value.filter(
    (address) =>
      address !== settings.assetInAddress &&
      address !== settings.assetOutAddress &&
      props.assets.some((asset) => asset.address === address)
  );
}
/** Reverse the selected pair atomically; additional markets remain explicit. */
function reversePair(): void {
  const input = settings.assetInAddress;
  settings.assetInAddress = settings.assetOutAddress;
  settings.assetOutAddress = input;
  ensurePair();
}
/** Multi-market batches permit at most four distinct output tokens. */
function addOutput(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const address = select.value;
  if (
    !customStrategy.value &&
    outputs.value.length < 4 &&
    extraOutputAssets.value.some((asset) => asset.address === address)
  )
    extraOutputs.value = [...extraOutputs.value, address];
  select.value = '';
}
/** Add comparison runs without changing the primary strategy's explanation. */
function togglePreset(preset: ResearchSettings['preset']): void {
  if (running.value) return;
  presets.value = presets.value.includes(preset)
    ? presets.value.filter((value) => value !== preset)
    : [...presets.value, preset];
  if (presets.value.length && !presets.value.includes(previewPreset.value)) {
    previewPreset.value = presets.value[0];
    settings.preset = previewPreset.value;
  }
}
/** One shared chooser activates an exact preset or recipe; it never starts research. */
function chooseStrategy(choice: StrategyChoice): void {
  if (running.value) return;
  if (choice.kind === 'preset') {
    choosePreset(choice.id);
    return;
  }
  ruleDraft.value = ruleRecipe(choice.id);
  ruleName.value = t(choice.nameKey);
  extraOutputs.value = [];
  setRulesMode(true);
}
/** A quick choice selects one complete preset; additional comparisons remain separately selectable. */
function choosePreset(preset: ResearchSettings['preset']): void {
  if (running.value) return;
  customStrategy.value = undefined;
  rulesMode.value = false;
  previewPreset.value = preset;
  presets.value = [preset];
  settings.preset = preset;
  extraOutputs.value = [];
  variations.value = 1;
}
/** Keep the selected history window explicit and anchored to the latest completed hour. */
function changeHistoryRange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (running.value || !['30', '90', 'all'].includes(value)) return;
  historyRange.value = value as '30' | '90' | 'all';
  const end = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  settings.historyEndAt = end;
  settings.historyStartAt =
    value === 'all'
      ? RESEARCH_DEFAULT_SETTINGS.historyStartAt
      : Math.max(RESEARCH_DEFAULT_SETTINGS.historyStartAt ?? 0, end - Number(value) * 86_400_000);
}
/** Review the exact saved configuration, preserving custom signal rules and original dates. */
async function reviewRunSettings(run: ExperimentRun, field: 'order-size' | 'rules' | 'fees'): Promise<void> {
  if (running.value) return;
  Object.assign(settings, run.settings);
  historyRange.value = 'custom';
  extraOutputs.value = [];
  variations.value = 1;
  presets.value = [run.settings.preset];
  previewPreset.value = run.settings.preset;
  customStrategy.value = run.strategy ? structuredClone(run.strategy) : undefined;
  customStrategyName.value = run.name;
  rulesMode.value = run.strategy?.kind === 'rules';
  if (rulesMode.value && run.strategy?.rules) {
    ruleDraft.value = parseStrategyRules(run.strategy.rules);
    ruleName.value = run.name;
    customStrategy.value = undefined;
  }
  await nextTick();
  const target =
    field === 'order-size'
      ? orderSizeInput.value
      : field === 'fees'
        ? feeBudgetInput.value
        : rulesMode.value
          ? rulesDetails.value
          : settingsDetails.value;
  (target ?? builderSection.value)?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  target?.focus();
}
/** Switch to one exact rule tree with a cadence compatible with completed hourly observations. */
function setRulesMode(enabled: boolean): void {
  customStrategy.value = undefined;
  rulesMode.value = enabled;
  if (enabled) {
    settings.intervalBlocks = Math.max(600, cadenceBlocks.value);
    settings.optimize = false;
    variations.value = 1;
  }
}
/** Move to the always-visible AI composer without changing account or draft state. */
function focusComposer(): void {
  composerOpen.value = true;
  composerSection.value?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  composerSection.value?.focus();
}
/** A public link restores conditions only; it never queues work or copies a portfolio. */
watch(
  () => props.sharedRules,
  (value) => {
    if (value === undefined) return;
    const decoded = decodeRuleShare(value);
    if (!decoded) {
      error.value = 'bots.rules.invalidLink';
      return;
    }
    ruleDraft.value = decoded;
    ruleName.value = t('bots.rules.sharedName');
    setRulesMode(true);
  },
  { immediate: true }
);
/** Names expose the changed rule so nearby alternatives can be identified in the table. */
function experimentName(value: ResearchSettings): string {
  const detail =
    value.preset === 'dca'
      ? value.intervalBlocks === undefined
        ? `${value.intervalHours}h`
        : value.intervalBlocks >= 600 && value.intervalBlocks % 600 === 0
          ? t('bots.uxLab.everyHours', { count: value.intervalBlocks / 600 })
          : t('bots.lab.blockCount', { count: value.intervalBlocks })
      : value.preset === 'threshold'
        ? `${value.thresholdPercent}%`
        : `${value.fastWindow}/${value.slowWindow}`;
  return `${t(`bots.playground.presets.${value.preset}`)} · ${detail}`;
}
/** Start an immutable batch; editing the builder never mutates an existing result. */
async function startBatch(): Promise<void> {
  if (running.value || !canBuild.value) return;
  error.value = '';
  try {
    if (historyRange.value !== 'custom') {
      const end = Math.floor(Date.now() / 3_600_000) * 3_600_000;
      settings.historyStartAt =
        historyRange.value === 'all'
          ? RESEARCH_DEFAULT_SETTINGS.historyStartAt
          : Math.max(RESEARCH_DEFAULT_SETTINGS.historyStartAt ?? 0, end - Number(historyRange.value) * 86_400_000);
    }
    const runSettings = {
      ...settings,
      historyEndAt:
        historyRange.value === 'custom' ? settings.historyEndAt : Math.floor(Date.now() / 3_600_000) * 3_600_000,
    };
    const definition = customStrategy.value
      ? [
          {
            id: crypto.randomUUID(),
            name: customStrategyName.value,
            settings: runSettings,
            strategy: {
              ...structuredClone(customStrategy.value),
              amount: createPlaygroundBot(runSettings, props.assets).strategy.amount,
              intervalMs: cadenceBlocks.value * 6000,
            },
          },
        ]
      : rulesMode.value
        ? buildRuleBatch(runSettings, outputs.value, ruleDraft.value, ruleName.value, props.assets, () =>
            crypto.randomUUID()
          )
        : buildLabBatch(
            {
              settings: runSettings,
              outputs: outputs.value,
              presets: presets.value,
              variations: variations.value,
            },
            props.assets,
            experimentName,
            () => crypto.randomUUID()
          );
    await runDefinitions(definition);
  } catch {
    error.value = 'bots.lab.invalidConfiguration';
  }
}
/** Queue up to 36 studies and retain at most 36 earlier runs in memory; persist each completed run separately. */
async function runDefinitions(definitions: ExperimentDefinition[]): Promise<void> {
  if (running.value || !definitions.length) return;
  const current = ++generation;
  runner?.dispose();
  running.value = true;
  error.value = '';
  batchIds.value = definitions.map((definition) => definition.id);
  visibleIds.value = batchIds.value.slice(0, 3);
  selectedId.value = visibleIds.value[0];
  const createdAt = Date.now();
  runs.value = [
    ...definitions.map((definition): ExperimentRun => ({ ...definition, status: 'queued', progress: 0, createdAt })),
    ...runs.value.slice(0, 36),
  ];
  // Reveal the real checkpoint flow as soon as the explicitly requested batch mounts.
  void nextTick(() =>
    decisionSection.value?.scrollIntoView?.({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  );
  const retainedIds = new Set(runs.value.map((run) => run.id));
  pinnedIds.value = pinnedIds.value.filter((id) => retainedIds.has(id));
  const writes: Promise<void>[] = [];
  runner = createExperimentRunner({
    assets: props.assets.map((asset) => ({ ...asset })),
    awaitProgress: async (checkpoint, signal, id) => {
      await nextTick();
      const view = props.active ? checkpointViews.get(id) : undefined;
      if (view) await view.waitForCheckpoint(checkpoint.checkpoint, signal);
      else await awaitResearchPaint(signal);
    },
    loadHistory: props.loadHistory,
    loadFees: props.loadFees,
    onUpdate: (run) => {
      if (!mounted || current !== generation) return;
      const old = runs.value.find((item) => item.id === run.id);
      runs.value = runs.value.map((item) => (item.id === run.id ? run : item));
      if (run.status === 'complete' && old?.status !== 'complete') {
        writes.push(
          store.save(run).catch(() => {
            if (mounted) storageError.value = true;
          })
        );
        announcement.value = t('bots.lab.runComplete', { name: run.name });
      }
    },
  });
  try {
    await runner.run(definitions);
    await Promise.all(writes);
  } catch {
    if (current === generation) error.value = 'bots.lab.batchError';
  } finally {
    if (mounted && current === generation) running.value = false;
  }
}
/** Stop remaining computation without deleting completed comparison evidence. */
function cancelBatch(): void {
  runner?.cancel();
  announcement.value = t('bots.lab.batchCancelled');
}
/** Applying an LLM suggestion starts an exact, deterministic research run for its reviewed pair. */
async function addSuggested(proposal: {
  name: string;
  strategy: StrategyConfig;
  settings: ResearchSettings;
}): Promise<void> {
  if (running.value) {
    error.value = 'bots.lab.waitForBatch';
    return;
  }
  composerOpen.value = false;
  await runDefinitions([
    {
      id: crypto.randomUUID(),
      name: proposal.name,
      strategy: { ...proposal.strategy },
      settings: { ...proposal.settings, historyEndAt: Math.floor(Date.now() / 3_600_000) * 3_600_000 },
    },
  ]);
}
/** Load a duplicate into the editable builder; the original remains unchanged. */
function duplicateRun(run: ExperimentRun): void {
  if (running.value) return;
  customStrategy.value = undefined;
  historyRange.value = 'custom';
  if (run.strategy?.kind === 'rules' && run.strategy.rules) {
    Object.assign(settings, run.settings);
    ruleDraft.value = parseStrategyRules(run.strategy.rules);
    ruleName.value = `${run.name.slice(0, 65)} · ${t('bots.lab.copy')}`.slice(0, 80);
    extraOutputs.value = [];
    setRulesMode(true);
    announcement.value = t('bots.lab.duplicateReady');
    return;
  }
  if (run.strategy) {
    const suffix = ` · ${t('bots.lab.copy')}`.slice(0, 80);
    void runDefinitions([
      {
        id: crypto.randomUUID(),
        name: `${run.name.slice(0, 80 - suffix.length)}${suffix}`,
        settings: { ...run.settings, historyEndAt: Math.floor(Date.now() / 3_600_000) * 3_600_000 },
        strategy: { ...run.strategy },
      },
    ]);
    return;
  }
  Object.assign(settings, run.settings);
  rulesMode.value = false;
  settings.intervalBlocks = run.settings.intervalBlocks;
  presets.value = [run.settings.preset];
  previewPreset.value = run.settings.preset;
  extraOutputs.value = [];
  variations.value = 1;
  announcement.value = t('bots.lab.duplicateReady');
}
/** Keep at most three animated results visible so comparison remains readable and GPU work bounded. */
function selectRun(id: string, reveal = false): void {
  selectedId.value = id;
  if (!visibleIds.value.includes(id)) visibleIds.value = [...visibleIds.value.slice(-2), id];
  if (reveal)
    void nextTick(() =>
      decisionSection.value?.scrollIntoView?.({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    );
}
/** Explicit checkboxes choose the experiments shown in parallel without changing their calculations. */
function toggleVisible(id: string): void {
  visibleIds.value = visibleIds.value.includes(id)
    ? visibleIds.value.filter((value) => value !== id)
    : [...visibleIds.value.slice(-2), id];
  // Removing every chart trace keeps the selected study as the table's comparison reference.
  if (!visibleIds.value.includes(selectedId.value)) selectedId.value = visibleIds.value[0] ?? selectedId.value;
}
/** Shortlisting persists identifiers only; errors never affect financial data or research results. */
function togglePin(id: string): void {
  pinnedIds.value = pinnedIds.value.includes(id)
    ? pinnedIds.value.filter((value) => value !== id)
    : [...pinnedIds.value, id].slice(-36);
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pinnedIds.value));
  } catch {
    storageError.value = true;
  }
  if (pinnedIds.value.includes(id)) selectRun(id);
}
/** Pass a reviewed study to live setup or an explicit paper save; research itself never starts execution. */
async function createFromRun(run: ExperimentRun, mode: 'live' | 'paper' = 'live'): Promise<void> {
  if (!run.result || !run.fees || props.saving || promoting.value) return;
  promoting.value = true;
  error.value = '';
  try {
    const current = await props.loadFees(run.result.bot, run.result.settings);
    const identity = run.result.source.history.identity;
    if (
      !identity ||
      current.genesisHash !== identity.genesisHash ||
      current.denominator !== identity.denominator ||
      current.expiresAt <= Date.now()
    )
      throw new Error('bots.lab.changedNetwork');
    if (!mounted) return;
    const bot = structuredClone(run.result.bot);
    bot.name = run.name;
    const research = makeExperimentSnapshot(run.result, run.fees);
    if (mode === 'paper') emit('save', bot, { ...run.result.settings }, research);
    else emit('start', bot, { ...run.result.settings }, research, { ...identity });
  } catch {
    if (mounted) error.value = 'bots.lab.promotionUnavailable';
  } finally {
    promoting.value = false;
  }
}
/** Display the study's actual observation period, keeping date identity visible in saved comparisons. */
function period(run: ExperimentRun): string {
  const candles = run.result?.source.history.candles;
  return candles?.length ? experimentDateRange(candles[0].timestamp, candles.at(-1)!.timestamp) : '';
}
/** UTC timestamps keep saved evidence unambiguous across locale changes. */
function timestamp(value: number): string {
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}
watch(
  () => [props.assets, settings.assetInAddress],
  () => {
    ensurePair();
  },
  { deep: false }
);
onMounted(async () => {
  mounted = true;
  ensurePair();
  try {
    pinnedIds.value = parseLabPins(localStorage.getItem(PIN_KEY));
  } catch {
    storageError.value = true;
  }
  try {
    const saved = await store.list();
    if (!mounted) return;
    runs.value = saved;
    const preferred = [
      ...saved.filter((run) => pinnedIds.value.includes(run.id)),
      ...saved.filter((run) => !pinnedIds.value.includes(run.id)),
    ];
    visibleIds.value = preferred.slice(0, 3).map((run) => run.id);
    selectedId.value = visibleIds.value[0] ?? '';
  } catch {
    if (mounted) storageError.value = true;
  }
  if (mounted) {
    ready.value = true;
  }
});
onUnmounted(() => {
  mounted = false;
  generation++;
  runner?.dispose();
  store.close();
});
</script>

<style scoped lang="scss">
.strategy-lab,
.lab-market-controls {
  --lab-bg: var(--bot-recess, var(--s-color-base-background));
  --lab-panel: var(--bot-surface, var(--s-color-utility-surface));
  --lab-line: var(--s-color-base-border-secondary);
  --lab-text: var(--s-color-base-content-primary);
  --lab-muted: var(--s-color-base-content-secondary);
  --lab-accent: var(--s-color-action-text);
  --lab-cyan: var(--bot-cyan, var(--s-color-status-success-text));
  --lab-raised: none;
  --lab-inset: none;
}
.strategy-lab {
  background: transparent;
  color: var(--lab-text);
  padding: 12px 0 24px;
  border-radius: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-shadow: none;
}
.strategy-lab :deep(*),
.lab-market-controls :deep(*) {
  box-sizing: border-box;
}
.strategy-lab,
.lab-market-controls {
  button,
  select,
  input {
    font: inherit;
  }
  button {
    color: var(--lab-text);
    background: var(--lab-panel);
    border: 1px solid transparent;
    border-radius: 10px;
    box-shadow: var(--lab-raised);
    cursor: pointer;
    min-height: 36px;
    padding: 8px 12px;
    transition:
      border-color 160ms,
      color 160ms,
      background 160ms,
      box-shadow 160ms,
      transform 160ms;
  }
  button:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: var(--lab-inset);
  }
  button:hover:not(:disabled),
  button[aria-pressed='true'] {
    color: var(--lab-accent);
    border-color: var(--lab-accent);
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  button.lab-primary {
    background: var(--s-color-action-fill);
    color: var(--s-color-on-action);
    border-color: transparent;
  }
  button.lab-primary:hover:not(:disabled) {
    background: var(--s-color-action-fill-hover);
    color: var(--s-color-on-action);
  }
  button.lab-run-results {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 58px;
    padding: 16px 24px;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 600;
  }
  button.lab-run-results:disabled {
    opacity: 1;
    background: var(--s-color-action-disabled-fill);
    color: var(--s-color-on-action-disabled);
    box-shadow: var(--lab-inset);
  }
  button[aria-pressed='true'] {
    box-shadow: var(--lab-inset);
  }
  input,
  select {
    background: var(--lab-bg);
    color: var(--lab-text);
    width: 100%;
    min-width: 0;
    border: 1px solid var(--lab-line);
    border-radius: 10px;
    box-shadow: var(--lab-inset);
    padding: 11px 13px;
    min-height: 44px;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  input:hover,
  select:hover {
    border-color: color-mix(in srgb, var(--lab-accent) 35%, var(--lab-line));
  }
  select {
    appearance: none;
    padding-inline-end: 36px;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--lab-muted) 50%),
      linear-gradient(135deg, var(--lab-muted) 50%, transparent 50%);
    background-position:
      calc(100% - 18px) center,
      calc(100% - 13px) center;
    background-size: 5px 5px;
    background-repeat: no-repeat;
  }
  select:dir(rtl) {
    background-position:
      13px center,
      18px center;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    font-size: 13px;
    color: var(--lab-text);
    margin: 0;
  }
  p {
    margin: 0;
  }
  h2,
  h3 {
    color: var(--lab-text);
    margin: 0;
  }
  h2 {
    font-size: 20px;
    line-height: 1.4;
    letter-spacing: -0.3px;
    font-weight: 600;
    text-transform: none;
  }
  h3 {
    font-size: 17px;
    font-weight: 500;
  }
}
.lab-heading,
.lab-heading-actions,
.lab-source-line,
.lab-preset-row,
.lab-presets,
.lab-run-toolbar,
.lab-playback-actions,
.lab-section-title,
.lab-row-actions,
.lab-inspection-facts {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.lab-heading,
.lab-section-title,
.lab-run-toolbar {
  justify-content: space-between;
}
.lab-heading p {
  color: var(--lab-muted);
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 54ch;
}
.lab-kicker {
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  color: var(--lab-muted);
}
.lab-source-line {
  margin: 12px 0 24px;
  padding: 0;
  column-gap: 20px;
  row-gap: 6px;
  color: var(--lab-muted);
  font-size: 12px;
}
.lab-source {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--lab-muted);
}
.lab-source.verified {
  color: var(--lab-cyan);
}
.lab-source.pending {
  color: var(--lab-muted);
}
.lab-source i {
  height: 5px;
  width: 5px;
  flex: 0 0 5px;
  background: currentColor;
  border-radius: 50%;
  box-shadow: none;
}
.strategy-lab.is-running .lab-source i.working {
  animation: data-pulse 1.5s ease-in-out infinite;
}
.lab-storage-state {
  margin-inline-start: 0;
}
.lab-error {
  color: var(--s-color-status-error-text);
  padding: 12px 0;
}
.lab-notice {
  color: var(--s-color-status-warning-text);
  padding: 10px 0;
}
.lab-builder {
  background: transparent;
  padding: 0;
  margin-bottom: 28px;
  border-radius: var(--s-border-radius-small);
  box-shadow: none;
}
.lab-market-controls {
  display: grid;
  margin-bottom: 26px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--lab-line);
  grid-template-columns: #{'minmax(100px, 1fr)'} 36px #{'minmax(100px, 1fr)'} #{'minmax(140px, 0.8fr)'};
  gap: 12px;
  align-items: end;
}
.lab-strategy-preview {
  grid-column: 1 / -1;
  min-width: 0;
}
.lab-launch {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  margin-top: 8px;
}
.lab-strategy-choice {
  grid-column: 1 / -1;
  min-width: 0;
  margin-top: 8px;
  h2 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px;
  }
}
.lab-strategy-picker {
  display: grid;
  grid-template-columns: repeat(4, #{'minmax(0, 1fr)'});
  grid-auto-rows: 1fr;
  gap: 9px;
  button {
    display: flex;
    align-items: center;
    text-align: start;
    gap: 9px;
    min-width: 0;
    min-height: 58px;
    padding: 12px;
    border-color: var(--lab-line);
    box-shadow: 0 3px 9px color-mix(in srgb, var(--lab-text) 5%, transparent);
  }
  button[aria-pressed='true'] {
    border-color: var(--lab-accent);
    background: color-mix(in srgb, var(--lab-accent) 8%, var(--lab-panel));
    box-shadow: inset 0 0 0 1px var(--lab-accent);
  }
  svg {
    width: 32px;
    height: 24px;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
  }
  strong {
    font-size: 13px;
    line-height: 1.35;
    font-weight: 600;
    overflow-wrap: normal;
  }
}
.lab-selected-idea {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--lab-muted);
}
.lab-compare-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  legend {
    margin-bottom: 10px;
    font-size: 12px;
  }
  label {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 7px;
    font-size: 12px;
  }
  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
    accent-color: var(--lab-accent);
  }
}
.lab-custom-choice {
  grid-column: 1 / -1;
  font-size: 13px;
}
.lab-quick-options {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  label.lab-history-choice {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    select {
      width: auto;
      min-height: 36px;
      padding: 6px 10px;
      padding-inline-end: 32px;
      box-shadow: none;
    }
  }
  > button {
    min-height: 40px;
    padding-inline: 4px;
    box-shadow: none;
    color: var(--lab-accent);
  }
}
.lab-selected-action {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-block: 20px;
  > strong {
    font-size: 14px;
  }
  > button {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    min-height: 52px;
    min-width: 220px;
  }
}
.lab-more-analysis {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--lab-line);
  > h3 {
    padding: 10px 0;
    font-weight: 600;
    color: var(--lab-text);
  }
}
@media (max-width: 560px) {
  .lab-strategy-picker {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 8px;
    button {
      gap: 8px;
      padding: 10px;
      min-height: 58px;
    }
    svg {
      width: 24px;
    }
    strong {
      font-size: 12px;
    }
  }
  .lab-quick-options {
    gap: 8px;
    label.lab-history-choice {
      gap: 7px;
      font-size: 12px;
    }
    label.lab-history-choice select {
      max-width: 136px;
      font-size: 12px;
    }
    > button {
      font-size: 12px;
    }
  }
  .lab-launch-details {
    font-size: 12px;
    gap: 4px;
  }
  .lab-launch .lab-source-line {
    font-size: 11px;
  }
}
.lab-launch-details {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  color: var(--lab-muted);
  font-size: 12px;
  line-height: 1.5;
}
.lab-launch .lab-source-line {
  margin: 0;
  padding: 0;
}
.lab-launch .lab-error {
  padding: 0;
  font-size: 13px;
}
.lab-reverse {
  align-self: end;
  padding-inline: 6px !important;
  min-height: 44px !important;
  color: var(--lab-accent) !important;
}
.lab-unit-input {
  position: relative;
}
.lab-unit-input input {
  padding-inline-end: 66px;
}
.lab-unit-input > span {
  position: absolute;
  inset-inline-end: 10px;
  top: 14px;
  color: var(--lab-muted);
}
.lab-preset-row {
  margin-top: 16px;
  justify-content: space-between;
  align-items: end;
}
.lab-presets {
  gap: 8px;
}
.lab-presets button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
}
.lab-add-market {
  min-width: 135px;
}
.lab-add-market > span {
  font-size: 11px;
}
.lab-market-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  font-size: 12px;
}
.lab-market-tags button {
  padding: 4px 9px;
  min-height: 28px;
}
.lab-current-market {
  color: var(--lab-cyan);
}
.lab-settings {
  margin-top: 16px;
  border-top: 1px solid var(--lab-line);
}
.lab-settings h4 {
  padding: 13px 0;
  margin: 0;
  font-size: 14px;
  color: var(--lab-text);
}
.lab-settings h4 span {
  color: var(--lab-muted);
  margin-inline-start: 14px;
  font-size: 12px;
}
.lab-settings-grid {
  display: grid;
  grid-template-columns: repeat(5, #{'minmax(100px, 1fr)'});
  gap: 12px;
  padding: 8px 0 14px;
}
.lab-settings p {
  color: var(--lab-muted);
  font-size: 11px;
  margin-bottom: 9px;
}
.lab-run-toolbar {
  padding: 16px 0;
  border-bottom: 1px solid var(--lab-line);
}
.lab-run-toolbar > div {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.lab-run-toolbar strong {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.lab-run-toolbar strong span {
  color: var(--lab-muted);
}
.lab-muted {
  color: var(--lab-muted);
  font-size: 12px;
}
.lab-compute-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--lab-bg);
  box-shadow: var(--lab-inset);
  margin-bottom: 12px;
}
.lab-compute-progress i {
  display: block;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, var(--lab-accent), var(--lab-cyan));
  transition: width 160ms linear;
}
.lab-compute-progress i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 45%) 50%, transparent 70%);
  transform: translateX(-100%);
}
.strategy-lab.is-running .lab-compute-progress i::after {
  animation: compute-scan 1600ms linear infinite;
}
.lab-experiment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, #{'minmax(260px, 1fr)'});
  gap: 14px;
  align-items: stretch;
}
.lab-experiment-grid > :deep(.experiment-card.is-selected) {
  grid-column: 1 / -1;
}
.lab-experiment-grid :deep(.experiment-card.is-selected .experiment-visual) {
  width: 100%;
  max-width: 940px;
  margin-inline: auto;
}
.lab-empty {
  padding: 32px 20px;
  text-align: center;
  background: transparent;
}
.lab-empty-orbit {
  color: var(--lab-accent);
  font-size: 44px;
  margin-bottom: 12px;
}
.lab-empty p {
  color: var(--lab-muted);
  margin: 12px auto 22px;
  max-width: 430px;
}
.lab-view-note {
  color: var(--lab-muted);
  font-size: 11px;
  margin: 12px 0;
}
.lab-equity-section {
  border-top: 0;
}
.lab-equity-section,
.lab-comparison,
.lab-inspection {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--lab-line);
}
.lab-section-title {
  margin-bottom: 16px;
}
.lab-section-title > span {
  color: var(--lab-muted);
  font-size: 11px;
}
.lab-sort {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
}
.lab-sort select {
  width: auto;
  min-height: 34px;
  padding-block: 5px;
}
.lab-table-wrap {
  overflow-x: auto;
  max-width: 100%;
}
.strategy-lab table {
  border-collapse: collapse;
  width: 100%;
  text-align: start;
  font-size: 12px;
}
.strategy-lab th {
  color: var(--lab-muted);
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}
.strategy-lab td,
.strategy-lab th {
  padding: 12px 10px;
  border-bottom: 1px solid var(--lab-line);
}
.strategy-lab td {
  vertical-align: middle;
}
.strategy-lab td input[type='checkbox'] {
  width: 17px;
  height: 17px;
  min-height: 0;
  accent-color: var(--lab-accent);
}
.strategy-lab td small {
  display: block;
  color: var(--lab-muted);
  font-size: 10px;
  margin-top: 5px;
}
.lab-number {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.strategy-lab tr.focused {
  background: color-mix(in srgb, var(--lab-accent) 5%, transparent);
}
.strategy-lab button.lab-run-name {
  border: 0;
  box-shadow: none;
  background: transparent;
  text-align: start;
  padding: 0;
  min-height: 24px;
  font-size: 12px;
  max-width: 240px;
}
.lab-row-actions {
  gap: 5px;
  flex-wrap: nowrap;
}
.lab-row-actions button {
  padding: 5px 8px;
  min-height: 30px;
  font-size: 11px;
  white-space: nowrap;
}
.lab-method-note {
  color: var(--lab-muted);
  font-size: 11px;
  margin-top: 12px !important;
  max-width: 850px;
}
.lab-inspection-facts {
  color: var(--lab-cyan);
  font:
    11px ui-monospace,
    monospace;
  gap: 18px;
}
.lab-inspection p {
  color: var(--lab-muted);
  font-size: 12px;
  margin-top: 12px;
}
.lab-inspection > section {
  margin-top: 16px;
}
.lab-inspection h4 {
  margin: 0;
  padding: 8px 0;
  font-size: 12px;
}
.lab-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@keyframes compute-scan {
  to {
    transform: translateX(100%);
  }
}
.lab-experiment-grid > :deep(*) {
  animation: workspace-arrive 380ms ease-out both;
}
.lab-experiment-grid > :deep(:nth-child(2)) {
  animation-delay: 70ms;
}
.lab-experiment-grid > :deep(:nth-child(3)) {
  animation-delay: 140ms;
}
@keyframes data-pulse {
  50% {
    opacity: 0.35;
    box-shadow: 0 0 15px color-mix(in srgb, var(--lab-cyan) 40%, transparent);
  }
}
@media (max-width: 1180px) {
  .lab-settings-grid {
    grid-template-columns: repeat(3, #{'minmax(100px, 1fr)'});
  }
  .lab-experiment-grid {
    gap: 9px;
  }
  .strategy-lab {
    padding: 18px 0;
  }
}
@media (max-width: 950px) {
  .lab-experiment-grid {
    grid-template-columns: 1fr;
  }
  .lab-market-controls {
    grid-template-columns: #{'minmax(90px, 1fr)'} 36px #{'minmax(90px, 1fr)'};
  }
  .lab-starting-capital {
    grid-column: 1 / -1;
  }
}
@media (max-width: 560px) {
  .strategy-lab {
    padding: 14px 0;
    border-radius: 0;
  }
  .lab-builder {
    padding: 0;
  }
  .lab-heading-actions {
    width: 100%;
  }
  .lab-heading-actions button {
    flex: 1;
    font-size: 12px;
    padding-inline: 8px;
  }
  .lab-settings-grid {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  }
  .lab-preset-row {
    align-items: stretch;
  }
  .lab-presets {
    width: 100%;
  }
  .lab-add-market {
    width: 100%;
  }
  .lab-storage-state {
    margin-inline-start: 0;
  }
  .lab-settings h4 span {
    display: block;
    margin: 8px 0 0;
  }
  .lab-builder-footer button {
    width: 100%;
  }
  .lab-sort {
    width: 100%;
  }
  .lab-sort select {
    flex: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lab-source i.working {
    animation: none;
  }
  .lab-compute-progress i {
    transition: none;
  }
}

.lab-heading-actions {
  gap: 8px;
}
.lab-heading-actions button {
  min-height: 40px;
  font-size: 13px;
  white-space: normal;
  text-align: center;
}
.lab-heading-actions button:not(.lab-primary) {
  background: var(--lab-panel);
}
.lab-rule-check {
  border: 1px solid var(--lab-line);
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  font-size: 11px;
}
.chosen .lab-rule-check {
  background: var(--lab-accent);
  color: var(--s-color-on-action);
  border-color: var(--lab-accent);
}
.lab-add-market {
  display: flex;
  flex-direction: row !important;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px !important;
}
.lab-add-market select {
  width: auto;
}
.lab-resolution {
  margin: 14px 0 !important;
  padding-inline-start: 12px;
  border-inline-start: 2px solid var(--lab-accent);
  line-height: 1.6;
}
.lab-method-note {
  font-size: 13px;
  line-height: 1.6;
  margin: 10px 0 16px !important;
}
.lab-decisions {
  margin-top: 28px;
  scroll-margin-top: 86px;
}
.lab-inspection,
.lab-comparison,
.lab-decisions,
.lab-builder {
  animation: workspace-arrive 420ms 80ms ease-out both;
}
.strategy-lab th {
  font-size: 12px;
  font-weight: 500;
}
.strategy-lab td small {
  font-size: 11px;
  line-height: 1.5;
}
.lab-settings p,
.lab-builder-footer > span {
  font-size: 13px;
  line-height: 1.6;
}
.lab-builder-footer {
  margin-top: 12px;
}
@keyframes workspace-arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 760px) {
  .lab-heading {
    align-items: flex-start;
  }
  .lab-heading-actions {
    width: 100%;
  }
  .lab-source-line {
    gap: 8px 16px;
  }
  .lab-storage-state {
    margin-inline-start: 0;
  }
  .lab-add-market {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lab-inspection,
  .lab-comparison,
  .lab-decisions,
  .lab-builder,
  .lab-source i.working {
    animation: none;
  }
  .lab-explain span,
  .lab-rule,
  .lab-compute-progress i {
    transition: none;
  }
}
.lab-validation {
  margin-top: 24px;
}

.lab-design-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}
.lab-rule-mode {
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  padding: 5px;
  border-radius: 13px;
  background: var(--lab-bg);
  box-shadow: var(--lab-inset);
}
.lab-rule-mode button {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  border-radius: 9px;
  background: transparent;
  box-shadow: none;
  color: var(--lab-muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.lab-rule-mode button[aria-pressed='true'] {
  color: var(--lab-accent);
  border-bottom-color: transparent;
  background: var(--lab-panel);
  box-shadow: var(--lab-raised);
}
.lab-rule-mode button:focus-visible {
  outline: 2px solid var(--lab-accent);
  outline-offset: 3px;
}
.lab-rule-mode button span {
  margin-left: 6px;
}
.lab-design-workspace > :deep(.strategy-flow) {
  width: 100%;
}
.lab-design-workspace .lab-preset-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.lab-design-workspace .lab-presets {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  flex: 1;
  gap: 12px;
  margin: 0;
}
.lab-design-workspace .lab-rule {
  display: flex;
  align-items: stretch;
  min-width: 0;
  gap: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--lab-panel);
  box-shadow: var(--lab-raised);
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}
.lab-design-workspace .lab-rule:hover {
  transform: translateY(-2px);
}
.lab-design-workspace .lab-rule.previewing {
  border-color: color-mix(in srgb, var(--lab-accent) 45%, transparent);
  box-shadow: var(--lab-inset);
}
.lab-design-workspace .lab-rule-include {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  min-width: 36px;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}
.lab-design-workspace button.lab-explain {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 10px;
  margin: 0;
  padding: 10px 8px 12px 0;
  min-width: 0;
  min-height: 54px;
  border: 0;
  color: var(--lab-muted);
  text-align: start;
  background: transparent;
  box-shadow: none;
}
.lab-design-workspace button.lab-explain[aria-pressed='true'] {
  color: var(--lab-text);
}
.lab-explain strong {
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
}
.lab-rule-glyph {
  flex: 0 0 36px;
  width: 36px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lab-design-workspace .lab-add-market {
  display: block;
  margin: 0;
  min-width: 155px;
}
.lab-design-workspace .lab-add-market select {
  margin-top: 5px;
}
.lab-design-workspace .lab-market-tags {
  margin: 0;
}
@media (max-width: 1050px) {
  .lab-design-workspace .lab-preset-row {
    flex-wrap: wrap;
  }
  .lab-design-workspace .lab-presets {
    flex-basis: 100%;
  }
  .lab-rule-glyph {
    display: none;
  }
}
@media (max-width: 560px) {
  .lab-heading {
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
  }
  .lab-heading-actions {
    width: auto;
    flex: 0 1 auto;
  }
  .lab-heading-actions button {
    min-height: 34px;
    font-size: 11px;
  }
  .lab-design-workspace .lab-presets {
    gap: 6px;
  }
  .lab-design-workspace .lab-rule {
    display: flex;
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .lab-design-workspace .lab-rule-include {
    flex-basis: 32px;
    min-height: 32px;
  }
  .lab-design-workspace button.lab-explain {
    min-height: 48px;
    padding: 6px 2px;
    justify-content: center;
    text-align: center;
  }
  .lab-explain strong {
    font-size: 12px;
  }
  .lab-design-workspace .lab-add-market {
    width: auto;
    margin-inline-start: auto;
  }
  .lab-design-workspace .lab-add-market select {
    min-height: 32px;
    padding-block: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lab-design-workspace .lab-rule,
  .strategy-lab button,
  .strategy-lab input,
  .strategy-lab select,
  .lab-market-controls button,
  .lab-market-controls input,
  .lab-market-controls select {
    transition: none;
  }
  .strategy-lab.is-running .lab-compute-progress i::after,
  .strategy-lab.is-running .lab-source i.working,
  .lab-experiment-grid > :deep(*) {
    animation: none;
  }
  .lab-design-workspace .lab-rule:hover,
  .strategy-lab button:active:not(:disabled),
  .lab-market-controls button:active:not(:disabled) {
    transform: none;
  }
}

/* The whole setup stays visible; headings and spacing organize choices without disclosures. */
.lab-market-controls {
  max-width: 960px;
  margin-inline: auto;
  gap: 16px;
  padding-block: 8px 28px;
}
.strategy-lab {
  max-width: 1120px;
  margin-inline: auto;
}
.lab-market-controls .lab-strategy-choice {
  margin-top: 8px;
  border-block: 1px solid var(--lab-line);
  .lab-choice-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 24px;
    min-height: 66px;
    padding-block: 12px;
    strong {
      font-size: 17px;
      font-weight: 600;
    }
  }
  .lab-choice-label {
    margin: 0;
    color: var(--lab-text);
    font-size: 16px;
    font-weight: 600;
  }
  .lab-strategy-picker {
    margin: 4px 0 18px;
  }
}
.lab-market-controls .lab-selected-idea {
  grid-column: 1 / -1;
  margin: 0;
  max-width: 76ch;
}
.lab-limit-summary {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
  gap: 16px;
  margin: 0;
  padding: 18px 0 4px;
  dt {
    font-size: 12px;
    color: var(--lab-muted);
    margin-bottom: 6px;
  }
  dd {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
  }
  small {
    display: block;
    font-size: 12px;
    font-weight: 400;
    color: var(--lab-muted);
  }
}
.lab-market-controls .lab-builder {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0;
  border-block: 1px solid var(--lab-line);
  border-radius: 0;
  .lab-advanced-content {
    padding: 0 0 16px;
  }
  .lab-settings {
    margin: 0;
  }
  .lab-settings > h4,
  .lab-settings > summary {
    font-size: 14px;
    min-height: 48px;
    padding: 14px 0;
  }
  .lab-settings > summary {
    cursor: pointer;
    font-weight: 600;
    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring);
      outline-offset: 3px;
    }
  }
  .lab-settings-grid {
    grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    gap: 18px 24px;
  }
  .lab-settings p {
    line-height: 1.6;
    font-size: 12px;
    max-width: 76ch;
  }
  .lab-preset-row {
    padding-block: 10px;
  }
}
.lab-advanced-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  button {
    color: var(--lab-accent);
    font-size: 13px;
  }
}
.lab-market-controls .lab-strategy-picker button {
  box-shadow: none;
  background: var(--lab-bg);
  border-color: transparent;
  &:hover {
    background: var(--lab-panel);
  }
  &[aria-pressed='true'] {
    border-color: var(--lab-accent);
  }
}
.lab-market-controls .lab-launch {
  margin-top: 0;
}
.lab-market-controls .lab-quick-options {
  margin-block: 0;
}
.lab-market-controls button.lab-run-results {
  min-height: 50px;
  border-radius: 12px;
  font-size: 16px;
  padding: 12px 20px;
}
@media (max-width: 560px) {
  .lab-market-controls {
    gap: 12px;
  }
  .lab-market-controls .lab-strategy-choice .lab-choice-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px 12px;
    .lab-choice-label {
      font-size: 14px;
    }
    strong {
      font-size: 16px;
    }
  }
  .lab-limit-summary {
    gap: 10px;
    padding-top: 10px;
    dd {
      font-size: 14px;
    }
  }
  .lab-market-controls .lab-builder .lab-settings-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
.lab-frequency-note {
  color: var(--lab-muted);
  font-size: 12px;
  line-height: 1.5;
  max-width: 80ch;
}
.lab-strategy-preview :deep(.lesson-plot) {
  height: 130px;
}
.lab-strategy-preview :deep(.strategy-flow) {
  padding-top: 4px;
}
</style>
