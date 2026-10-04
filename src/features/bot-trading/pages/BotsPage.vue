<template>
  <main class="bots-page" :aria-busy="loading">
    <header class="bots-top">
      <div class="bots-heading">
        <RouterLink
          v-if="workspaceView !== 'simple'"
          class="bots-home-link"
          data-testid="bots-home-link"
          :to="botWorkspaceLocation('simple')"
        >
          <span aria-hidden="true">←</span> {{ t('bots.autopilot.title') }}
        </RouterLink>
        <h1>{{ t('bots.title') }}</h1>
      </div>
      <nav v-if="workspaceView === 'simple'" class="bots-top-links" :aria-label="t('bots.workspace')">
        <RouterLink class="bots-top-link" data-testid="bots-my-bots" :to="botWorkspaceLocation('bots')">
          {{ t('bots.yourBots') }}<span v-if="bots.length" class="bots-top-count">{{ bots.length }}</span>
        </RouterLink>
        <RouterLink class="bots-top-link" data-testid="bots-advanced" :to="botWorkspaceLocation('lab')">
          {{ t('bots.advanced') }}
        </RouterLink>
      </nav>
      <div v-if="workspaceView !== 'simple'" class="bots-top-actions">
        <button
          v-if="workspaceView !== 'discover'"
          class="primary"
          data-testid="create-goal"
          @click="openModal('goal')"
        >
          ＋ {{ t('bots.goals.create') }}
        </button>
        <button
          v-if="!walletConnected && workspaceView === 'bots'"
          data-testid="connect-wallet"
          @click="connectSoraWallet"
        >
          {{ t('bots.connectWallet') }}
        </button>
        <button v-if="workspaceView === 'bots' && bots.length" data-testid="new-bot" @click="openCreate">
          ＋ {{ t('bots.uxWorkspace.newPaperBot') }}
        </button>
      </div>
    </header>
    <section
      v-if="workspaceView === 'simple' && runs.items.value.length"
      class="bots-runs"
      data-testid="bots-runs"
      :aria-labelledby="runsTitleId"
    >
      <div class="bots-runs-head">
        <h2 :id="runsTitleId">{{ t('bots.runs.title') }}</h2>
        <RouterLink class="bots-runs-manage" data-testid="bots-runs-manage" :to="botWorkspaceLocation('bots')">
          {{ t('bots.runs.manage') }} <span aria-hidden="true">→</span>
        </RouterLink>
      </div>
      <p class="bots-runs-note">{{ t('bots.runs.keepOpen') }} {{ t('bots.runs.controls') }}</p>
      <BotRunList
        :items="runs.items.value"
        :busy="runs.busy.value"
        :failure="runs.failure.value"
        @pause="runs.pause"
        @resume="runs.resume"
        @stop="runs.stop"
        @open="navigateBot"
        @connect="connectSoraWallet"
      />
    </section>
    <QuantCommandCenter
      v-if="workspaceView === 'simple'"
      :assets="assets"
      :load-fees="researchFees.load"
      :load-history="playgroundHistory.load"
      :busy="busy || !!startIntent"
      @live="startQuant"
      @paper="paperQuant"
      @swap="openSwap"
    />
    <p
      v-if="workspaceView === 'simple' && simpleEligibilityMessage"
      :class="{ 'bots-error': assetsError }"
      data-testid="autopilot-assets-status"
      :role="assetsError ? 'alert' : 'status'"
    >
      {{ simpleEligibilityMessage }}
    </p>
    <BotAutopilot
      v-if="workspaceView === 'simple'"
      :assets="assets"
      :bots="bots"
      :orders="goalOrderSnapshots[autopilot.selectedBot.value?.id ?? bots[0]?.id ?? '']"
      :wallet-connected="walletConnected"
      :wallet-address="soraAddress"
      :external-wallet="externalWallet"
      :stage="autopilot.stage.value"
      :watch-next-check-at="autopilot.watchNextCheckAt.value"
      :can-resume-watch="autopilot.canResumeWatch.value"
      :recovery-input="autopilot.recoverableWatchInput.value"
      :watch-recovery="autopilot.watchRecovery.value"
      :can-refresh-desktop-request="autopilot.canRefreshDesktopRequest.value"
      :busy="autopilot.busy.value || busy"
      :error="autopilot.error.value ? message(autopilot.error.value) : ''"
      :diagnostics="autopilot.diagnostics.value"
      :diagnostics-completed-through="autopilot.diagnosticsCompletedThrough.value"
      :ai-label="autopilot.aiLabel.value"
      :desktop-supported="autopilot.desktopSupported.value"
      :desktop-connecting="autopilot.desktopConnecting.value"
      :desktop-connected="autopilot.desktopConnected.value"
      :desktop-connection-id="autopilot.desktopConnectionId.value"
      :desktop-context="autopilot.desktopContext.value"
      :desktop-pending="autopilot.desktopPending.value"
      :desktop-mode="autopilot.desktopMode.value"
      :companion-connected="autopilot.companionConnected.value"
      :companion-pairing="autopilot.companionPairing.value"
      :companion-error="autopilot.companionError.value"
      :awaiting-wallet="autopilot.awaitingWallet.value"
      :desktop-link="autopilot.desktopLink.value"
      :desktop-prompt="autopilot.desktopPrompt.value"
      :progress="autopilot.progress.value ? t(autopilot.progress.value) : ''"
      :review-bot="autopilot.reviewBot.value"
      :funding="autopilot.funding.value"
      :setup-funding="setupFunding"
      :setup-funding-state="setupFundingState"
      :funding-identity="connectionIdentity"
      :active-ids="sessionActiveIds"
      :selected-bot="autopilot.selectedBot.value"
      @begin="autopilot.begin"
      @go="autopilot.go"
      @connect="autopilot.connect"
      @connect-desktop="autopilot.connectDesktop"
      @disconnect-desktop="autopilot.disconnectDesktop"
      @desktop-acknowledge="autopilot.acknowledgeDesktop"
      @desktop-draft="autopilot.submitDesktopDraft"
      @companion-pair="autopilot.pairCompanion"
      @companion-retry="autopilot.retryCompanionDraft"
      @refresh-desktop-request="autopilot.refreshDesktopRequest"
      @resume-watch="autopilot.resumeWatch"
      @wallet="connectSoraWallet"
      @research="autopilot.research"
      @refresh-funding="autopilot.refreshFunding"
      @read-setup-funding="readSetupFunding"
      @start="autopilot.start"
      @cancel="autopilot.cancel"
      @pause="(id) => run(() => pauseBot(id))"
      @stop="(id) => run(() => stopBot(id))"
      @resume="autopilot.resume"
    />
    <div
      v-show="workspaceView === 'lab'"
      :id="marketControlsId"
      class="bots-market-entry"
      data-testid="bots-market-entry"
    />
    <p v-if="error || localError" class="bots-error" role="alert">{{ message(localError || error) }}</p>

    <nav v-if="workspaceView !== 'simple'" class="bots-view-tabs" :aria-label="t('bots.workspace')">
      <RouterLink
        data-testid="discovery-tab"
        :aria-current="workspaceView === 'discover' ? 'page' : undefined"
        :to="botWorkspaceLocation('discover')"
      >
        {{ t('bots.discovery.title') }}
      </RouterLink>
      <RouterLink
        data-testid="strategy-lab-tab"
        :aria-current="workspaceView === 'lab' ? 'page' : undefined"
        :to="botWorkspaceLocation('lab')"
      >
        {{ t('bots.startFlow.tryStrategy') }}
      </RouterLink>
      <RouterLink
        data-testid="your-bots-tab"
        :aria-current="workspaceView === 'bots' ? 'page' : undefined"
        :to="botWorkspaceLocation('bots')"
      >
        {{ t('bots.yourBots') }} <span>{{ bots.length }}</span>
      </RouterLink>
      <RouterLink
        data-testid="backtesting-tab"
        :aria-current="workspaceView === 'playground' ? 'page' : undefined"
        :to="botWorkspaceLocation('playground')"
      >
        {{ t('bots.uxWorkspace.inspectStrategy') }}
      </RouterLink>
    </nav>
    <p
      v-if="workspaceView !== 'simple' && (workspaceView === 'bots' || activeBots.length)"
      class="browser-notice"
      data-testid="browser-runtime-notice"
    >
      {{ t('bots.runs.keepOpen') }}
    </p>
    <div v-if="workspaceView !== 'simple' && workspaceView !== 'bots' && activeBots.length" class="playground-sessions">
      <div v-for="bot in activeBots" :key="bot.id">
        <strong>{{ bot.name }}</strong
        ><span>{{ t(`bots.status.${runtimePresentation(bot).state}`) }} · {{ runtimePresentation(bot).detail }}</span>
        <button v-if="bot.status === 'running'" @click="run(() => pauseBot(bot.id))">{{ t('bots.pause') }}</button>
        <button @click="run(() => stopBot(bot.id))">{{ t('bots.stop') }}</button>
      </div>
    </div>
    <BotDiscovery
      v-if="workspaceView === 'discover'"
      :assets="assets"
      :load-history="playgroundHistory.load"
      :load-fees="researchFees.load"
      :wallet-connected="walletConnected"
      :external-wallet="externalWallet"
      :wallet-identity="connectionIdentity"
      :campaigns="discoveryCampaigns"
      :campaign-bots="bots"
      :prepare="trading.prepareDiscoveryCampaign"
      :authorize="trading.startDiscoveryCampaign"
      :prepare-resume="trading.prepareDiscoveryCampaignResume"
      :pause-campaign="trading.pauseDiscoveryCampaign"
      :close-campaign="trading.closeDiscoveryCampaign"
      :read-campaign-orders="trading.readDiscoveryCampaignOrders"
      :saving="busy || !!startIntent"
      @wallet="connectSoraWallet"
      @paper="paperQuant"
    />
    <StrategyLab
      v-if="workspaceView !== 'simple'"
      v-show="workspaceView === 'lab'"
      :active="workspaceView === 'lab'"
      :market-controls-target="`#${marketControlsId}`"
      :assets="assets"
      :load-history="playgroundHistory.load"
      :load-fees="researchFees.load"
      :saving="busy || !!startIntent"
      :strategy-preset="navigation.strategy"
      :composer-open="navigation.composer"
      :shared-rules="typeof route.query.rules === 'string' ? route.query.rules : undefined"
      @navigate="navigateLab"
      @save="savePlayground"
      @start="startFromResearch"
    />
    <BotPlayground
      v-if="legacyOpened"
      v-show="workspaceView === 'playground'"
      :active="workspaceView === 'playground'"
      :assets="assets"
      :load-history="playgroundHistory.load"
      :load-fees="researchFees.load"
      :saving="busy"
      :strategy-preset="navigation.strategy"
      @navigate="navigatePlayground"
      @save="savePlayground"
    />
    <div v-if="startIntent && !reviewBot" class="start-progress" role="status" data-testid="start-progress">
      <span>{{ t(startPreparing ? 'bots.startFlow.preparing' : 'bots.startFlow.connecting') }}</span>
      <button type="button" data-testid="cancel-start-intent" @click="cancelStartIntent()">
        {{ t('bots.startFlow.cancel') }}
      </button>
    </div>
    <div v-show="workspaceView === 'bots'" class="bots-workspace">
      <aside class="bot-navigation" :aria-label="t('bots.yourBots')">
        <div class="section-heading">
          <h2>{{ t('bots.yourBots') }}</h2>
          <span>{{ bots.length }}</span>
        </div>
        <p v-if="loading" class="muted nav-empty">{{ t('bots.loading') }}</p>
        <p v-else-if="!bots.length" class="muted nav-empty">{{ t('bots.noBots') }}</p>
        <button
          v-for="bot in bots"
          :key="bot.id"
          class="bot-row"
          :class="{ selected: selectedId === bot.id }"
          :aria-pressed="selectedId === bot.id"
          @click="navigateBot(bot.id)"
        >
          <span class="bot-row-top"
            ><strong>{{ bot.name }}</strong
            ><i class="status-dot" :class="bot.status"
          /></span>
          <span>{{ bot.assetIn.symbol }} / {{ bot.assetOut.symbol }}</span>
          <span class="bot-row-bottom"
            ><small>{{
              t(bot.strategy.kind === 'rules' ? 'bots.rules.title' : `bots.strategies.${bot.strategy.kind}`)
            }}</small
            ><small>{{ t(`bots.modes.${bot.mode}`) }}</small></span
          >
        </button>
      </aside>
      <template v-if="selectedBot && editor">
        <section class="bot-main" :aria-label="selectedBot.name">
          <div class="bot-toolbar">
            <div>
              <h2 ref="activeBotHeading" tabindex="-1">{{ selectedBot.name }}</h2>
              <p>
                {{ selectedBot.assetIn.symbol }} / {{ selectedBot.assetOut.symbol
                }}<span class="mode-tag">{{ t(`bots.modes.${selectedBot.mode}`) }}</span>
              </p>
            </div>
            <div class="toolbar-actions">
              <button
                v-if="
                  (selectedBot.status === 'running' && sessionActiveIds.includes(selectedBot.id)) ||
                  selectedRun === 'elsewhere'
                "
                data-testid="pause"
                @click="run(() => pauseBot(selectedBot.id))"
              >
                {{ t('bots.pause') }}</button
              ><button
                v-else-if="canContinueSelected"
                class="primary"
                data-testid="start"
                :disabled="busy"
                @click="requestResume"
              >
                {{ t('bots.resume') }}</button
              ><button
                v-else
                class="primary"
                data-testid="start"
                :disabled="busy || (!!selectedBot.goalState && selectedBot.goalState.outcome !== 'active')"
                @click="requestStart"
              >
                {{ t(selectedRun === 'open' ? 'bots.resume' : 'bots.start') }}</button
              ><button
                data-testid="stop"
                :disabled="selectedBot.status === 'stopped'"
                @click="run(() => stopBot(selectedBot.id))"
              >
                {{ t('bots.stop') }}
              </button>
            </div>
          </div>
          <div
            class="runtime-strip"
            :class="runtimePresentation(selectedBot).state"
            data-testid="bot-runtime-status"
            role="status"
          >
            <i aria-hidden="true" />
            <details :open="['paused', 'attention'].includes(runtimePresentation(selectedBot).state)">
              <summary>{{ t(`bots.status.${runtimePresentation(selectedBot).state}`) }}</summary>
              <p>{{ runtimePresentation(selectedBot).detail }}</p>
            </details>
          </div>
          <div v-if="selectedBot.mode === 'live' || selectedBot.sessionExpiresAt" class="session-strip">
            <span v-if="selectedBot.goal"
              >{{ t('bots.durationMinutes') }}: {{ selectedBot.policy.sessionDurationMs / 60000 }}</span
            >
            <span>{{ t('bots.sessionExpiry') }}</span
            ><strong>{{
              selectedBot.sessionExpiresAt ? time(selectedBot.sessionExpiresAt) : t('bots.noSession')
            }}</strong
            ><span v-if="selectedBot.mode === 'live' && externalWallet">{{ t('bots.externalSigning') }}</span>
          </div>
          <BotGoalProgress
            v-if="selectedBot.goal"
            :bot="selectedBot"
            :runtime-status="runtimePresentation(selectedBot).state"
            :orders="goalOrderSnapshots[selectedBot.id]"
          />
          <div
            v-if="
              selectedBot.goal &&
              ((selectedBot.goalState && selectedBot.goalState.outcome !== 'active') ||
                (!providerConnectedIds.includes(selectedBot.id) && selectedBot.strategy.kind === 'ai'))
            "
            class="goal-next-action"
            data-testid="goal-next-action"
          >
            <template v-if="selectedBot.goalState && selectedBot.goalState.outcome !== 'active'">
              <p v-if="settingsLocked">{{ t('bots.stopToEdit') }}</p>
              <button v-if="settingsLocked" :disabled="busy" @click="run(() => stopBot(selectedBot.id))">
                {{ t('bots.stop') }}
              </button>
              <button v-else :disabled="busy" data-testid="goal-reset" @click="run(() => resetGoal(selectedBot.id))">
                {{ t('bots.goals.newRun') }}
              </button>
            </template>
            <template v-else-if="!providerConnectedIds.includes(selectedBot.id) && selectedBot.strategy.kind === 'ai'">
              <button class="primary" data-testid="goal-connect" @click="openModal('provider')">
                {{ t(selectedBot.provider === 'jev' ? 'bots.goals.connectJev' : 'bots.connect') }}
              </button>
            </template>
          </div>
          <section v-if="selectedBot.research" class="saved-research" data-testid="saved-research">
            <h3>
              {{ t('bots.research.createdFrom') }} ·
              {{
                t(
                  selectedBot.research.source === 'demo'
                    ? 'bots.playground.demoData'
                    : selectedBot.research.source === 'imported'
                      ? 'bots.research.importedData'
                      : 'bots.playground.historicalData'
                )
              }}
            </h3>
            <p>
              {{ t(selectedGoalResearch ? 'bots.research.meanGoalReturn' : 'bots.research.studyReturn') }}:
              {{ selectedBot.research.returnPercent }}% · {{ t('bots.research.studyValidation') }}:
              {{
                t(
                  selectedBot.research.validation === 'holdout'
                    ? 'bots.research.validationHoldout'
                    : selectedBot.research.validation === 'walk-forward'
                      ? 'bots.research.validationWalkForward'
                      : 'bots.research.validationNone'
                )
              }}
            </p>
          </section>
          <div class="metrics-strip">
            <div>
              <span>{{ t('bots.netPnl') }}</span
              ><strong
                >{{ netPnl }}<small>{{ selectedBot.assetIn.symbol }}</small></strong
              >
            </div>
            <div>
              <span>{{ t('bots.netReturn') }}</span
              ><strong>{{ returnPercent }}<small>%</small></strong>
            </div>
            <div>
              <span>{{ t('bots.drawdown') }}</span
              ><strong>{{ drawdownPercent }}<small>%</small></strong>
            </div>
            <div>
              <span>{{ t('bots.swaps') }}</span
              ><strong>{{ selectedBot.portfolio.trades }}</strong>
            </div>
            <div>
              <span>{{ t('bots.networkFees') }}</span
              ><strong
                >{{ natural(selectedBot.portfolio.feesPaidCodec, selectedBot.policy.feeAsset.decimals)
                }}<small>{{ selectedBot.policy.feeAsset.symbol }}</small></strong
              >
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-heading">
              <div class="chart-tabs" role="tablist" :aria-label="t('bots.chart')">
                <button
                  v-for="tab in chartTabs"
                  :key="tab"
                  role="tab"
                  :aria-selected="chartTab === tab"
                  :class="{ active: chartTab === tab }"
                  @click="chartTab = tab"
                >
                  {{ t(`bots.chartTabs.${tab}`) }}
                </button>
              </div>
              <span class="muted chart-unit">{{
                chartTab === 'price'
                  ? `${selectedBot.assetIn.symbol} / ${selectedBot.assetOut.symbol}`
                  : selectedBot.assetIn.symbol
              }}</span>
            </div>
            <div class="chart-canvas">
              <svg
                v-if="chartValues.length > 1"
                viewBox="0 0 800 280"
                role="img"
                :aria-label="t(`bots.chartTabs.${chartTab}`)"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="bot-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.16" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path class="chart-grid" d="M0 25H800 M0 90H800 M0 155H800 M0 220H800" />
                <path :d="`${chartPath} L 790 260 L 10 260 Z`" fill="url(#bot-chart-fill)" />
                <path :d="chartPath" class="chart-line" />
              </svg>
              <div v-else class="chart-empty">
                <span class="empty-chart-mark" aria-hidden="true">⌁</span><strong>{{ t('bots.noChart') }}</strong>
                <p>{{ t(chartTab === 'price' ? 'bots.priceChartNote' : 'bots.equityChartNote') }}</p>
              </div>
            </div>
            <div class="chart-footer">
              <span>{{ chartValues.length ? time(chartValues[0].timestamp) : '—' }}</span
              ><span>{{ chartValues.length ? time(chartValues[chartValues.length - 1].timestamp) : '—' }}</span>
            </div>
          </div>
          <section class="holdings-section">
            <div class="section-heading">
              <h3>{{ t('bots.holdings') }}</h3>
              <span>{{ t('bots.reusableCapital') }}</span>
            </div>
            <div class="holdings-list">
              <div v-for="asset in portfolioAssets" :key="asset.address">
                <span class="asset-letter">{{ asset.symbol.slice(0, 1) }}</span
                ><strong>{{ asset.symbol }}</strong
                ><span>{{ natural(selectedBot.portfolio.holdings[asset.address] || '0', asset.decimals) }}</span>
              </div>
            </div>
          </section>
          <section v-if="selectedBot.provider !== 'jev'" class="backtest-section">
            <div class="section-heading">
              <h3>{{ t('bots.backtest') }}</h3>
              <button data-testid="backtest" :disabled="busy" @click="openModal('backtest')">
                {{ t('bots.runBacktest') }} ↗
              </button>
            </div>
            <template v-if="backtestResult"
              ><div class="backtest-result">
                <span
                  >{{ t('bots.netReturn') }} <strong>{{ backtestResult.returnPercent }}%</strong></span
                ><span
                  >{{ t('bots.drawdown') }} <strong>{{ backtestResult.drawdownPercent }}%</strong></span
                ><span
                  >{{ t('bots.swaps') }} <strong>{{ backtestResult.trades }}</strong></span
                ><span
                  >{{ t('bots.coverage') }} <strong>{{ (backtestResult.coverage * 100).toFixed(1) }}%</strong></span
                >
              </div>
              <p class="muted">{{ t('bots.backtestNote') }}</p></template
            >
            <p v-else class="muted">{{ t('bots.backtestIntro') }}</p>
          </section>
          <section class="activity-section">
            <div class="section-heading">
              <h3>{{ t('bots.activity') }}</h3>
              <button :disabled="busy" @click="run(() => exportBot(selectedBot.id))">{{ t('bots.export') }} ↗</button>
            </div>
            <div v-if="!selectedBot.activity.length" class="activity-empty muted">{{ t('bots.noActivity') }}</div>
            <ol v-else class="activity-list">
              <li
                v-for="event in selectedBot.activity
                  .slice()
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 50)"
                :key="event.id"
              >
                <time>{{ time(event.timestamp) }}</time
                ><span class="event-kind" :class="event.kind">{{ t(`bots.events.${event.kind}`) }}</span>
                <div>
                  <p>{{ message(event.message) }}</p>
                  <code v-if="event.txHash" :title="event.txHash">{{ event.txHash }}</code>
                </div>
              </li>
            </ol>
          </section>
        </section>
        <aside class="bot-inspector" :aria-label="t('bots.settings')">
          <form @submit.prevent="saveSettings">
            <div class="section-heading">
              <h3>{{ t('bots.settings') }}</h3>
            </div>
            <p v-if="settingsLocked && !busy" class="field-note">{{ t('bots.stopToEdit') }}</p>
            <fieldset :disabled="settingsLocked">
              <label>{{ t('bots.name') }}<input v-model="editor.name" maxlength="64" required /></label
              ><label
                >{{ t('bots.mode')
                }}<select v-model="editor.mode" data-testid="mode">
                  <option value="paper">{{ t('bots.modes.paper') }}</option>
                  <option value="live">{{ t('bots.modes.live') }}</option>
                </select></label
              >
              <p v-if="editor.mode === 'live'" class="field-note">{{ t('bots.liveNote') }}</p>
              <label
                >{{ t('bots.strategy')
                }}<select
                  :value="editor.strategy.kind"
                  :disabled="editor.strategy.kind === 'rules'"
                  data-testid="editor-strategy"
                  @change="changeEditorStrategy"
                >
                  <option v-if="editor.strategy.kind === 'rules'" value="rules">{{ t('bots.rules.title') }}</option>
                  <option v-for="kind in strategyKinds" :key="kind" :value="kind">
                    {{ t(`bots.strategies.${kind}`) }}
                  </option>
                </select></label
              >
              <details class="field-note strategy-explanation" data-testid="editor-strategy-explanation">
                <summary>{{ t('assets.details') }}</summary>
                <p>
                  {{
                    t(
                      editor.strategy.kind === 'rules'
                        ? 'bots.rules.execution'
                        : `bots.uxWorkspace.strategyDescriptions.${editor.strategy.kind}`,
                      {
                        capital: selectedBot.assetIn.symbol,
                        traded: selectedBot.assetOut.symbol,
                      }
                    )
                  }}
                </p>
              </details>
              <router-link
                v-if="editor.strategy.kind === 'rules' && editor.strategy.rules"
                :to="{
                  name: PageNames.Bots,
                  params: { section: 'lab' },
                  query: { rules: encodeRuleShare(editor.strategy.rules) },
                }"
                data-testid="bot-edit-rules"
                >{{ t('bots.rules.title') }} ↗</router-link
              >
              <label
                >{{ t('bots.tradeAmount') }} · {{ selectedBot.assetIn.symbol
                }}<input v-model="editor.strategy.amount" inputmode="decimal" required
              /></label>
              <label
                >{{ t('bots.lab.intervalBlocks')
                }}<input
                  v-model.number="intervalBlocks"
                  data-testid="bot-interval-blocks"
                  type="number"
                  min="1"
                  max="432000"
                  step="any"
                  required
                  @input="cadenceEdited = true"
              /></label>
              <p class="field-note">{{ t('bots.lab.blockCadenceHint') }}</p>
              <template v-if="editor.strategy.kind === 'threshold'"
                ><label
                  >{{ t('bots.threshold') }} · {{ selectedBot.assetIn.symbol }} / {{ selectedBot.assetOut.symbol
                  }}<input v-model="editor.strategy.threshold" inputmode="decimal" required /></label
                ><label
                  >{{ t('bots.direction')
                  }}<select v-model="editor.strategy.direction">
                    <option value="below">{{ t('bots.below') }}</option>
                    <option value="above">{{ t('bots.above') }}</option>
                  </select></label
                ></template
              >
              <div v-if="editor.strategy.kind === 'sma'" class="form-pair">
                <label
                  >{{ t('bots.fastWindow')
                  }}<input v-model.number="editor.strategy.fastWindow" type="number" min="2" max="199" /></label
                ><label
                  >{{ t('bots.slowWindow')
                  }}<input v-model.number="editor.strategy.slowWindow" type="number" min="3" max="200"
                /></label>
              </div>
              <template v-if="editor.strategy.kind === 'ai'"
                ><label
                  >{{ t('bots.provider')
                  }}<select v-model="editor.provider" data-testid="editor-provider" @change="changeEditorProvider">
                    <option value="openai">{{ t('bots.providers.openai') }}</option>
                    <option value="claude">{{ t('bots.providers.claude') }}</option>
                    <option value="jev">{{ t('bots.providers.jev') }}</option>
                    <option value="custom">{{ t('bots.providers.custom') }}</option>
                  </select></label
                ><label v-if="editor.provider === 'openai' || editor.provider === 'claude'"
                  >{{ t('bots.model')
                  }}<select
                    v-model="editor.model"
                    data-testid="editor-model"
                    required
                    :disabled="!providerModels.length"
                  >
                    <option value="" disabled>{{ t('bots.labAi.selectModel') }}</option>
                    <option
                      v-if="editor.model && !providerModels.some((item) => item.id === editor.model)"
                      :value="editor.model"
                      disabled
                    >
                      {{ editor.model }}
                    </option>
                    <option v-for="model in providerModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                  </select> </label
                ><label v-else
                  >{{ t('bots.endpoint')
                  }}<input
                    v-model="editor.endpoint"
                    @input="resetProviderDiscovery(true)"
                    type="url"
                    pattern="https://.*"
                    placeholder="https://"
                    :required="editor.provider === 'custom'"
                /></label>
                <button
                  v-if="editor.provider === 'openai' || editor.provider === 'claude'"
                  type="button"
                  data-testid="editor-load-models"
                  @click="openModal('provider')"
                >
                  {{ t('bots.labAi.refreshModels') }}
                </button>
                <label
                  >{{ t('bots.prompt') }}<textarea v-model="editor.strategy.prompt" rows="4" maxlength="2000" /></label
              ></template>
              <template v-if="editor.goal">
                <h4>{{ t('bots.goals.settings') }}</h4>
                <label
                  >{{ t('bots.goals.titleLabel') }}<input v-model="editor.goal.title" maxlength="80" required
                /></label>
                <div class="form-pair">
                  <label
                    >{{ t('bots.goals.targetLabel')
                    }}<input v-model="editor.goal.targetReturnPercent" inputmode="decimal" required
                  /></label>
                  <label
                    >{{ t('bots.goals.lossLabel')
                    }}<input v-model="editor.goal.maxLossPercent" inputmode="decimal" required
                  /></label>
                </div>
                <label
                  >{{ t('bots.goals.durationLabel') }}
                  <select v-model.number="editor.goal.durationMs" data-testid="goal-edit-duration">
                    <option :value="3600000">{{ t('bots.goals.durations.hour') }}</option>
                    <option :value="86400000">{{ t('bots.goals.durations.day') }}</option>
                    <option :value="604800000">{{ t('bots.goals.durations.week') }}</option>
                    <option :value="2592000000">{{ t('bots.goals.durations.month') }}</option>
                  </select>
                </label>
                <p class="field-note">{{ t('bots.goals.editNote') }}</p>
              </template>
              <h4>{{ t('bots.tradingLimits') }}</h4>
              <label
                >{{ t('bots.maxTrade') }} · {{ selectedBot.assetIn.symbol
                }}<input v-model="maxInput" inputmode="decimal" required /></label
              ><label
                >{{ t('bots.maxTrade') }} · {{ selectedBot.assetOut.symbol
                }}<input v-model="maxOutput" inputmode="decimal" required
              /></label>
              <div class="form-pair">
                <label
                  >{{ t('bots.slippage') }} %<input
                    v-model="editor.policy.slippagePercent"
                    inputmode="decimal"
                    required /></label
                ><label
                  >{{ t('bots.priceImpact') }} %<input
                    v-model="editor.policy.maxPriceImpactPercent"
                    inputmode="decimal"
                    required
                /></label>
              </div>
              <label
                >{{ t('bots.durationMinutes')
                }}<input
                  v-model.number="sessionMinutes"
                  type="number"
                  min="1"
                  :max="selectedBot.extendedSession ? 20160 : 1440"
                  required
              /></label>
              <button class="save-button" data-testid="save-settings" type="submit">
                {{ t('bots.saveSettings') }}
              </button>
            </fieldset>
          </form>
          <section v-if="selectedBot.strategy.kind === 'ai'" class="provider-section">
            <div class="section-heading">
              <h3>{{ t('bots.aiConnection') }}</h3>
              <button @click="openModal('provider')">{{ t('bots.connect') }}</button>
            </div>
            <p class="connection-status">
              {{ t(providerConnectedIds.includes(selectedBot.id) ? 'bots.connected' : 'bots.disconnected') }}
            </p>
            <button
              v-if="selectedBot.provider !== 'jev'"
              class="full-width"
              data-testid="suggest-strategy"
              :disabled="busy || !providerConnectedIds.includes(selectedBot.id)"
              @click="generateStrategy"
            >
              {{ t('bots.suggestStrategy') }}
            </button>
            <dl class="usage-list">
              <div>
                <dt>{{ t('bots.apiRequests') }}</dt>
                <dd>{{ selectedBot.apiUsage.requests }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.inputTokens') }}</dt>
                <dd>{{ selectedBot.apiUsage.inputTokens }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.outputTokens') }}</dt>
                <dd>{{ selectedBot.apiUsage.outputTokens }}</dd>
              </div>
            </dl>
          </section>
          <div class="inspector-footer">
            <p>{{ t('bots.appLimitsNotice') }}</p>
            <button
              class="delete-button"
              :disabled="busy || selectedBot.status === 'running'"
              @click="openModal('delete')"
            >
              {{ t('bots.delete') }}
            </button>
          </div>
        </aside>
      </template>
      <section v-else class="workspace-empty">
        <div class="empty-orbit" aria-hidden="true"><span>⌁</span></div>
        <span class="bots-eyebrow">{{ t('bots.startInPaper') }}</span>
        <h2>{{ t('bots.emptyTitle') }}</h2>
        <p>{{ t('bots.emptyDescription') }}</p>
        <button class="primary" data-testid="empty-try-strategy" @click="workspaceView = 'lab'">
          {{ t('bots.startFlow.tryStrategy') }} →
        </button>
        <button class="research-return" data-testid="new-bot" @click="openCreate">
          {{ t('bots.uxWorkspace.newPaperBot') }} ↗
        </button>
      </section>
    </div>
    <Teleport to="body"
      ><div v-if="modal" class="bot-modal-backdrop" @click.self="closeModal">
        <section
          ref="dialog"
          class="bot-modal"
          :class="{ 'goal-dialog': modal === 'goal' }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`bot-${modal}-title`"
          tabindex="-1"
          @keydown="dialogKeydown"
        >
          <div v-if="modal !== 'goal'" class="modal-heading">
            <h2 :id="`bot-${modal}-title`">
              {{ t(modal === 'consent' && startIntent ? 'bots.startFlow.reviewTitle' : `bots.dialogs.${modal}`) }}
            </h2>
            <button :aria-label="t('bots.close')" @click="closeModal">×</button>
          </div>
          <p v-if="localError" role="alert" class="bots-error">{{ message(localError) }}</p>
          <BotGoalSetup
            v-if="modal === 'goal'"
            :assets="assets"
            :busy="busy"
            @create="submitGoal"
            @cancel="closeModal"
          />
          <form v-else-if="modal === 'create'" data-testid="create-form" @submit.prevent="submitCreate">
            <p class="paper-setup-note">
              <strong>{{ t('bots.uxWorkspace.paperSimulation') }}</strong
              >{{ t('bots.uxWorkspace.paperSetupNote') }}
            </p>
            <label
              >{{ t('bots.name') }}<input v-model="draft.name" data-testid="bot-name" maxlength="64" required
            /></label>
            <div class="form-pair">
              <label
                >{{ t('bots.uxWorkspace.capitalToken')
                }}<select v-model="draft.assetInAddress" data-testid="asset-in" required>
                  <option disabled value="">{{ t('bots.selectToken') }}</option>
                  <option v-for="asset in assets" :key="asset.address" :value="asset.address">
                    {{ asset.symbol }}
                  </option>
                </select></label
              ><label
                >{{ t('bots.uxWorkspace.tradedToken')
                }}<select v-model="draft.assetOutAddress" data-testid="asset-out" required>
                  <option disabled value="">{{ t('bots.selectToken') }}</option>
                  <option
                    v-for="asset in assets.filter((item) => item.address !== draft.assetInAddress)"
                    :key="asset.address"
                    :value="asset.address"
                  >
                    {{ asset.symbol }}
                  </option>
                </select></label
              >
            </div>
            <label
              >{{ t('bots.uxWorkspace.virtualCapital') }} · {{ draftCapitalSymbol
              }}<input v-model="draft.allocation" data-testid="allocation" inputmode="decimal" required
            /></label>
            <p class="field-note">
              {{
                t('bots.uxWorkspace.paperAllocationNote', { capital: draftCapitalSymbol, traded: draftTradedSymbol })
              }}
            </p>
            <label
              >{{ t('bots.feeBudget') }} · XOR<input v-model="draft.feeBudget" inputmode="decimal" required /></label
            ><label
              >{{ t('bots.strategy')
              }}<select v-model="draft.strategyKind" data-testid="draft-strategy">
                <option v-for="kind in strategyKinds" :key="kind" :value="kind">
                  {{ t(`bots.strategies.${kind}`) }}
                </option>
              </select></label
            >
            <Transition name="strategy-rule" mode="out-in">
              <p :key="draft.strategyKind" class="strategy-explanation" data-testid="draft-strategy-explanation">
                {{
                  t(`bots.uxWorkspace.strategyDescriptions.${draft.strategyKind}`, {
                    capital: draftCapitalSymbol,
                    traded: draftTradedSymbol,
                  })
                }}
              </p>
            </Transition>
            <p class="modal-note">{{ t('bots.createdInPaper') }}</p>
            <button class="primary full-width" :disabled="busy || !assets.length" type="submit">
              {{ t('bots.uxWorkspace.newPaperBot') }}
            </button>
          </form>
          <form v-else-if="modal === 'consent' && reviewBot" data-testid="consent-form" @submit.prevent="submitConsent">
            <section v-if="startIntent?.quant && reviewBot" class="quant-consent" data-testid="quant-consent">
              <strong class="quant-consent-title">{{
                t('bots.quant.consent.title', { symbol: startIntent.quant.symbol })
              }}</strong>
              <ul class="quant-consent-chips">
                <li>
                  {{
                    t('bots.quant.consent.budget', {
                      amount: natural(
                        reviewBot.portfolio.initial[reviewBot.assetIn.address] || '0',
                        reviewBot.assetIn.decimals
                      ),
                    })
                  }}
                </li>
                <li>{{ t('bots.quant.consent.order', { amount: reviewBot.strategy.amount }) }}</li>
                <li>
                  {{
                    t('bots.quant.consent.reserve', {
                      amount: natural(reviewBot.policy.feeBudgetCodec, reviewBot.policy.feeAsset.decimals),
                    })
                  }}
                </li>
                <li>{{ t('bots.quant.consent.impact', { value: reviewBot.policy.maxPriceImpactPercent }) }}</li>
                <li data-testid="quant-consent-session">
                  {{
                    reviewBot.policy.sessionDurationMs >= 86400000
                      ? t('bots.quant.consent.sessionDays', {
                          count: Math.round(reviewBot.policy.sessionDurationMs / 86400000),
                        })
                      : t('bots.quant.consent.session', {
                          hours: Math.round(reviewBot.policy.sessionDurationMs / 3600000),
                        })
                  }}
                </li>
              </ul>
              <p class="quant-consent-evidence">
                {{
                  t('bots.quant.consent.evidence', {
                    return: startIntent.research.returnPercent,
                    drawdown: startIntent.research.drawdownPercent,
                    trades: startIntent.research.trades,
                  })
                }}
              </p>
              <p
                v-if="startIntent.quant.cadence?.daysPerEpisode && startIntent.quant.cadence.holdHours"
                class="quant-consent-evidence"
                data-testid="quant-consent-cadence"
              >
                {{
                  startIntent.quant.cadence.holdHours.max >= 48
                    ? t('bots.quant.consent.cadenceDays', {
                        days: startIntent.quant.cadence.daysPerEpisode,
                        hold: Math.ceil(startIntent.quant.cadence.holdHours.max / 24),
                      })
                    : t('bots.quant.consent.cadenceHours', {
                        days: startIntent.quant.cadence.daysPerEpisode,
                        hold: startIntent.quant.cadence.holdHours.max,
                      })
                }}
              </p>
              <ol class="quant-consent-steps">
                <li>{{ t(externalWallet ? 'bots.quant.consent.stepWallet' : 'bots.quant.consent.stepPassword') }}</li>
                <li>{{ t('bots.quant.consent.stepConfirm') }}</li>
              </ol>
            </section>
            <p class="modal-intro">{{ t(startIntent ? 'bots.startFlow.reviewIntro' : 'bots.consentIntro') }}</p>
            <p v-if="startIntent" class="review-strategy" data-testid="review-strategy">
              <strong>{{ reviewBot.name }}</strong>
            </p>
            <dl class="consent-summary">
              <div>
                <dt>{{ t('bots.allowedPair') }}</dt>
                <dd>{{ reviewBot.assetIn.symbol }} ↔ {{ reviewBot.assetOut.symbol }}</dd>
              </div>
              <template v-if="!startIntent"
                ><div v-for="asset in reviewAssets" :key="asset.address">
                  <dt>{{ t('bots.startFlow.capital') }} · {{ asset.symbol }}</dt>
                  <dd>{{ natural(reviewBot.portfolio.holdings[asset.address] || '0', asset.decimals) }}</dd>
                </div></template
              >
              <div>
                <dt>{{ t('bots.tradeAmount') }}</dt>
                <dd>{{ reviewBot.strategy.amount }} {{ reviewBot.assetIn.symbol }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.startFlow.cadence') }}</dt>
                <dd>{{ reviewCadence }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.feeBudget') }}</dt>
                <dd>
                  {{ natural(reviewBot.policy.feeBudgetCodec, reviewBot.policy.feeAsset.decimals) }}
                  {{ reviewBot.policy.feeAsset.symbol }}
                </dd>
              </div>
              <div v-if="continueMode && !startIntent" data-testid="consent-runs-until">
                <dt>{{ t('bots.runs.runsUntil') }}</dt>
                <dd>{{ time(reviewBot.sessionExpiresAt) }}</dd>
              </div>
              <div v-else>
                <dt>{{ t('bots.startFlow.duration') }}</dt>
                <dd>
                  {{
                    reviewBot.policy.sessionDurationMs % 3600000 === 0
                      ? t('bots.startFlow.durationHours', { count: reviewBot.policy.sessionDurationMs / 3600000 })
                      : t('bots.startFlow.durationMinutes', { count: reviewBot.policy.sessionDurationMs / 60000 })
                  }}
                </dd>
              </div>
            </dl>
            <p class="field-note">{{ t('bots.startFlow.feeIncluded') }}</p>
            <section v-if="startIntent" class="review-funding" data-testid="review-funding">
              <table v-if="startFunding">
                <caption>
                  {{
                    t('bots.startFlow.fundingTitle')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('bots.startFlow.capital') }}</th>
                    <th scope="col">{{ t('bots.startFlow.available') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in startFunding.assets" :key="item.asset.address">
                    <td>{{ natural(item.requiredCodec, item.asset.decimals) }} {{ item.asset.symbol }}</td>
                    <td>{{ natural(item.availableCodec, item.asset.decimals) }} {{ item.asset.symbol }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="startFunding" :class="{ 'bots-error': !startFunding.sufficient }" role="status">
                {{ t(startFunding.sufficient ? 'bots.startFlow.fundingReady' : 'bots.startFlow.fundingShort') }}
              </p>
              <button
                type="button"
                data-testid="refresh-start-funding"
                :disabled="busy || startSubmitting"
                @click="refreshStartFunding"
              >
                {{ t('bots.startFlow.refreshBalance') }}
              </button>
              <RouterLink
                v-if="startIntent.quant && startFunding && !startFunding.sufficient"
                class="quant-get-xor"
                data-testid="quant-get-xor"
                :to="{ name: PageNames.BuyXor }"
                @click="closeModal"
              >
                {{ t('bots.quant.consent.getXor') }} ↗
              </RouterLink>
            </section>
            <section class="review-limits" data-testid="review-limits">
              <h3>{{ t('bots.startFlow.limits') }}</h3>
              <dl class="consent-summary">
                <div v-for="asset in [reviewBot.assetIn, reviewBot.assetOut]" :key="`max-${asset.address}`">
                  <dt>{{ t('bots.maxTrade') }} · {{ asset.symbol }}</dt>
                  <dd>{{ natural(reviewBot.policy.maxTradeCodec[asset.address] || '0', asset.decimals) }}</dd>
                </div>
                <div>
                  <dt>{{ t('bots.slippage') }}</dt>
                  <dd>{{ reviewBot.policy.slippagePercent }}%</dd>
                </div>
                <div>
                  <dt>{{ t('bots.priceImpact') }}</dt>
                  <dd>{{ reviewBot.policy.maxPriceImpactPercent }}%</dd>
                </div>
              </dl>
              <p class="modal-note">{{ t('bots.appLimitsNotice') }}</p>
            </section>
            <p class="consent-browser-note" data-testid="consent-browser-notice">
              {{ t(externalWallet ? 'bots.runs.consentExternal' : 'bots.runs.consentInternal') }}
            </p>
            <p class="modal-note" data-testid="signing-behavior">
              {{ t(externalWallet ? 'bots.externalSigning' : 'bots.startFlow.internalSigning') }}
            </p>
            <p v-if="startIntent" class="modal-note">{{ t('bots.startFlow.pauseHint') }}</p>
            <template v-if="!startIntent || startFunding?.sufficient">
              <label v-if="!externalWallet"
                >{{ t('bots.walletPassword')
                }}<input
                  v-model="password"
                  data-testid="wallet-password"
                  type="password"
                  autocomplete="off"
                  required /></label
              ><label class="checkbox-label"
                ><input v-model="consented" type="checkbox" data-testid="consent-checkbox" required /><span>{{
                  t('bots.consentAcknowledgment')
                }}</span></label
              >
            </template>
            <p v-if="localError || error" role="alert" class="bots-error">{{ message(localError || error) }}</p>
            <button v-if="!walletConnected" type="button" class="primary full-width" @click="connectSoraWallet">
              {{ t('bots.connectWallet') }}
            </button>
            <button
              class="primary full-width"
              type="submit"
              data-testid="authorize-start"
              :disabled="
                busy ||
                startSubmitting ||
                !walletConnected ||
                !consented ||
                (!!startIntent && !startFunding?.sufficient)
              "
            >
              {{
                t(
                  startIntent
                    ? 'bots.startFlow.confirmStart'
                    : walletConnected
                      ? 'bots.authorizeStart'
                      : 'bots.connectWalletFirst'
                )
              }}
            </button>
          </form>
          <form
            v-else-if="modal === 'provider' && selectedBot"
            data-testid="provider-form"
            @submit.prevent="submitProvider"
          >
            <p class="modal-intro">{{ t('bots.keyMemoryNote') }}</p>
            <template v-if="editor?.provider === 'jev'">
              <p class="field-note">{{ t('bots.goals.endpointNote') }}</p>
              <label
                >{{ t('bots.endpoint')
                }}<input
                  v-model="editor.endpoint"
                  data-testid="jev-endpoint"
                  type="url"
                  pattern="https://.*"
                  placeholder="https://"
                  required
                  @input="resetProviderDiscovery(true)"
              /></label>
            </template>
            <label v-if="!providerDiscovered"
              >{{ t(editor?.provider === 'jev' ? 'bots.goals.connectionKey' : 'bots.apiKey')
              }}<input
                v-model="apiKey"
                data-testid="provider-key"
                type="password"
                autocomplete="off"
                :required="editor?.provider !== 'custom'"
            /></label>
            <label
              v-if="providerDiscovered && editor && (editor.provider === 'openai' || editor.provider === 'claude')"
            >
              {{ t('bots.model') }}
              <select v-model="editor.model" data-testid="provider-model" required>
                <option v-for="model in providerModels" :key="model.id" :value="model.id">{{ model.name }}</option>
              </select>
            </label>
            <p v-if="editor?.provider === 'custom'" class="field-note">{{ t('bots.customEndpointNote') }}</p>
            <p v-if="modelsLoading" role="status">{{ t('bots.labAi.loadingModels') }}</p>
            <button class="primary full-width" :disabled="busy || modelsLoading" type="submit">
              {{
                t(
                  providerDiscovered || editor?.provider === 'custom' || editor?.provider === 'jev'
                    ? 'bots.connect'
                    : 'bots.labAi.refreshModels'
                )
              }}
            </button>
          </form>
          <form
            v-else-if="modal === 'backtest' && selectedBot"
            data-testid="backtest-form"
            @submit.prevent="submitBacktest"
          >
            <p class="modal-intro">{{ t('bots.backtestNote') }}</p>
            <p class="modal-note" data-testid="bot-backtest-range">
              {{ t('bots.research.historyRange', { start: '2026-03-01', end: new Date().toISOString().slice(0, 10) }) }}
              · {{ t('bots.hourly') }}
            </p>
            <label
              >{{ t('bots.assumedSlippage') }} %<input v-model="backtest.slippagePercent" inputmode="decimal" required
            /></label>
            <p class="modal-note">{{ t('bots.research.currentFeesNote') }}</p>
            <p v-if="selectedBot.strategy.kind === 'ai'" class="modal-note">{{ t('bots.aiBacktestNote') }}</p>
            <button class="primary full-width" :disabled="busy || backtestFeeLoading" type="submit">
              {{ t('bots.runBacktest') }}
            </button>
          </form>
          <div v-else-if="modal === 'suggestion' && suggestedStrategy">
            <p class="modal-intro">{{ t('bots.suggestionNote') }}</p>
            <dl class="consent-summary">
              <div>
                <dt>{{ t('bots.strategy') }}</dt>
                <dd>{{ t(`bots.strategies.${suggestedStrategy.kind}`) }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.tradeAmount') }}</dt>
                <dd>{{ suggestedStrategy.amount }}</dd>
              </div>
              <div>
                <dt>{{ t('bots.lab.intervalBlocks') }}</dt>
                <dd>{{ suggestedStrategy.intervalMs / 6000 }}</dd>
              </div>
              <template v-if="suggestedStrategy.kind === 'threshold'"
                ><div>
                  <dt>{{ t('bots.threshold') }}</dt>
                  <dd>{{ suggestedStrategy.threshold }}</dd>
                </div>
                <div>
                  <dt>{{ t('bots.direction') }}</dt>
                  <dd>{{ t(`bots.${suggestedStrategy.direction}`) }}</dd>
                </div></template
              ><template v-if="suggestedStrategy.kind === 'sma'"
                ><div>
                  <dt>{{ t('bots.fastWindow') }}</dt>
                  <dd>{{ suggestedStrategy.fastWindow }}</dd>
                </div>
                <div>
                  <dt>{{ t('bots.slowWindow') }}</dt>
                  <dd>{{ suggestedStrategy.slowWindow }}</dd>
                </div></template
              >
            </dl>
            <button class="primary full-width" :disabled="busy" @click="applySuggestion">
              {{ t('bots.applyStrategy') }}
            </button>
          </div>
          <div v-else-if="modal === 'delete' && selectedBot">
            <p class="modal-intro">{{ t('bots.deleteNote') }}</p>
            <button class="primary full-width" :disabled="busy" @click="submitDelete">{{ t('bots.delete') }}</button>
          </div>
          <button
            v-if="(busy || startSubmitting) && reviewBot"
            class="full-width modal-stop"
            data-testid="stop-pending"
            @click="stopPending"
          >
            {{ t('bots.stop') }}
          </button>
        </section>
      </div></Teleport
    >
  </main>
</template>

<script setup lang="ts">
import { FPNumber } from '@/lib/substrate/math';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, useId, watch } from 'vue';
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { fromCodec, toCodec } from '../amounts';
import { hasGoalExecutionMarker } from '../goal-storage';
import { useBotTrading } from '../controller';
import type { GoalResearchSnapshot } from '../goal-research';
import { createBotAiClient, type BotAiClient } from '../ai';
import type { BotAiModel } from '../ai-models';
import type { BotFundingPreview } from '../live';
import BotPlayground from '../components/BotPlayground.vue';
import StrategyLab from '../components/StrategyLab.vue';
import BotGoalSetup from '../components/BotGoalSetup.vue';
import BotGoalProgress from '../components/BotGoalProgress.vue';
import BotAutopilot from '../components/BotAutopilot.vue';
import BotDiscovery from '../components/BotDiscovery.vue';
import BotRunList from '../components/BotRunList.vue';
import QuantCommandCenter from '../components/quant/QuantCommandCenter.vue';
import { useBotRuns } from '../runs';
import type { QuantDeployPayload } from '../quant-deploy';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import { buildRouteTokens } from '@/shared/navigation/useSelectedTokensRoute';
import { useWalletStore } from '@/stores/wallet';
import { useAutopilot } from '../useAutopilot';
import { AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE } from '../autopilot-diagnostics';
import { createPlaygroundHistoryLoader } from '../playground-history';
import { createAutopilotHistoryLoader, createAutopilotHistoryReadinessReader } from '../autopilot-history';
import { createResearchFeeLoader } from '../research-fees';
import { PLAYGROUND_DEFAULT_SETTINGS } from '../playground';
import type { PlaygroundSettings } from '../playground';
import type { BacktestOptions, BotDraft } from '../controller';
import type { BotDefinition, BotGoal, BotHistory, BotOrder, BotResearchSnapshot, StrategyConfig } from '../types';
import { encodeRuleShare } from '../rule-recipes';
import { PageNames } from '@/consts/navigation';
import {
  botWorkspaceLocation,
  readBotNavigation,
  type BotNavigation,
  type BotWorkspaceView,
  type BotStrategyPreset,
  type BotChartTab,
} from '../navigation';

defineOptions({ name: 'BotsPage' });

const { t } = useTranslation();
const marketControlsId = `bots-market-${useId().replace(/:/g, '')}`;
const { connectSoraWallet, isLoggedIn, soraAddress, isSoraAccountDialogVisible } = useInternalConnect();
const trading = useBotTrading();
const {
  bots,
  selectedId,
  selectedBot,
  assets,
  assetsLoading,
  assetsError,
  assetsLoaded,
  loading,
  busy,
  error,
  chartCandles,
  backtestResult,
  walletConnected,
  externalWallet,
  initialize,
  selectBot,
  createBot,
  createPaperBot,
  prepareLiveBot,
  previewLiveFunding,
  saveLiveBot,
  discardLiveReview,
  connectionIdentity,
  discoveryCampaigns,
  readConnectionIdentity,
  readNetworkIdentity,
  updateBot,
  resetGoal,
  startBot,
  pauseBot,
  stopBot,
  deleteBot,
  backtestBot,
  connectProviderClient,
  exportBot,
  providerConnectedIds,
  suggestStrategy,
  sessionActiveIds,
} = trading;
/** Shared with the top bar: run states, automatic continuation and the leave-page prompt. */
const runs = useBotRuns();
const runsTitleId = `bots-runs-${useId().replace(/:/g, '')}`;
const selectedRun = computed(() => (selectedBot.value ? runs.stateOf(selectedBot.value) : null));
/** Resume continues a paused or interrupted run until its saved end; an ended run starts again. */
const canContinueSelected = computed(() =>
  ['paused', 'continuing', 'password', 'wallet'].includes(selectedRun.value ?? '')
);
/** The consent dialog was opened to continue the selected run, not to start a new one. */
const continueMode = ref(false);
const goalOrderSnapshots = ref<Record<string, BotOrder[] | null | undefined>>({});
let goalOrderRead = 0;
const selectedGoalResearch = computed(
  () => (selectedBot.value?.research as GoalResearchSnapshot | undefined)?.goalEpisodes
);
const route = useRoute();
const router = useRouter();
const navigation = computed(() => readBotNavigation(route.params.section, route.query));
const workspaceView = computed({
  get: () => navigation.value.view,
  set: (view: BotWorkspaceView) => {
    void router.push(botWorkspaceLocation(view));
  },
});
const legacyOpened = ref(workspaceView.value === 'playground');
watch(workspaceView, (view) => {
  if (view === 'playground') legacyOpened.value = true;
});
const playgroundHistory = createPlaygroundHistoryLoader();
const autopilotHistory = createAutopilotHistoryLoader();
const autopilotReadiness = createAutopilotHistoryReadinessReader();
const researchFees = createResearchFeeLoader();
const autopilot = useAutopilot({
  trading,
  loadHistory: autopilotHistory.load,
  readResearchReadiness: (input, signal) => autopilotReadiness({ ...input, assets: assets.value }, signal),
  loadFees: researchFees.load,
  requestWallet: connectSoraWallet,
});
/** Explain initial token discovery until a liquid pair exists; watch, goal and qualification messages retain priority. */
const simpleEligibilityMessage = computed(() => {
  if (
    assets.value.length >= 2 ||
    bots.value.length ||
    error.value ||
    localError.value ||
    autopilot.error.value ||
    autopilot.diagnostics.value ||
    autopilot.watchRecovery.value ||
    autopilot.canResumeWatch.value ||
    autopilot.busy.value ||
    !['welcome', 'connect', 'fund'].includes(autopilot.stage.value)
  )
    return '';
  const failure = assetsError?.value;
  if (failure) return t('bots.autopilot.tokenUnavailable');
  if (loading.value || assetsLoading?.value || !assetsLoaded?.value) return t('bots.autopilot.tokenLoading');
  return t('bots.autopilot.noLiquidPairs');
});

type SetupFunding = Awaited<ReturnType<typeof trading.readWalletFunding>>;
const setupFunding = ref<SetupFunding | null>(null);
const setupFundingState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
let setupFundingRead = 0;
let setupFundingAsset = '';
/** Read only the connected wallet's transferable balances; live approval repeats the check. */
async function readSetupFunding(assetInAddress: string): Promise<void> {
  const generation = ++setupFundingRead;
  const identity = readConnectionIdentity();
  setupFundingAsset = assetInAddress;
  setupFunding.value = null;
  if (!walletConnected.value || !assetInAddress) {
    setupFundingState.value = 'idle';
    return;
  }
  setupFundingState.value = 'loading';
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      trading.readWalletFunding(assetInAddress),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('bots.errors.stale')), 15_000);
      }),
    ]);
    if (generation !== setupFundingRead || identity !== readConnectionIdentity()) return;
    setupFunding.value = result;
    setupFundingState.value = 'ready';
  } catch {
    if (generation !== setupFundingRead || identity !== readConnectionIdentity()) return;
    setupFundingState.value = 'error';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
watch(
  connectionIdentity,
  () => {
    setupFundingRead++;
    setupFunding.value = null;
    setupFundingState.value = 'idle';
  },
  { flush: 'sync' }
);
/** A returning wallet may have received funds while this tab was in the background. */
function refreshSetupFundingOnFocus(): void {
  if (setupFundingAsset && walletConnected.value && setupFundingState.value !== 'loading')
    void readSetupFunding(setupFundingAsset);
}
onMounted(() => window.addEventListener('focus', refreshSetupFundingOnFocus));
onUnmounted(() => {
  setupFundingRead++;
  window.removeEventListener('focus', refreshSetupFundingOnFocus);
});
/** Read only the displayed goal's local receipts; late replies cannot replace a newer snapshot. */
watch(
  () => (workspaceView.value === 'simple' ? (autopilot.selectedBot.value ?? bots.value[0] ?? null) : selectedBot.value),
  async (bot) => {
    const generation = ++goalOrderRead;
    goalOrderSnapshots.value = {};
    if (!bot || !hasGoalExecutionMarker(bot)) return;
    let orders: BotOrder[] | null;
    try {
      orders = await trading.readGoalOrders(bot.id);
    } catch {
      orders = null;
    }
    if (generation === goalOrderRead) goalOrderSnapshots.value = { [bot.id]: orders };
  },
  { immediate: true }
);
onUnmounted(() => {
  goalOrderRead++;
});
watch(workspaceView, (view, previous) => {
  if (previous === 'simple' && view !== 'simple') autopilot.pauseForNavigation();
});
onBeforeRouteLeave(() => {
  // Leaving pauses public watch recovery and revokes pending setup and desktop tools.
  autopilot.pauseForNavigation();
});
const backtestFeeLoading = ref(false);
const activeBots = computed(() => bots.value.filter((bot) => ['running', 'paused', 'attention'].includes(bot.status)));
const browserOnline = ref(navigator.onLine);
const pauseReasons = reactive<Record<string, 'offline'>>({});

/** Explain browser interruptions without inferring that a persisted running record still has session authority. */
function runtimePresentation(bot: BotDefinition): { state: BotDefinition['status']; detail: string } {
  if (bot.status === 'idle' || bot.status === 'stopped') {
    return {
      state: bot.status,
      detail: t(
        `bots.uxWorkspace.${bot.status === 'stopped' ? 'stopped' : bot.mode === 'paper' ? 'paperReady' : 'liveReady'}`
      ),
    };
  }
  if (bot.status === 'attention') return { state: 'attention', detail: t('bots.uxWorkspace.attention') };
  if (!browserOnline.value) return { state: 'paused', detail: t('bots.uxWorkspace.offline') };
  if (bot.status === 'running' && sessionActiveIds.value.includes(bot.id)) {
    return { state: 'running', detail: t(`bots.uxWorkspace.${bot.mode === 'paper' ? 'paperRunning' : 'liveRunning'}`) };
  }
  if (pauseReasons[bot.id]) {
    return { state: 'paused', detail: t(`bots.uxWorkspace.${pauseReasons[bot.id]}Resume`) };
  }
  return runPresentation(bot);
}

/** Paused, interrupted and finished runs, in the same words as the top bar. */
function runPresentation(bot: BotDefinition): { state: BotDefinition['status']; detail: string } {
  const until = bot.sessionExpiresAt ? time(bot.sessionExpiresAt) : '';
  switch (runs.stateOf(bot)) {
    case 'elsewhere':
      return { state: 'running', detail: t('bots.runs.state.elsewhere') };
    case 'continuing':
      return { state: 'paused', detail: t('bots.runs.detail.continuing', { time: until }) };
    case 'password':
      return { state: 'paused', detail: t('bots.runs.detail.password', { time: until }) };
    case 'wallet':
      return {
        state: 'paused',
        detail: t('bots.runs.detail.wallet', {
          account: `${bot.account.slice(0, 6)}…${bot.account.slice(-4)}`,
          time: until,
        }),
      };
    case 'paused':
      return { state: 'paused', detail: t('bots.runs.detail.paused', { time: until }) };
    case 'ended':
      return { state: 'paused', detail: t('bots.runs.detail.ended') };
    default:
      return { state: 'paused', detail: t('bots.runs.detail.open') };
  }
}

/** Remember the observed cause for currently running bots; execution and revocation remain controller-owned. */
function observeBrowserRuntime(): void {
  browserOnline.value = navigator.onLine;
  const reason = !browserOnline.value ? 'offline' : null;
  if (reason) {
    for (const bot of bots.value) {
      if (bot.status === 'running' || sessionActiveIds.value.includes(bot.id)) pauseReasons[bot.id] = reason;
    }
  }
}
watch(sessionActiveIds, (current, previous) => {
  for (const id of current) if (!previous.includes(id)) delete pauseReasons[id];
});
const strategyKinds: StrategyConfig['kind'][] = ['dca', 'threshold', 'sma', 'ai'];
const chartTabs = ['price', 'equity', 'backtest'] as const;
const chartTab = computed({
  get: () => navigation.value.chart,
  set: (chart: BotChartTab) => {
    void router.push(botWorkspaceLocation('bots', { botId: selectedId.value, chart }));
  },
});
/** Keep public strategy and composer selections bookmarkable without serializing a research draft. */
function navigateLab(state: Pick<BotNavigation, 'strategy' | 'composer'>): void {
  if (workspaceView.value === 'lab') void router.push(botWorkspaceLocation('lab', state));
}
/** Selecting a strategy changes only the unsigned historical inspector, never bot execution. */
function navigatePlayground(strategy: BotStrategyPreset): void {
  if (workspaceView.value === 'playground') void router.push(botWorkspaceLocation('playground', { strategy }));
}
/** Local bot identifiers select existing browser records and grant no trading authority. */
function navigateBot(botId: string): void {
  void router.push(botWorkspaceLocation('bots', { botId, chart: chartTab.value }));
}
watch(
  () => [navigation.value.view, navigation.value.botId, bots.value.map((bot) => bot.id).join('|')],
  () => {
    if (workspaceView.value !== 'bots' || !navigation.value.botId) return;
    const id = bots.value.some((bot) => bot.id === navigation.value.botId) ? navigation.value.botId : '';
    if (selectedId.value !== id) void selectBot(id);
  },
  { immediate: true }
);
const editor = ref<BotDefinition | null>(null);
const maxInput = ref('0');
const maxOutput = ref('0');
const intervalBlocks = ref(1);
let originalIntervalMs = 6000;
let cadenceEdited = false;
const sessionMinutes = ref(60);
const modal = ref<'' | 'create' | 'goal' | 'consent' | 'provider' | 'backtest' | 'delete' | 'suggestion'>('');
const dialog = ref<HTMLElement | null>(null);
const activeBotHeading = ref<HTMLElement | null>(null);
const localError = ref('');
const password = ref('');
const apiKey = ref('');
const providerModels = ref<BotAiModel[]>([]);
const modelsLoading = ref(false);
const providerDiscovered = ref(false);
let providerClient: BotAiClient | null = null;
let providerLifetime: AbortController | null = null;
let providerDiscoveryVersion = 0;
const consented = ref(false);
interface ResearchStartIntent {
  template: BotDefinition;
  research: BotResearchSnapshot;
  network: string;
  denomination: NonNullable<BotHistory['identity']>;
  draft?: BotDefinition;
  identity?: string;
  savedId?: string;
  /** Present for Quant Loop selections; drives the one-glance consent summary. */
  quant?: { symbol: string; cadence: QuantDeployPayload['cadence'] };
  /** Reviewed session length; omitted keeps the standard one-day research start. */
  sessionDurationMs?: number;
}
const startIntent = ref<ResearchStartIntent | null>(null);
const startPreparing = ref(false);
const startSubmitting = ref(false);
const startFunding = ref<BotFundingPreview | null>(null);
let startIntentVersion = 0;
const reviewBot = computed(() => startIntent.value?.draft ?? (startIntent.value ? null : selectedBot.value));
const reviewAssets = computed(() => {
  const bot = reviewBot.value;
  return bot
    ? [bot.assetIn, bot.assetOut, bot.policy.feeAsset].filter(
        (asset, index, all) => all.findIndex((other) => other.address === asset.address) === index
      )
    : [];
});

const reviewCadence = computed(() => {
  const interval = reviewBot.value?.strategy.intervalMs ?? 6000;
  if (interval === 86400000) return t('bots.startFlow.daily');
  if (interval === 3600000) return t('bots.startFlow.hourly');
  if (interval % 3600000 === 0) return t('bots.startFlow.hours', { count: interval / 3600000 });
  if (interval % 60000 === 0) return t('bots.startFlow.minutes', { count: interval / 60000 });
  return t('bots.startFlow.seconds', { count: interval / 1000 });
});

/** Discard transient intent and secrets without granting, or silently resuming, trading authority. */
function cancelStartIntent(revokePending = true): void {
  startIntentVersion++;
  if (startIntent.value?.draft) {
    discardLiveReview(startIntent.value.draft.id);
    if (revokePending && startSubmitting.value) void stopBot(startIntent.value.draft.id).catch(() => undefined);
  }
  startIntent.value = null;
  startPreparing.value = false;
  startFunding.value = null;
  password.value = '';
  consented.value = false;
  if (modal.value === 'consent') modal.value = '';
}

/** Carry the exact selected result through wallet connection; connection alone never starts a bot. */
async function startFromResearch(
  bot: BotDefinition,
  _settings: PlaygroundSettings,
  research?: BotResearchSnapshot,
  denomination?: NonNullable<BotHistory['identity']>,
  sessionDurationMs?: number
): Promise<void> {
  if (busy.value || startIntent.value || startSubmitting.value) return;
  if (!research || !denomination) {
    localError.value = 'bots.errors.config';
    return;
  }
  const version = ++startIntentVersion;
  startIntent.value = {
    template: JSON.parse(JSON.stringify(bot)) as BotDefinition,
    research: JSON.parse(JSON.stringify(research)) as BotResearchSnapshot,
    network: readNetworkIdentity(),
    denomination: { ...denomination },
    ...(sessionDurationMs !== undefined ? { sessionDurationMs } : {}),
  };
  if (walletConnected.value) await prepareResearchStart(version);
  else if (!(await run(connectSoraWallet)) && version === startIntentVersion) cancelStartIntent();
}

/** A Quant Loop selection enters the same wallet, funding and consent review as any researched bot. */
async function startQuant(payload: QuantDeployPayload): Promise<void> {
  // The intent is created synchronously, before any wallet or review await.
  const pending = startFromResearch(
    payload.bot,
    payload.settings,
    payload.research,
    payload.denomination,
    payload.sessionDurationMs
  );
  if (startIntent.value && startIntent.value.template.assetOut.address === payload.bot.assetOut.address)
    startIntent.value.quant = { symbol: payload.bot.assetOut.symbol, cadence: payload.cadence };
  await pending;
}
/** Paper trading keeps the selected rules, run length and research provenance without any signing authority. */
async function paperQuant(payload: QuantDeployPayload): Promise<void> {
  await savePlayground(payload.bot, payload.settings, payload.research, payload.sessionDurationMs);
}
/** Open Swap prefilled with XOR → token; the cached swap pair is set first so it cannot override the link. */
async function openSwap(assetAddress: string): Promise<void> {
  const asset = assets.value.find((item) => item.address === assetAddress);
  const xor = assets.value.find((item) => item.address === XOR.address) ?? XOR;
  if (!asset) return;
  const swap = useSwapStore();
  const wallet = useWalletStore();
  swap.setTokenFromAddress(XOR.address);
  swap.setTokenToAddress(asset.address);
  await router.push({
    name: PageNames.Swap,
    params: {
      first: buildRouteTokens(xor as never, wallet.whitelistIdsBySymbol),
      second: buildRouteTokens(asset as never, wallet.whitelistIdsBySymbol),
    },
  });
}

/** Obtain a fresh, validated unsigned draft before displaying its real-token consent review. */
async function prepareResearchStart(version = startIntentVersion): Promise<void> {
  const intent = startIntent.value;
  if (!intent || startPreparing.value || intent.draft || !walletConnected.value) return;
  if (intent.network !== readNetworkIdentity()) {
    cancelStartIntent();
    return;
  }
  startPreparing.value = true;
  const identity = readConnectionIdentity();
  await run(async () => {
    const draft = await (intent.sessionDurationMs === undefined
      ? prepareLiveBot(intent.template, intent.research, intent.denomination)
      : prepareLiveBot(intent.template, intent.research, intent.denomination, {
          sessionDurationMs: intent.sessionDurationMs,
        }));
    if (version !== startIntentVersion || identity !== readConnectionIdentity()) {
      discardLiveReview(draft.id);
      return;
    }
    intent.draft = draft;
    intent.identity = identity;
    startFunding.value = await previewLiveFunding(draft.id);
    if (version !== startIntentVersion) return;
    openModal('consent');
  });
  if (version === startIntentVersion) {
    startPreparing.value = false;
    if (!intent.draft || !startFunding.value) cancelStartIntent();
  }
}

/** Re-read available budget after funding the wallet; this does not connect a signer or start trading. */
async function refreshStartFunding(): Promise<void> {
  const intent = startIntent.value;
  const version = startIntentVersion;
  if (!intent?.draft || busy.value || startSubmitting.value) return;
  startFunding.value = null;
  password.value = '';
  consented.value = false;
  await run(async () => {
    const funding = await previewLiveFunding(intent.draft!.id);
    if (version === startIntentVersion) startFunding.value = funding;
  });
}

watch([walletConnected, connectionIdentity, soraAddress, isLoggedIn], () => {
  password.value = '';
  consented.value = false;
  const intent = startIntent.value;
  if (!intent) return;
  if (intent.network !== readNetworkIdentity() || (intent.identity && intent.identity !== readConnectionIdentity())) {
    cancelStartIntent();
    return;
  }
  if (walletConnected.value && !isSoraAccountDialogVisible.value) void prepareResearchStart();
});
watch(isSoraAccountDialogVisible, (visible, wasVisible) => {
  if (visible || !wasVisible || !startIntent.value) return;
  if (!walletConnected.value && !isLoggedIn.value) cancelStartIntent();
  else if (walletConnected.value) void prepareResearchStart();
});
const suggestedStrategy = ref<StrategyConfig | null>(null);
const draft = reactive<BotDraft>({
  name: '',
  assetInAddress: '',
  assetOutAddress: '',
  allocation: '100',
  feeBudget: '1',
  strategyKind: 'dca',
});
const draftCapitalSymbol = computed(
  () => assets.value.find((asset) => asset.address === draft.assetInAddress)?.symbol || '—'
);
const draftTradedSymbol = computed(
  () => assets.value.find((asset) => asset.address === draft.assetOutAddress)?.symbol || '—'
);
const backtest = reactive<BacktestOptions>({ days: 30, interval: 'hour', slippagePercent: '0.5', feeAmount: '' });
let previousFocus: HTMLElement | null = null;

/** Keep user edits isolated from live portfolio refreshes; switching bots discards only unsaved form data. */
function loadEditor(): void {
  resetProviderDiscovery(true);
  const bot = selectedBot.value;
  if (!bot) {
    editor.value = null;
    return;
  }
  editor.value = JSON.parse(JSON.stringify(bot)) as BotDefinition;
  maxInput.value = fromCodec(bot.policy.maxTradeCodec[bot.assetIn.address] || '0', bot.assetIn.decimals);
  maxOutput.value = fromCodec(bot.policy.maxTradeCodec[bot.assetOut.address] || '0', bot.assetOut.decimals);
  originalIntervalMs = bot.strategy.intervalMs;
  intervalBlocks.value = originalIntervalMs / 6000;
  cadenceEdited = false;
  sessionMinutes.value = bot.policy.sessionDurationMs / 60000;
}
watch(() => selectedBot.value?.id, loadEditor, { immediate: true });
watch(() => selectedBot.value?.mode, loadEditor);
const settingsLocked = computed(
  () =>
    busy.value ||
    selectedBot.value?.status === 'running' ||
    (selectedBot.value?.mode === 'live' && !['idle', 'stopped'].includes(selectedBot.value.status))
);
/** A deliberate strategy-kind change drops SMA-only timing without touching other edits or saved bots. */
function changeEditorStrategy(event: Event): void {
  const strategy = editor.value?.strategy;
  const kind = (event.target as HTMLSelectElement).value as StrategyConfig['kind'];
  if (!strategy || settingsLocked.value || strategy.kind === 'rules' || !strategyKinds.includes(kind)) return;
  if (strategy.kind === kind) return;
  strategy.kind = kind;
  if (kind !== 'sma') delete strategy.signalTiming;
}
const portfolioAssets = computed(() => {
  const bot = selectedBot.value;
  return bot
    ? [bot.assetIn, bot.assetOut, bot.policy.feeAsset].filter(
        (asset, index, all) => all.findIndex((item) => item.address === asset.address) === index
      )
    : [];
});

/** Render codec amounts without converting token balances to JavaScript numbers. */
function natural(amount: string, decimals: number): string {
  return fromCodec(amount, decimals);
}
/** Translate app event keys and the exact observed impact cause; other text remains escaped plain text. */
function message(value: string): string {
  return value === AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE || value.startsWith('bots.') ? t(value) : value;
}
/** Format timestamps in the user's locale without hiding the calendar date. */
function time(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const netPnl = computed(() => {
  const points = selectedBot.value?.equity || [];
  return points.length
    ? new FPNumber(points[points.length - 1].value).sub(new FPNumber(points[0].value)).toString()
    : '—';
});
const returnPercent = computed(() => {
  const points = selectedBot.value?.equity || [];
  if (!points.length || new FPNumber(points[0].value).isZero()) return '—';
  return new FPNumber(points[points.length - 1].value)
    .sub(new FPNumber(points[0].value))
    .div(new FPNumber(points[0].value))
    .mul(new FPNumber('100'))
    .toFixed(2);
});
const drawdownPercent = computed(() => {
  const points = selectedBot.value?.equity || [];
  if (!points.length) return '—';
  let peak = new FPNumber('0');
  let drawdown = new FPNumber('0');
  for (const point of points) {
    const value = new FPNumber(point.value);
    if (value.gt(peak)) peak = value;
    if (!peak.isZero()) {
      const current = peak.sub(value).div(peak).mul(new FPNumber('100'));
      if (current.gt(drawdown)) drawdown = current;
    }
  }
  return drawdown.toFixed(2);
});
const chartValues = computed(() => {
  if (chartTab.value === 'price')
    return chartCandles.value.map((candle) => ({ timestamp: candle.timestamp, value: candle.close }));
  return (chartTab.value === 'backtest' ? backtestResult.value?.equity : selectedBot.value?.equity) || [];
});
const chartPath = computed(() => {
  const values = chartValues.value;
  if (values.length < 2) return '';
  let min = new FPNumber(values[0].value);
  let max = min;
  for (const point of values) {
    const value = new FPNumber(point.value);
    if (value.lt(min)) min = value;
    if (value.gt(max)) max = value;
  }
  const range = max.sub(min);
  return values
    .map((point, index) => {
      // Convert only normalized chart geometry to numbers; token math stays exact.
      const y = range.isZero() ? 140 : 250 - Number(new FPNumber(point.value).sub(min).div(range).toString()) * 230;
      return `${index ? 'L' : 'M'} ${10 + (index / (values.length - 1)) * 780} ${y}`;
    })
    .join(' ');
});

/** Surface action errors without leaking credentials or unhandled promise rejections. */
async function run(action: () => unknown | Promise<unknown>): Promise<boolean> {
  localError.value = '';
  try {
    await action();
    return true;
  } catch (cause) {
    localError.value = cause instanceof Error ? cause.message : 'bots.errors.action';
    return false;
  }
}
/** Open a focused dialog and remember the triggering control for keyboard users. */
function openModal(kind: Exclude<typeof modal.value, ''>): void {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  localError.value = '';
  password.value = '';
  apiKey.value = '';
  resetProviderDiscovery();
  consented.value = false;
  continueMode.value = false;
  modal.value = kind;
  void nextTick(() => dialog.value?.focus());
}
/** Clear transient secrets whenever a dialog is dismissed, including Escape and backdrop clicks. */
function closeModal(): void {
  if (busy.value || startSubmitting.value) return;
  cancelStartIntent();
  resetProviderDiscovery();
  modal.value = '';
  password.value = '';
  apiKey.value = '';
  consented.value = false;
  continueMode.value = false;
  previousFocus?.focus();
}
/** Cancel session authority while an asynchronous dialog action is still pending. */
async function stopPending(): Promise<void> {
  resetProviderDiscovery();
  const id = startIntent.value?.savedId ?? reviewBot.value?.id;
  cancelStartIntent(false);
  password.value = '';
  apiKey.value = '';
  if (id && (await run(() => stopBot(id)))) {
    modal.value = '';
    consented.value = false;
    previousFocus?.focus();
  }
}
/** Trap keyboard focus inside modal forms and support Escape dismissal. */
function dialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
  }
  if (event.key !== 'Tab') return;
  const elements = [
    ...(dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'
    ) || []),
  ];
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
/** New bots always begin in paper mode; the controller validates precise allocations. */
function openCreate(): void {
  workspaceView.value = 'bots';
  draft.name = '';
  draft.assetInAddress =
    assets.value.find((asset) => asset.address === XOR.address)?.address || assets.value[0]?.address || '';
  draft.assetOutAddress =
    assets.value.find((asset) => asset.address === VAL.address && asset.address !== draft.assetInAddress)?.address ||
    assets.value.find((asset) => asset.address !== draft.assetInAddress)?.address ||
    '';
  draft.allocation = '100';
  draft.feeBudget = '1';
  draft.strategyKind = 'dca';
  openModal('create');
}
/** Create an isolated virtual portfolio without starting a signing session. */
async function submitCreate(): Promise<void> {
  if (await run(() => createBot({ ...draft }))) {
    closeModal();
    await router.push(botWorkspaceLocation('bots', { botId: selectedId.value }));
  }
}
/** Save a Jev goal with virtual capital, then show its connection and start actions. */
async function submitGoal(value: Omit<BotDraft, 'strategyKind' | 'goal'> & BotGoal): Promise<void> {
  const { title, targetReturnPercent, maxLossPercent, durationMs, ...draft } = value;
  if (
    await run(() =>
      createBot({ ...draft, strategyKind: 'ai', goal: { title, targetReturnPercent, maxLossPercent, durationMs } })
    )
  ) {
    closeModal();
    await router.push(botWorkspaceLocation('bots', { botId: selectedId.value }));
    loadEditor();
    await nextTick();
    activeBotHeading.value?.focus({ preventScroll: true });
    activeBotHeading.value?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
  }
}
/** Persist reviewed settings, then orient the user at the new idle bot; research never grants live consent. */
async function savePlayground(
  bot: BotDefinition,
  settings: PlaygroundSettings,
  research?: import('../types').BotResearchSnapshot,
  sessionDurationMs?: number
): Promise<void> {
  const options = {
    thresholdPercent: settings.thresholdPercent,
    research,
    ...(sessionDurationMs !== undefined ? { sessionDurationMs } : {}),
  };
  if (await run(() => createPaperBot(bot, options))) {
    await router.push(botWorkspaceLocation('bots', { botId: selectedId.value }));
    loadEditor();
    await nextTick();
    activeBotHeading.value?.focus({ preventScroll: true });
    activeBotHeading.value?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
  }
}
/** Save only configurable fields over the current bot so portfolio refreshes cannot be overwritten. */
async function saveSettings(): Promise<void> {
  if (!editor.value || !selectedBot.value) return;
  await run(async () => {
    const next = {
      ...selectedBot.value,
      name: editor.value!.name,
      mode: editor.value!.mode,
      strategy: { ...editor.value!.strategy, intervalMs: editedIntervalMs() },
      provider: editor.value!.provider,
      model: editor.value!.model,
      endpoint: editor.value!.endpoint,
      goal: editor.value!.goal,
      policy: {
        ...editor.value!.policy,
        sessionDurationMs: sessionMinutes.value * 60000,
        maxTradeCodec: {
          [selectedBot.value!.assetIn.address]: toCodec(maxInput.value, selectedBot.value!.assetIn.decimals),
          [selectedBot.value!.assetOut.address]: toCodec(maxOutput.value, selectedBot.value!.assetOut.decimals),
        },
      },
    };
    await updateBot(next);
    loadEditor();
  });
}
/** Live always requires fresh consent; paper execution never displays a password input. */
async function requestStart(): Promise<void> {
  if (!selectedBot.value) return;
  if (selectedBot.value.strategy.kind === 'ai' && !providerConnectedIds.value.includes(selectedBot.value.id)) {
    openModal('provider');
    return;
  }
  if (selectedBot.value.mode === 'live') openModal('consent');
  else await run(() => startBot(selectedBot.value!.id, {}));
}
/**
 * Continue the selected run until its saved end. Paper bots and connected external-wallet bots
 * continue at once (the wallet still approves each swap). Other live bots confirm in the consent
 * dialog, which also offers Connect account when no wallet is connected.
 */
async function requestResume(): Promise<void> {
  const bot = selectedBot.value;
  if (!bot) return;
  if (bot.mode === 'paper' || (walletConnected.value && externalWallet.value)) {
    await run(() => startBot(bot.id, { continueRun: true }));
    return;
  }
  openModal('consent');
  continueMode.value = true;
}
/** Explicit consent saves this exact draft once, then starts the existing bounded live executor. */
async function submitConsent(): Promise<void> {
  if (
    !reviewBot.value ||
    !consented.value ||
    !walletConnected.value ||
    busy.value ||
    startSubmitting.value ||
    (startIntent.value && !startFunding.value?.sufficient)
  )
    return;
  const intent = startIntent.value;
  const version = startIntentVersion;
  const id = reviewBot.value.id;
  const secret = password.value;
  password.value = '';
  startSubmitting.value = true;
  const succeeded = await run(async () => {
    if (intent) {
      if (!intent.draft || intent.identity !== readConnectionIdentity()) throw new Error('bots.errors.session');
      const funding = await previewLiveFunding(intent.draft.id);
      if (version !== startIntentVersion) return;
      startFunding.value = funding;
      if (!funding.sufficient) throw new Error('bots.errors.balance');
      intent.savedId ??= await saveLiveBot(intent.draft);
      if (version !== startIntentVersion) return;
    }
    await startBot(id, {
      ...(externalWallet.value ? {} : { password: secret }),
      ...(intent ? { expectedConnection: intent.identity } : {}),
      ...(!intent && continueMode.value ? { continueRun: true } : {}),
    });
    if (intent && version === startIntentVersion) {
      await router.push(botWorkspaceLocation('bots', { botId: id }));
      loadEditor();
    }
  });
  startSubmitting.value = false;
  if (succeeded && version === startIntentVersion) closeModal();
}
/** Preserve saved durations exactly; changing cadence requires a whole positive block count. */
function editedIntervalMs(): number {
  if (!cadenceEdited) return originalIntervalMs;
  if (!Number.isSafeInteger(intervalBlocks.value) || intervalBlocks.value < 1 || intervalBlocks.value > 432000)
    throw new Error('bots.errors.config');
  return intervalBlocks.value * 6000;
}

/** Revoke only the pending discovery client; transferred runtime credentials belong to the controller. */
function resetProviderDiscovery(clearModels = false): void {
  providerDiscoveryVersion++;
  providerLifetime?.abort();
  providerLifetime = null;
  providerClient?.disconnect();
  providerClient = null;
  providerDiscovered.value = false;
  modelsLoading.value = false;
  apiKey.value = '';
  if (clearModels) providerModels.value = [];
}

/** Provider changes invalidate the previous account's model catalog and pending key. */
function changeEditorProvider(): void {
  resetProviderDiscovery(true);
  if (editor.value) {
    editor.value.model = editor.value.provider === 'jev' ? 'jev-latest' : '';
    editor.value.endpoint = '';
  }
}

/** Identify the bot and explicitly selected provider configuration without including any secret. */
function providerContext(): string {
  return JSON.stringify([selectedBot.value?.id, editor.value?.provider, editor.value?.endpoint]);
}

/** Discover the account's current model catalog before accepting a selection; credentials stay in one client closure. */
async function submitProvider(): Promise<void> {
  const bot = selectedBot.value;
  const currentEditor = editor.value;
  if (!bot || !currentEditor || modelsLoading.value || busy.value) return;
  if (providerDiscovered.value) {
    await transferProvider();
    return;
  }
  localError.value = '';
  const context = providerContext();
  const version = ++providerDiscoveryVersion;
  let secret = apiKey.value;
  apiKey.value = '';
  let client: BotAiClient | null = null;
  modelsLoading.value = true;
  providerModels.value = [];
  providerLifetime = new AbortController();
  try {
    client = createBotAiClient(currentEditor.provider, {
      apiKey: secret,
      model: currentEditor.provider === 'jev' ? 'jev-latest' : '',
      endpoint: currentEditor.endpoint,
    });
    secret = '';
    providerClient = client;
    if (currentEditor.provider === 'openai' || currentEditor.provider === 'claude') {
      const models = await client.listModels(providerLifetime.signal);
      if (version !== providerDiscoveryVersion || context !== providerContext() || modal.value !== 'provider') {
        client.disconnect();
        return;
      }
      if (!models.length) throw new Error('bots.labAi.modelsUnavailable');
      providerModels.value = models;
      currentEditor.model = models.some((model) => model.id === currentEditor.model)
        ? currentEditor.model
        : models[0].id;
      client.selectModel(currentEditor.model);
    }
    providerDiscovered.value = true;
    if (currentEditor.provider === 'custom' || currentEditor.provider === 'jev') {
      modelsLoading.value = false;
      await transferProvider();
    }
  } catch {
    if (version === providerDiscoveryVersion) {
      resetProviderDiscovery();
      localError.value = currentEditor.provider === 'jev' ? 'bots.errors.provider' : 'bots.labAi.modelsUnavailable';
    } else client?.disconnect();
  } finally {
    secret = '';
    if (version === providerDiscoveryVersion) modelsLoading.value = false;
  }
}

/** Save only public provider metadata, then transfer the already discovered client without copying its API key. */
async function transferProvider(): Promise<void> {
  const bot = selectedBot.value;
  const currentEditor = editor.value;
  const client = providerClient;
  const lifetime = providerLifetime;
  if (!bot || !currentEditor || !client || !lifetime) return;
  const context = providerContext();
  const metadata = { provider: currentEditor.provider, model: currentEditor.model, endpoint: currentEditor.endpoint };
  if (
    await run(async () => {
      if (metadata.provider === 'openai' || metadata.provider === 'claude') {
        if (!providerModels.value.some((model) => model.id === metadata.model))
          throw new Error('bots.labAi.selectModel');
        client.selectModel(metadata.model);
      }
      if (bot.provider !== metadata.provider || bot.model !== metadata.model || bot.endpoint !== metadata.endpoint)
        await updateBot({ ...bot, ...metadata });
      if (context !== providerContext() || providerClient !== client) throw new Error('bots.errors.stale');
      await connectProviderClient(bot.id, client, metadata, lifetime.signal);
      if (providerClient === client) providerClient = null;
    })
  )
    closeModal();
}
/** Request a deterministic configuration preview without granting execution consent. */
async function generateStrategy(): Promise<void> {
  if (!selectedBot.value) return;
  if (
    await run(async () => {
      suggestedStrategy.value = await suggestStrategy(selectedBot.value!.id);
    })
  )
    openModal('suggestion');
}
/** Apply only the reviewed strategy configuration, preserving the current portfolio and policy. */
async function applySuggestion(): Promise<void> {
  if (!selectedBot.value || !suggestedStrategy.value) return;
  if (await run(() => updateBot({ ...selectedBot.value!, strategy: { ...suggestedStrategy.value! } }))) {
    loadEditor();
    closeModal();
  }
}
/** Historical execution uses only the backtest adapter and switches to the resulting equity chart. */
async function submitBacktest(): Promise<void> {
  if (!selectedBot.value || backtestFeeLoading.value) return;
  const bot = selectedBot.value;
  const settings = { ...backtest };
  backtestFeeLoading.value = true;
  try {
    if (
      await run(async () => {
        const [fees, history] = await Promise.all([
          researchFees.load(bot, settings),
          playgroundHistory.load(bot, {
            ...PLAYGROUND_DEFAULT_SETTINGS,
            historyStartAt: Date.UTC(2026, 2, 1),
            historyEndAt: Math.floor(Date.now() / 3_600_000) * 3_600_000,
          }),
        ]);
        if (
          selectedBot.value?.id !== bot.id ||
          modal.value !== 'backtest' ||
          Date.now() > fees.expiresAt ||
          backtest.slippagePercent !== settings.slippagePercent
        )
          throw new Error('bots.errors.stale');
        if (
          !history.identity ||
          history.identity.genesisHash !== fees.genesisHash ||
          history.identity.denominator !== fees.denominator
        )
          throw new Error('bots.errors.denomination');
        await backtestBot(bot.id, {
          ...settings,
          feeAmount: fees.networkFeeXor,
          swapFeePercent: fees.swapFeePercent,
          sellFeeAmount: fees.sellNetworkFeeXor,
          sellSwapFeePercent: fees.sellSwapFeePercent,
          priceImpactPercent: fees.priceImpactPercent,
          sellPriceImpactPercent: fees.sellPriceImpactPercent,
          history,
        });
      })
    ) {
      chartTab.value = 'backtest';
      closeModal();
    }
  } finally {
    backtestFeeLoading.value = false;
  }
}
/** Deletion is deliberate and leaves account tokens in the existing wallet. */
async function submitDelete(): Promise<void> {
  if (selectedBot.value && (await run(() => deleteBot(selectedBot.value!.id)))) closeModal();
}

onMounted(() => {
  document.addEventListener('visibilitychange', observeBrowserRuntime);
  window.addEventListener('offline', observeBrowserRuntime);
  window.addEventListener('online', observeBrowserRuntime);
  void run(initialize);
});
onUnmounted(() => {
  document.removeEventListener('visibilitychange', observeBrowserRuntime);
  window.removeEventListener('offline', observeBrowserRuntime);
  window.removeEventListener('online', observeBrowserRuntime);
  cancelStartIntent();
  resetProviderDiscovery(true);
  playgroundHistory.clear();
  autopilotHistory.clear();
  researchFees.clear();
  password.value = '';
  apiKey.value = '';
});
</script>

<style lang="scss" scoped>
.start-progress {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--bot-border);
  border-radius: 16px;
  line-height: 1.5;
}
.review-funding {
  margin-block: 16px;
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  caption {
    text-align: start;
    font-weight: 600;
    margin-bottom: 8px;
  }
  th,
  td {
    text-align: start;
    padding: 6px 4px;
    overflow-wrap: anywhere;
  }
  th {
    font-weight: 500;
    color: var(--bot-muted);
  }
  p {
    font-size: 12px;
    line-height: 1.6;
    margin-block: 8px;
  }
  button {
    font-size: 12px;
  }
}
.review-limits {
  margin-block: 16px;
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    padding-block: 8px;
  }
}

.bots-journey {
  display: flex;
  align-items: center;
  gap: 14px;
  list-style: none;
  padding: 0;
  margin: 0;
  color: var(--bot-muted);
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    line-height: 1.5;
    transition: color 180ms ease;
  }
  li + li::before {
    content: '→';
    margin-inline-end: 6px;
    color: var(--bot-muted);
  }
  strong {
    font-weight: 500;
  }
  span {
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }
  .current {
    color: var(--bot-accent);
    strong {
      font-weight: 650;
    }
  }
}
/* Your bots: the same run list as the top bar, first on the page when bots run or wait. */
.bots-runs {
  display: grid;
  gap: 10px;
  margin: 0 0 24px;
  padding: 18px 20px;
  border-radius: 24px;
  background: var(--bot-surface);
  box-shadow: var(--bot-shadow-raised);
}
.bots-runs-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
  }
}
.bots-runs-manage {
  font-size: 13px;
  font-weight: 700;
  color: var(--bot-accent);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.bots-runs-note {
  margin: 0;
  max-width: 90ch;
  font-size: 13px;
  line-height: 1.55;
  color: var(--bot-muted);
}
.bots-page .browser-notice {
  margin: 0 0 8px;
  padding: 0;
  color: var(--bot-muted);
  font-size: 12px;
  line-height: 1.6;
  max-width: 90ch;
  p {
    margin-top: 8px;
  }
}
.browser-notice summary,
.runtime-strip summary,
.strategy-explanation summary {
  cursor: pointer;
  width: fit-content;
}
.runtime-strip {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 0 24px 16px;
  padding: 14px 0;
  border-block: 1px solid var(--bot-border);
  line-height: 1.6;
  i {
    position: relative;
    flex: 0 0 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--bot-muted);
  }
  summary {
    font-size: 13px;
    font-weight: 600;
  }
  p {
    color: var(--bot-muted);
    font-size: 12px;
  }
  &.running i {
    background: var(--bot-accent);
  }
  // The pulse animates only transform and opacity, so the compositor runs it without per-frame style or paint work
  // on the main thread; a session can keep this page open for days.
  &.running i::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: color-mix(in srgb, var(--bot-accent) 35%, transparent);
    animation: session-pulse 2s ease-out infinite;
    will-change: transform, opacity;
  }
}
.bot-modal .quant-consent {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(
    140deg,
    color-mix(in srgb, var(--s-color-theme-accent, #f8087b) 12%, var(--s-color-utility-surface, #fdf7fb)),
    var(--s-color-utility-surface, #fdf7fb)
  );
  box-shadow:
    inset 0 1px 0 var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8)),
    0 0 0 1px color-mix(in srgb, var(--s-color-theme-accent, #f8087b) 22%, transparent);
}
.bot-modal .quant-consent-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--s-color-base-content-primary, #29282e);
}
.bot-modal .quant-consent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    background: var(--s-color-base-background, #faf4f8);
    box-shadow:
      inset 2px 2px 5px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
      inset -2px -2px 5px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  }
}
.bot-modal .quant-consent-evidence {
  font-size: 12px;
  line-height: 1.6;
  color: var(--s-color-base-content-secondary, #686775);
}
.bot-modal .quant-consent-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  padding-inline-start: 18px;
  font-size: 12px;
  font-weight: 600;
  color: var(--s-color-base-content-primary, #29282e);
}
.bot-modal .quant-get-xor {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin-inline-start: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--s-color-action-text, #b73580);
}
.bot-modal .paper-setup-note {
  margin-bottom: 24px;
  line-height: 1.65;
  color: var(--s-color-base-content-secondary);
  strong {
    display: block;
    margin-bottom: 6px;
    color: var(--s-color-base-content-primary);
    font-size: 14px;
  }
}
.bot-modal .strategy-explanation,
.bot-inspector .strategy-explanation,
.bot-modal .consent-browser-note {
  margin-bottom: 20px;
  padding-inline-start: 12px;
  border-inline-start: 2px solid var(--s-color-theme-accent);
  color: var(--s-color-base-content-primary);
  font-size: 13px;
  line-height: 1.7;
}
.strategy-rule-enter-active,
.strategy-rule-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.strategy-rule-enter-from,
.strategy-rule-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
.bots-page .research-return {
  border: none;
  margin-top: 12px;
}
@keyframes session-pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  75%,
  100% {
    opacity: 0;
    transform: scale(2.75);
  }
}
.bots-view-tabs {
  display: flex;
  gap: 28px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--s-color-base-border-secondary);
  animation: workspace-enter 420ms 60ms ease both;
  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 10px 0;
    color: var(--bot-muted);
    font-size: 13px;
    font-weight: 550;
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition:
      color 160ms ease,
      border-color 160ms ease;
  }
  a::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    bottom: -2px;
    height: 2px;
    background: var(--bot-accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 240ms ease;
  }
  a[aria-current='page']::after {
    transform: scaleX(1);
    box-shadow: 0 0 12px color-mix(in srgb, var(--bot-accent) 28%, transparent);
  }
  a:hover,
  a[aria-current='page'] {
    border-bottom-color: var(--bot-accent);
    color: var(--s-color-base-content-primary);
  }
  a:focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 4px;
  }
  span {
    margin-inline-start: 6px;
    font:
      10px ui-monospace,
      monospace;
    opacity: 0.65;
  }
}
.playground-sessions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  button {
    min-height: 36px;
  }
}
.bots-page {
  --bot-border: var(--s-color-base-border-secondary, #e7e7ec);
  --bot-muted: var(--s-color-base-content-secondary, #686775);
  --bot-accent: var(--s-color-action-text, #b73580);
  --bot-cyan: var(--s-color-status-success-text);
  --bot-surface: var(--s-color-utility-surface);
  --bot-recess: var(--s-color-base-background);
  --bot-shadow-raised: 5px 5px 12px var(--s-shadow-color-dark), -4px -4px 10px var(--s-shadow-color-light-dark);
  --bot-shadow-inset:
    inset 3px 3px 7px var(--s-shadow-color-dark), inset -3px -3px 7px var(--s-shadow-color-light-dark);
  color: var(--s-color-base-content-primary, #29282e);
  margin: 0 24px 56px 0;
  padding: 24px;
  border-radius: 24px;
  background: var(--bot-surface);
  box-shadow: var(--bot-shadow-raised);
  font-variant-numeric: tabular-nums;
  min-width: 0;
}
.bots-market-entry {
  min-width: 0;
}
.bots-market-entry:not(:empty) {
  margin-bottom: 24px;
}

.bots-page,
.bot-modal {
  font-size: 14px;
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  button {
    border: 1px solid var(--bot-border, var(--s-color-base-border-secondary));
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    min-height: 36px;
    padding: 8px 13px;
    transition:
      color 150ms ease,
      background 150ms ease,
      border-color 150ms ease,
      transform 150ms ease,
      box-shadow 150ms ease;
  }
  button:hover:not(:disabled) {
    border-color: var(--s-color-theme-accent, #e6479e);
    color: var(--s-color-theme-accent, #e6479e);
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--s-color-theme-accent, #e6479e);
    outline-offset: 3px;
  }
  button.primary {
    background: var(--s-color-theme-accent, #e6479e);
    color: #fff;
    border-color: transparent;
    font-weight: 600;
  }
  button.primary:hover:not(:disabled) {
    filter: brightness(0.95);
    color: #fff;
  }
  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }
  h3,
  h4 {
    font-size: 13px;
    font-weight: 600;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--s-color-base-content-secondary, #85858f);
    font-size: 13px;
    margin-bottom: 16px;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    min-height: 40px;
    border: 1px solid var(--s-color-base-border-secondary, #e7e7ec);
    border-radius: 7px;
    padding: 10px 11px;
    background: var(--s-color-base-background, #fff);
    color: var(--s-color-base-content-primary, #29282e);
  }
  textarea {
    resize: vertical;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  fieldset:disabled {
    opacity: 0.65;
  }
  .form-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .field-note {
    margin: -5px 0 18px;
    color: var(--s-color-base-content-secondary, #85858f);
    font-size: 12px;
    line-height: 1.65;
  }
  .full-width {
    width: 100%;
  }
}
.bots-top {
  animation: workspace-enter 360ms ease both;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 0 18px;
}
.bots-heading h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  letter-spacing: -0.8px;
  line-height: 1.3;
  font-weight: 650;
}
.bots-heading h1::before {
  content: '';
  width: 7px;
  height: 24px;
  border-radius: 4px;
  background: var(--bot-accent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--bot-accent) 25%, transparent);
}
.bots-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}
/* Sections share one route; this is the visible way back to the AI trading home. */
.bots-home-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 15px 8px 12px;
  border-radius: 12px;
  color: var(--bot-accent);
  background: var(--bot-surface);
  box-shadow: var(--bot-shadow-raised);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
  span {
    transition: transform 160ms ease;
  }
  &:hover {
    transform: translateY(-1px);
    span {
      transform: translateX(-3px);
    }
  }
  &:active {
    box-shadow: var(--bot-shadow-inset);
  }
  &:focus-visible {
    outline: 2px solid var(--bot-accent);
    outline-offset: 3px;
  }
}
.bots-eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--bot-muted);
}
.bots-top-actions {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}
.bots-top-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.bots-top-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--bot-accent);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--bot-surface);
  box-shadow: var(--bot-shadow-raised);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:active {
    box-shadow: var(--bot-shadow-inset);
  }
  &:focus-visible {
    outline: 2px solid var(--bot-accent);
    outline-offset: 3px;
  }
}
.bots-top-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  color: var(--s-color-on-action, #fff);
  background: var(--bot-accent);
  font-size: 11px;
  text-align: center;
}
.goal-next-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 28px 20px;
  p {
    color: var(--bot-muted);
    font-size: 13px;
    line-height: 1.5;
  }
  button {
    flex-shrink: 0;
  }
}
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--bot-muted);
  border-radius: 50%;
}
.browser-status i {
  background: var(--bot-accent);
}
.bots-workspace {
  display: grid;
  grid-template-columns: 190px #{'minmax(300px, 1fr)'} 278px;
  border-top: 1px solid var(--bot-border);
  min-height: 700px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.section-heading h2 {
  font-size: 12px;
}
.section-heading > span {
  font-size: 12px;
  color: var(--bot-muted);
}
.section-heading button {
  border: none;
  padding: 5px 0;
  font-size: 12px;
  min-height: 30px;
}
.bot-navigation {
  border-right: 1px solid var(--bot-border);
  padding: 14px 14px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bot-navigation .section-heading {
  padding: 0 9px;
}
.nav-empty {
  padding: 14px 9px;
  font-size: 12px;
  line-height: 1.7;
}
.bot-navigation button.bot-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  border: 0;
  padding: 14px 12px;
  border-radius: 6px;
  background: transparent;
}
.bot-row:hover,
.bot-row.selected {
  background: color-mix(in srgb, var(--bot-accent) 6%, transparent) !important;
}
.bot-row.selected {
  box-shadow: inset 2px 0 var(--bot-accent);
}
.bot-row > span {
  font-size: 12px;
  color: var(--bot-muted);
}
.bot-row-top,
.bot-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  width: 100%;
}
.bot-row-top strong {
  color: var(--s-color-base-content-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}
.bot-row-bottom small {
  font-size: 12px;
}
.status-dot.running {
  background: var(--bot-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bot-accent) 12%, transparent);
}
.status-dot.attention {
  background: var(--s-color-status-error, #ed5757);
}
.bot-main {
  min-width: 0;
}
.bot-toolbar {
  padding: 23px 24px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bot-toolbar h2 {
  scroll-margin-top: 80px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.bot-toolbar p {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--bot-muted);
  margin-top: 9px;
}
.mode-tag {
  padding: 3px 6px;
  background: color-mix(in srgb, var(--bot-muted) 8%, transparent);
  border-radius: 4px;
  font-size: 12px;
}
.status-label {
  font-size: 12px;
}
.toolbar-actions {
  display: flex;
  gap: 7px;
}
.toolbar-actions button {
  min-height: 32px;
  padding: 7px 12px;
  font-size: 12px;
}
.session-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: color-mix(in srgb, var(--bot-accent) 5%, transparent);
  padding: 10px 24px;
  font-size: 12px;
}
.session-strip span {
  color: var(--bot-muted);
}
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 20px 24px 25px;
  gap: 12px;
}
.metrics-strip > div {
  min-width: 0;
}
.metrics-strip span {
  display: block;
  color: var(--bot-muted);
  font-size: 12px;
  margin-bottom: 9px;
}
.metrics-strip strong {
  display: block;
  font-size: 19px;
  font-weight: 500;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
}
.metrics-strip small {
  font-size: 12px;
  margin-left: 4px;
  color: var(--bot-muted);
  letter-spacing: 0;
}
.chart-panel {
  padding: 0 24px 18px;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-tabs {
  display: flex;
  gap: 18px;
}
.chart-tabs button {
  padding: 8px 0;
  border: 0;
  border-radius: 0;
  color: var(--bot-muted);
  font-size: 12px;
}
.chart-tabs button.active {
  color: var(--s-color-base-content-primary);
  box-shadow: 0 1px var(--bot-accent);
}
.chart-unit {
  font-size: 12px;
}
.chart-canvas {
  height: 280px;
  color: var(--bot-accent);
  padding-top: 15px;
}
.chart-canvas svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chart-grid {
  fill: none;
  stroke: var(--bot-border);
  stroke-width: 1;
  stroke-dasharray: 3 6;
}
.chart-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.chart-footer {
  display: flex;
  justify-content: space-between;
  color: var(--bot-muted);
  font-size: 12px;
}
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--bot-muted);
  text-align: center;
  background: repeating-linear-gradient(0deg, transparent, transparent 64px, var(--bot-border) 65px, transparent 66px);
}
.chart-empty strong {
  color: var(--s-color-base-content-primary);
  font-size: 12px;
  font-weight: 500;
}
.chart-empty p {
  font-size: 12px;
  max-width: 280px;
  line-height: 1.6;
  margin-top: 8px;
}
.empty-chart-mark {
  font-size: 42px;
  line-height: 1.3;
  color: var(--bot-accent);
}
.holdings-section,
.backtest-section,
.activity-section {
  padding: 10px 24px 20px;
  border-top: 1px solid var(--bot-border);
}
.holdings-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
  padding-top: 8px;
}
.holdings-list > div {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.holdings-list strong {
  font-size: 12px;
  font-weight: 500;
  color: var(--bot-muted);
}
.asset-letter {
  display: grid;
  place-items: center;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background: color-mix(in srgb, var(--bot-accent) 8%, transparent);
  color: var(--bot-accent);
  font-size: 12px;
}
.backtest-section p {
  font-size: 12px;
  line-height: 1.7;
}
.backtest-result {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--bot-muted);
}
.backtest-result strong {
  color: var(--s-color-base-content-primary);
  padding-left: 5px;
}
.activity-empty {
  padding: 18px 0;
  font-size: 12px;
}
.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow: auto;
}
.activity-list li {
  display: grid;
  grid-template-columns: 100px 45px #{'minmax(0, 1fr)'};
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid var(--bot-border);
  font-size: 12px;
  line-height: 1.6;
}
.activity-list time {
  color: var(--bot-muted);
}
.activity-list p {
  overflow-wrap: anywhere;
}
.event-kind {
  color: var(--bot-muted);
  font-size: 12px;
}
.event-kind.trade {
  color: var(--bot-accent);
}
.event-kind.error {
  color: var(--s-color-status-error);
}
.activity-list code {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--bot-muted);
}
.bot-inspector {
  border-left: 1px solid var(--bot-border);
  padding: 14px 0 24px 20px;
  min-width: 0;
}
.bot-inspector .section-heading {
  margin-bottom: 10px;
}
.bot-inspector h4 {
  margin: 25px 0 18px;
}
.bot-inspector .save-button {
  width: 100%;
  color: var(--bot-accent);
}
.provider-section {
  border-top: 1px solid var(--bot-border);
  margin-top: 24px;
  padding-top: 12px;
}
.connection-status {
  color: var(--bot-accent);
  font-size: 12px;
  margin-bottom: 15px !important;
}
.usage-list {
  margin: 18px 0 0;
  font-size: 12px;
}
.usage-list > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.usage-list dt {
  color: var(--bot-muted);
}
.usage-list dd {
  margin: 0;
}
.inspector-footer {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--bot-border);
}
.inspector-footer p {
  font-size: 12px;
  color: var(--bot-muted);
  line-height: 1.7;
  margin-bottom: 10px;
}
.inspector-footer .delete-button {
  font-size: 12px;
  border: 0;
  padding: 5px 0;
  color: var(--bot-muted);
}
.muted {
  color: var(--bot-muted);
}
.bots-error {
  color: var(--s-color-status-error, #de4262);
  font-size: 12px;
  padding: 12px;
  margin: 0 0 12px !important;
  line-height: 1.6;
  background: color-mix(in srgb, var(--s-color-status-error, #de4262) 7%, transparent);
  overflow-wrap: anywhere;
}
.workspace-empty {
  grid-column: span 2;
  min-height: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 30px;
}
.empty-orbit {
  display: grid;
  place-items: center;
  width: 105px;
  height: 105px;
  border-radius: 50%;
  border: 1px solid var(--bot-border);
  margin-bottom: 30px;
  box-shadow: 0 0 0 15px color-mix(in srgb, var(--bot-muted) 3%, transparent);
}
.empty-orbit span {
  color: var(--bot-accent);
  font-size: 70px;
  transform: rotate(-15deg);
}
.workspace-empty h2 {
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.9px;
  margin: 14px 0;
}
.workspace-empty > p {
  max-width: 390px;
  color: var(--bot-muted);
  font-size: 13px;
  line-height: 1.8;
}
.workspace-empty > button {
  margin-top: 24px;
}
.empty-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 680px;
  gap: 30px;
  margin-top: 70px;
  text-align: left;
}
.empty-modes > div {
  border-top: 1px solid var(--bot-border);
  padding-top: 18px;
}
.empty-modes span {
  display: block;
  color: var(--bot-accent);
  font-size: 12px;
  margin-bottom: 10px;
}
.empty-modes strong {
  font-size: 12px;
  font-weight: 500;
}
.empty-modes p {
  color: var(--bot-muted);
  font-size: 12px;
  line-height: 1.7;
  margin-top: 8px;
}
.bot-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgb(20 17 26 / 45%);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.bot-modal {
  --bot-border: var(--s-color-base-border-secondary, #e7e7ec);
  width: 440px;
  max-width: 100%;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 28px;
  border-radius: 16px;
  color: var(--s-color-base-content-primary, #29282e);
  background: var(--s-color-utility-surface, var(--s-color-base-background, #fff));
  box-shadow: 0 20px 90px rgb(0 0 0 / 12%);
  animation: dialog-enter 180ms ease both;
}
.modal-stop {
  margin-top: 12px;
}
.bot-modal.goal-dialog {
  width: 560px;
}
.modal-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.modal-heading h2 {
  font-size: 20px;
  font-weight: 600;
}
.modal-heading button {
  border: none;
  font-size: 24px;
  padding: 0 5px;
  min-height: 28px;
}
.modal-intro,
.modal-note {
  color: var(--s-color-base-content-secondary, #85858f);
  font-size: 12px;
  line-height: 1.7;
  margin-bottom: 20px !important;
}
.modal-note {
  font-size: 12px;
}
.consent-summary {
  margin: 0 0 20px;
}
.consent-summary > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--bot-border);
  font-size: 12px;
  line-height: 1.5;
}
.consent-summary dt {
  color: var(--s-color-base-content-secondary);
}
.consent-summary dd {
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
}
.bot-modal label.checkbox-label {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.7;
}
.checkbox-label input {
  width: 16px;
  height: 16px;
  min-height: 16px;
  flex-shrink: 0;
  margin: 2px 0 0;
  accent-color: var(--s-color-theme-accent);
}
@keyframes workspace-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 1250px) {
  .bots-workspace {
    grid-template-columns: 155px #{'minmax(270px, 1fr)'} 245px;
  }
  .bot-inspector {
    padding-left: 15px;
  }
  .bot-toolbar,
  .metrics-strip,
  .chart-panel,
  .holdings-section,
  .backtest-section,
  .activity-section {
    padding-left: 18px;
    padding-right: 18px;
  }
}
@media (max-width: 1050px) {
  .bots-workspace {
    grid-template-columns: 150px #{'minmax(0, 1fr)'};
  }
  .bot-inspector {
    grid-column: 2;
    border-left: 0;
    border-top: 1px solid var(--bot-border);
    padding: 20px;
  }
  .bot-navigation {
    grid-row: span 2;
  }
  .workspace-empty {
    grid-column: 2;
  }
  .bot-inspector form fieldset {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 18px;
  }
  .bot-inspector h4,
  .bot-inspector .field-note,
  .bot-inspector .save-button {
    grid-column: span 2;
  }
  .bot-inspector .form-pair {
    display: contents;
  }
}
@media (max-width: 700px) {
  .goal-next-action {
    margin-inline: 0;
    align-items: flex-start;
    flex-direction: column;
  }
  .bots-journey {
    align-items: flex-start;
    gap: 14px;
    li {
      flex: 1;
      display: block;
      font-size: 12px;
    }
    li + li::before {
      display: none;
    }
    span {
      display: block;
      margin-bottom: 4px;
    }
  }
  .bots-view-tabs {
    gap: 18px;
    a {
      text-align: start;
      font-size: 13px;
    }
  }
  .runtime-strip {
    margin-inline: 0;
  }
  .bots-page {
    margin: 0 12px 70px;
    padding: 16px 12px;
    border-radius: 18px;
  }
  .bots-top {
    padding-top: 10px;
  }
  .bots-heading h1 {
    font-size: 28px;
  }
  .bots-workspace {
    display: flex;
    flex-direction: column;
  }
  .bot-navigation {
    flex-direction: row;
    overflow-x: auto;
    padding: 10px 0;
    gap: 7px;
    border-right: 0;
    border-bottom: 1px solid var(--bot-border);
  }
  .bot-navigation .section-heading {
    display: none;
  }
  .bot-navigation button.bot-row {
    min-width: 170px;
    padding: 12px;
  }
  .bot-navigation .nav-empty {
    padding: 0;
  }
  .bot-toolbar {
    padding: 20px 0 16px;
  }
  .metrics-strip {
    padding: 20px 0;
    gap: 18px 8px;
    grid-template-columns: repeat(3, 1fr);
  }
  .metrics-strip strong {
    font-size: 17px;
  }
  .metrics-strip span {
    font-size: 12px;
  }
  .chart-panel {
    padding: 0 0 20px;
  }
  .chart-canvas {
    height: 230px;
  }
  .holdings-section,
  .backtest-section,
  .activity-section {
    padding: 10px 0 20px;
  }
  .bot-inspector {
    padding: 15px 0;
  }
  .activity-list li {
    grid-template-columns: 85px 35px #{'minmax(0, 1fr)'};
    gap: 6px;
  }
  .session-strip {
    padding: 10px;
  }
  .workspace-empty {
    padding: 50px 8px;
    min-height: 650px;
  }
  .workspace-empty h2 {
    font-size: 26px;
  }
  .empty-modes {
    gap: 18px;
    margin-top: 50px;
  }
  .bot-modal-backdrop {
    padding: 12px;
  }
  .bot-modal {
    padding: 22px;
    max-height: calc(100dvh - 24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .bots-page,
  .bots-top,
  .bots-view-tabs,
  .bot-modal,
  .runtime-strip.running i::after {
    animation: none;
  }
  .bots-page button,
  .bots-view-tabs a,
  .bots-view-tabs a::after,
  .bot-modal button,
  .bots-journey li,
  .strategy-rule-enter-active,
  .strategy-rule-leave-active {
    transition: none;
  }
}
.saved-research {
  margin: 0 24px;
  padding: 14px 0;
  color: var(--bot-muted);
  font-size: 12px;
  line-height: 1.8;
  border-top: 1px solid var(--bot-border);
}
.saved-research h3 {
  margin: 0;
  font-size: inherit;
}
@media (max-width: 1000px) {
  .bots-top {
    flex-wrap: wrap;
    gap: 10px;
  }
  .bots-journey {
    order: 3;
    width: 100%;
  }
}
</style>
