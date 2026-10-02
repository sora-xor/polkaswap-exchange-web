<template>
  <section class="discovery" data-testid="bot-discovery">
    <header class="discovery-heading">
      <div>
        <p class="discovery-kicker">Polkaswap / {{ t('bots.discovery.title') }}</p>
        <h2>{{ t('bots.discovery.title') }}</h2>
        <p>{{ t('bots.discovery.subtitle') }}</p>
      </div>
      <div class="discovery-state" role="status" aria-live="polite">
        <i :class="{ active: running }" aria-hidden="true" />
        <span>{{ statusLabel }}</span>
      </div>
    </header>
    <p v-if="localError" ref="errorAlert" class="discovery-error" role="alert" tabindex="-1">{{ localError }}</p>
    <p v-if="campaignMessage" class="discovery-success" role="status">{{ campaignMessage }}</p>

    <div class="discovery-layout" :class="{ 'is-complete': session?.phase === 'complete' && !holdoutPreflight }">
      <aside
        v-if="session?.phase !== 'complete' || holdoutPreflight"
        class="discovery-controls"
        :aria-label="t('bots.discovery.provider')"
      >
        <section class="discovery-control-group">
          <div class="discovery-group-heading">
            <span>01</span>
            <h3>{{ t('bots.discovery.provider') }}</h3>
          </div>
          <p v-if="session?.provider" class="discovery-saved-provider-inline">
            {{ t('bots.discovery.savedProvider') }} · <strong>{{ savedProviderLabel }}</strong>
          </p>
          <label class="discovery-field discovery-provider-field">
            <span>{{ t('bots.discovery.provider') }}</span>
            <select
              v-model="providerKind"
              data-testid="discovery-provider"
              :disabled="running || busy"
              @change="disconnectAi"
            >
              <option v-for="kind in providerKinds" :key="kind" :value="kind">{{ t(providerLabel(kind)) }}</option>
            </select>
          </label>
          <template v-if="isLocalProvider">
            <p class="discovery-help">{{ t('bots.discovery.localHelp') }}</p>
            <a class="discovery-download" href="./.well-known/polkaswap-codex-companion.mjs" download>
              {{ t('bots.discovery.downloadCompanion') }} ↗
            </a>
            <p class="discovery-help">{{ t('bots.discovery.localSteps') }}</p>
            <label class="discovery-field">
              <span>{{ t('bots.discovery.pairingCode') }}</span>
              <input
                ref="pairInput"
                data-testid="discovery-pair-code"
                autocomplete="off"
                spellcheck="false"
                maxlength="64"
              />
            </label>
          </template>
          <template v-else>
            <label v-if="providerKind === 'custom'" class="discovery-field">
              <span>{{ t('bots.discovery.endpoint') }}</span>
              <input
                v-model.trim="endpoint"
                data-testid="discovery-endpoint"
                type="url"
                autocomplete="off"
                maxlength="2048"
                :disabled="running || busy"
                @input="disconnectAi"
              />
            </label>
            <label class="discovery-field">
              <span>{{ t('bots.discovery.apiKey') }}</span>
              <input
                ref="keyInput"
                data-testid="discovery-api-key"
                type="password"
                autocomplete="off"
                maxlength="1024"
              />
            </label>
          </template>
          <p class="discovery-help">{{ t('bots.discovery.providerCharges') }}</p>
          <label v-if="connected && models.length" class="discovery-field">
            <span>{{ t('bots.discovery.model') }}</span>
            <select v-model="model" data-testid="discovery-model" :disabled="running" @change="selectModel">
              <option v-for="entry in models" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </label>
          <div class="discovery-connection-actions">
            <button v-if="!connected" type="button" data-testid="discovery-connect" :disabled="busy" @click="connectAi">
              {{ t('bots.discovery.connect') }}
            </button>
            <button v-else type="button" data-testid="discovery-disconnect" :disabled="running" @click="disconnectAi">
              {{ t('bots.discovery.disconnect') }}
            </button>
            <span v-if="connected" class="discovery-connected"
              ><i aria-hidden="true" />{{ t('bots.discovery.connected') }}</span
            >
          </div>
        </section>

        <section class="discovery-control-group">
          <div class="discovery-group-heading">
            <span>02</span>
            <h3>{{ t('bots.discovery.idea') }}</h3>
          </div>
          <label class="discovery-field discovery-idea-field">
            <span>{{ t('bots.discovery.idea') }}</span>
            <textarea
              v-model="idea"
              data-testid="discovery-idea"
              :placeholder="t('bots.discovery.ideaPlaceholder')"
              maxlength="500"
              rows="3"
              :disabled="hasSession"
            />
          </label>
          <details class="discovery-advanced" :open="hasSession || undefined">
            <summary>
              {{ t('bots.discovery.researchSettings') }}
              <span>{{
                t('bots.discovery.settingsSummary', {
                  cap: callCap,
                  capital,
                  fee: feeBudgetXor,
                  drawdown: maxDrawdownPercent,
                })
              }}</span>
            </summary>
            <div class="discovery-field-row">
              <label class="discovery-field">
                <span>{{ t('bots.discovery.capital') }}</span>
                <input
                  v-model.trim="capital"
                  data-testid="discovery-capital"
                  inputmode="decimal"
                  maxlength="100"
                  :disabled="hasSession"
                />
              </label>
              <label class="discovery-field">
                <span>{{ t('bots.discovery.feeReserve') }}</span>
                <input
                  v-model.trim="feeBudgetXor"
                  data-testid="discovery-fee-reserve"
                  inputmode="decimal"
                  maxlength="100"
                  :disabled="hasSession"
                />
              </label>
            </div>
            <div class="discovery-field-row">
              <label class="discovery-field">
                <span>{{ t('bots.discovery.callCap') }}</span>
                <input
                  v-model.number="callCap"
                  data-testid="discovery-call-cap"
                  type="number"
                  min="1"
                  max="36"
                  step="1"
                  :disabled="hasSession"
                />
              </label>
              <label class="discovery-field">
                <span>{{ t('bots.discovery.maxDrawdown') }} %</span>
                <input
                  v-model.trim="maxDrawdownPercent"
                  data-testid="discovery-drawdown"
                  inputmode="decimal"
                  maxlength="12"
                  :disabled="hasSession"
                />
              </label>
            </div>
            <p class="discovery-help">{{ t('bots.discovery.capitalNote') }}</p>
            <p class="discovery-help">{{ t('bots.discovery.callCapNote') }}</p>
          </details>
          <div v-if="feedbackOptions.length" class="discovery-feedback">
            <label class="discovery-consent">
              <input
                v-model="feedbackOptIn"
                type="checkbox"
                data-testid="discovery-feedback-opt-in"
                :disabled="hasSession"
              />
              <span>{{ t('bots.discovery.shareLiveFeedback') }}</span>
            </label>
            <label v-if="feedbackOptIn" class="discovery-field">
              <span>{{ t('bots.discovery.feedbackBot') }}</span>
              <select v-model="selectedFeedbackBotId" data-testid="discovery-feedback-bot" :disabled="hasSession">
                <option value="">{{ t('bots.discovery.chooseFeedbackBot') }}</option>
                <option v-for="option in feedbackOptions" :key="option.botId" :value="option.botId">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <p v-if="feedbackOptIn" class="discovery-help">{{ t('bots.discovery.feedbackExploratory') }}</p>
          </div>
          <div class="discovery-run-actions">
            <button
              v-if="!hasSession"
              type="button"
              class="discovery-primary"
              data-testid="discovery-start"
              :disabled="!connected || busy || assets.length < 2 || (feedbackOptIn && !selectedFeedbackBotId)"
              @click="startResearch"
            >
              {{ t('bots.discovery.start') }} <span aria-hidden="true">↗</span>
            </button>
            <button v-else-if="running" type="button" data-testid="discovery-pause" @click="pauseResearch">
              {{ t('bots.discovery.pause') }}
            </button>
            <button
              v-else-if="session?.phase !== 'complete'"
              type="button"
              class="discovery-primary"
              data-testid="discovery-resume"
              :disabled="!connected || busy"
              @click="resumeResearch"
            >
              {{ t('bots.discovery.resume') }} <span aria-hidden="true">↗</span>
            </button>
            <button v-else type="button" data-testid="discovery-new-run" :disabled="busy" @click="newResearch">
              {{ t('bots.discovery.newRun') }}
            </button>
            <button
              v-if="hasSession && !running && session?.phase !== 'complete'"
              type="button"
              data-testid="discovery-new-run"
              :disabled="busy"
              @click="newResearch"
            >
              {{ t('bots.discovery.newRun') }}
            </button>
          </div>
          <div
            v-if="holdoutPreflight"
            class="discovery-decision"
            data-testid="discovery-holdout-preflight"
            role="alert"
          >
            <strong>{{ t('bots.discovery.holdoutPreflightTitle') }}</strong>
            <p>{{ t('bots.discovery.holdoutPreflightNote') }}</p>
            <p v-if="holdoutPreflight.intent === 'new'">{{ t('bots.discovery.holdoutNewNote') }}</p>
            <ul>
              <li v-for="range in holdoutPreflight.ranges" :key="`${range.startAt}-${range.endAt}`">
                {{ formatDate(range.startAt) }} – {{ formatDate(range.endAt) }}
              </li>
            </ul>
            <div class="discovery-decision-actions">
              <button type="button" @click="holdoutPreflight = null">{{ t('bots.discovery.cancelPreflight') }}</button>
              <button
                type="button"
                class="discovery-primary"
                data-testid="discovery-confirm-exploratory"
                @click="confirmHoldoutPreflight"
              >
                {{ t('bots.discovery.continueExploratory') }}
              </button>
            </div>
          </div>
          <div
            v-if="providerSwitchPending"
            class="discovery-decision"
            data-testid="discovery-provider-switch"
            role="alert"
          >
            <strong>{{ t('bots.discovery.providerSwitchTitle') }}</strong>
            <p>
              {{
                t('bots.discovery.providerSwitchNote', { previous: savedProviderLabel, next: connectedProviderLabel })
              }}
            </p>
            <div class="discovery-decision-actions">
              <button type="button" @click="providerSwitchPending = false">
                {{ t('bots.discovery.cancelPreflight') }}
              </button>
              <button
                type="button"
                class="discovery-primary"
                data-testid="discovery-confirm-provider-switch"
                :disabled="!connected || busy"
                @click="confirmProviderSwitch"
              >
                {{ t('bots.discovery.continueWithProvider') }}
              </button>
            </div>
          </div>
          <p v-else-if="holdoutAcknowledged?.key === currentWindowKey && !session" class="discovery-holdout-reuse">
            {{ t('bots.discovery.holdoutReused') }}
          </p>
        </section>
        <p class="discovery-runtime-note">{{ t('bots.discovery.tabNote') }}</p>
      </aside>

      <div class="discovery-workspace">
        <div v-if="session?.phase === 'complete'" class="discovery-complete-toolbar">
          <span>{{ t('bots.discovery.complete') }}</span>
          <button
            v-if="session.finalists.length"
            type="button"
            data-testid="discovery-new-run"
            :disabled="busy"
            @click="newResearch"
          >
            {{ t('bots.discovery.newRun') }} ↗
          </button>
        </div>
        <DiscoveryNoQualified
          v-if="session"
          :session="session"
          :pair-title="pairTitle"
          @new-run="newResearch"
          @inspect-skips="openSkippedPairs"
        />
        <section
          v-if="session"
          class="discovery-progress"
          data-testid="discovery-progress"
          :class="{ 'is-active': running }"
        >
          <div class="discovery-progress-head">
            <div>
              <span class="discovery-overline">{{ t('bots.discovery.screened') }}</span
              ><strong
                >{{ pairCounts.ready + pairCounts.skipped }}<small> / {{ pairCounts.total }}</small></strong
              >
            </div>
            <div>
              <span class="discovery-overline">{{ t('bots.discovery.covered') }}</span
              ><strong>{{ pairCounts.ready }}</strong>
            </div>
            <div>
              <span class="discovery-overline">{{ t('bots.discovery.requests') }}</span
              ><strong
                >{{ session?.callsUsed ?? 0 }}<small> / {{ session?.callCap ?? callCap }}</small></strong
              >
            </div>
          </div>
          <div
            class="discovery-progress-track"
            role="progressbar"
            :aria-label="t('bots.discovery.screened')"
            :aria-valuemin="0"
            :aria-valuemax="Math.max(pairCounts.total, 1)"
            :aria-valuenow="pairCounts.ready + pairCounts.skipped"
          >
            <span :style="{ width: `${pairProgress}%` }" />
          </div>
          <div class="discovery-progress-foot">
            <span>{{ t('bots.discovery.period') }}</span
            ><span>{{ t('bots.discovery.skipped') }} {{ pairCounts.skipped }}</span>
          </div>
          <p v-if="session?.holdoutReuse" class="discovery-holdout-reuse">{{ t('bots.discovery.holdoutReused') }}</p>
          <div class="discovery-progress-detail">
            <p v-if="session.provider" data-testid="discovery-saved-provider">
              {{ t('bots.discovery.savedProvider') }}
              <strong>{{ savedProviderLabel }}</strong>
            </p>
            <p v-if="session.researchProgress" data-testid="discovery-current-stage">
              {{ t(`bots.discovery.stage.${session.researchProgress.stage}`) }} ·
              <strong>{{ pairTitle(session.researchProgress.pairKey) }}</strong>
            </p>
            <p v-if="nextRequestSeconds > 0">{{ t('bots.discovery.nextRequest', { seconds: nextRequestSeconds }) }}</p>
            <p>
              {{
                t('bots.discovery.requestProgress', {
                  remaining: Math.max(0, session.callCap - session.callsUsed),
                  failed: session.failedCalls,
                })
              }}
            </p>
          </div>
        </section>

        <DiscoveryVisuals
          :session="session"
          :directed-market-count="pairCounts.total"
          :preflight-exploratory="!!holdoutPreflight || holdoutAcknowledged?.key === currentWindowKey"
          :focused-candidate-id="focusedCandidateId"
          :strategy-name="strategyName"
          :strategy-summary="strategySummary"
          @focus-candidate="focusCandidateFromPlot"
          @view-candidate="viewCandidateFromPlot"
        />

        <section v-if="campaigns.length" class="discovery-live" data-testid="discovery-live">
          <div class="discovery-live-heading">
            <div>
              <span class="discovery-overline">{{ t('bots.discovery.liveCampaigns') }}</span>
              <h3>{{ t('bots.discovery.liveCampaigns') }}</h3>
            </div>
            <span>{{ campaigns.length }}</span>
          </div>
          <article v-for="campaign in campaigns" :key="campaign.id" class="discovery-live-campaign">
            <header>
              <strong>{{ t('bots.discovery.campaign') }} {{ campaign.id.slice(0, 8) }}</strong>
              <span :class="campaign.status">{{ campaignStatus(campaign.status) }}</span>
            </header>
            <div class="discovery-live-members">
              <div v-for="id in campaign.botIds" :key="id" class="discovery-live-member">
                <div>
                  <strong>{{ campaignBotTitle(id) }}</strong>
                  <span>{{ outcomeLabel(campaign.progress[id].outcome) }}</span>
                </div>
                <div class="discovery-live-performance">
                  <span
                    >{{ t('bots.discovery.markedReturn') }} · {{ campaignBotOutput(id) }}
                    <strong>{{ markedReturn(campaign.progress[id]) }}%</strong></span
                  >
                  <span
                    >{{ t('bots.discovery.excess') }} <strong>{{ markedExcess(campaign.progress[id]) }}%</strong></span
                  >
                </div>
                <DiscoveryCampaignProgress :progress="campaign.progress[id]" />
              </div>
            </div>
            <div v-if="campaign.status === 'running'" class="discovery-live-actions">
              <button type="button" :disabled="busy" @click="pauseLiveCampaign(campaign.id)">
                {{ t('bots.discovery.pauseCampaign') }}
              </button>
            </div>
            <div
              v-else-if="campaign.status === 'paused' && hasActiveCampaignBot(campaign)"
              class="discovery-live-actions"
            >
              <button
                v-if="walletConnected && !externalWallet"
                type="button"
                :disabled="busy"
                @click="prepareCampaignResume(campaign.id)"
              >
                {{ t('bots.discovery.reviewResume') }}
              </button>
              <template v-else>
                <span class="discovery-resume-requirement">{{
                  t(walletConnected ? 'bots.discovery.externalWallet' : 'bots.discovery.walletRequired')
                }}</span>
                <button v-if="!walletConnected" type="button" @click="emit('wallet')">
                  {{ t('bots.connectWallet') }}
                </button>
              </template>
            </div>
            <div v-if="campaign.status !== 'running' && campaign.status !== 'closed'" class="discovery-live-actions">
              <button
                v-if="closingCampaignId !== campaign.id"
                type="button"
                :disabled="busy"
                @click="closingCampaignId = campaign.id"
              >
                {{ t('bots.discovery.closeCampaign') }}
              </button>
            </div>
            <div
              v-if="closingCampaignId === campaign.id"
              class="discovery-close-confirm"
              data-testid="discovery-close-confirm"
            >
              <p>{{ t('bots.discovery.closeNote') }}</p>
              <button type="button" :disabled="busy" @click="closingCampaignId = null">
                {{ t('bots.discovery.cancelClose') }}
              </button>
              <button
                type="button"
                :disabled="busy"
                data-testid="discovery-confirm-close"
                @click="closeLiveCampaign(campaign.id)"
              >
                {{ t('bots.discovery.confirmClose') }}
              </button>
            </div>
            <div
              v-if="resumeReview?.id === campaign.id"
              class="discovery-resume-review"
              data-testid="discovery-resume-review"
            >
              <DiscoveryReviewExpiry
                :expires-at="resumeIdentity ? resumeReview.expiresAt : 0"
                :label="t('bots.discovery.reviewExpires')"
                :expired-label="t('bots.discovery.reviewExpired')"
                :refresh-label="t('bots.discovery.refreshReview')"
                :disabled="busy"
                @refresh="prepareCampaignResume(campaign.id)"
              />
              <p>{{ t('bots.discovery.resumeNote') }}</p>
              <p>
                {{ t('bots.discovery.finalizedBlock') }} <strong>#{{ resumeReview.mark.blockNumber }}</strong>
              </p>
              <p>
                {{ t('bots.discovery.committedCap') }}
                <strong>{{ fromCodec(resumeReview.campaign.committedXorCodec, XOR.decimals) }} XOR</strong>
              </p>
              <p class="discovery-network">
                {{ t('bots.discovery.network') }} <code>{{ resumeReview.campaign.network }}</code>
              </p>
              <div class="discovery-verified-bots">
                <article v-for="bot in resumeReview.bots" :key="bot.id">
                  <strong>{{ bot.assetIn.symbol }} → {{ bot.assetOut.symbol }}</strong>
                  <code>{{ bot.assetIn.address }} → {{ bot.assetOut.address }}</code>
                  <p>{{ strategySummary(bot.strategy) }}</p>
                  <span>{{ t('bots.discovery.allocation') }} {{ allocationFor(bot) }} {{ bot.assetIn.symbol }}</span>
                  <span
                    >{{ t('bots.discovery.orderLimit') }}
                    {{ fromCodec(bot.policy.maxTradeCodec[bot.assetIn.address], bot.assetIn.decimals) }}
                    {{ bot.assetIn.symbol }}</span
                  >
                  <span
                    >{{ t('bots.discovery.sellOrderLimit') }}
                    {{ fromCodec(bot.policy.maxTradeCodec[bot.assetOut.address], bot.assetOut.decimals) }}
                    {{ bot.assetOut.symbol }}</span
                  >
                  <span
                    >{{ t('bots.discovery.feeReserve') }}
                    {{ fromCodec(bot.policy.feeBudgetCodec, XOR.decimals) }} XOR</span
                  >
                  <span
                    >{{ t('bots.discovery.maxDrawdown') }}
                    {{ resumeReview.campaign.progress[bot.id].maxDrawdownPercent }}%</span
                  >
                </article>
              </div>
              <ul>
                <li v-for="item in resumeReview.funding.assets" :key="item.asset.address">
                  <strong>{{ item.asset.symbol }}</strong>
                  <span
                    >{{ t('bots.discovery.required') }} {{ fromCodec(item.requiredCodec, item.asset.decimals) }}</span
                  >
                  <span
                    >{{ t('bots.discovery.available') }} {{ fromCodec(item.availableCodec, item.asset.decimals) }}</span
                  >
                </li>
              </ul>
              <p v-if="!resumeReview.funding.sufficient" class="discovery-funding-short">
                {{ t('bots.errors.balance') }}
              </p>
              <template v-else-if="resumeIdentity && resumeReview.expiresAt > reviewNow">
                <label class="discovery-consent"
                  ><input v-model="resumeConsented" type="checkbox" /><span>{{
                    t('bots.discovery.resumeConsent')
                  }}</span></label
                >
                <label class="discovery-field"
                  ><span>{{ t('bots.discovery.walletPassword') }}</span
                  ><input ref="resumePasswordInput" type="password" autocomplete="off"
                /></label>
                <button
                  type="button"
                  class="discovery-primary"
                  data-testid="discovery-resume-authorize"
                  :disabled="busy || !resumeConsented || !resumeIdentity || resumeReview.expiresAt <= reviewNow"
                  @click="authorizeCampaignResume"
                >
                  {{ t('bots.discovery.unlockResume') }} →
                </button>
              </template>
            </div>
          </article>
        </section>

        <div
          v-if="session && (session.candidates.length || session.phase !== 'complete')"
          class="discovery-results-heading"
        >
          <div>
            <span class="discovery-overline"
              >{{ t('bots.discovery.training') }} → {{ t('bots.discovery.holdout') }}</span
            >
            <h3>{{ t('bots.discovery.candidates') }}</h3>
          </div>
          <span v-if="session" id="discovery-selection-count" class="discovery-selection-count">{{
            t('bots.discovery.selectedCount', { count: selectedIds.length })
          }}</span>
        </div>
        <p v-if="session?.candidates.length" class="discovery-ranking-note">
          {{ t('bots.discovery.rankingBasis') }}
        </p>
        <p v-if="session?.candidates.length" class="discovery-fee-assumption" role="note">
          <span aria-hidden="true">◇</span>{{ t('bots.discovery.sourceNote') }}
        </p>
        <div
          v-if="session && !session.candidates.length && session.phase !== 'complete'"
          class="discovery-empty"
          data-testid="discovery-empty"
        >
          <div class="discovery-empty-orbit" aria-hidden="true"><i /><i /><i /></div>
          <p>{{ t('bots.discovery.noCandidates') }}</p>
        </div>
        <ol
          v-else-if="session?.candidates.length"
          ref="candidateList"
          class="discovery-candidates"
          data-testid="discovery-candidates"
        >
          <li
            v-for="(candidate, index) in visibleCandidates"
            :key="candidate.id"
            class="discovery-candidate"
            :data-candidate-id="candidate.id"
            tabindex="-1"
            :class="{
              'is-selected': selectedIds.includes(candidate.id),
              'is-qualified': candidate.status === 'qualified',
              'is-focused': focusedCandidateId === candidate.id,
            }"
            :style="{ '--candidate-delay': `${Math.min(index, 7) * 55}ms` }"
          >
            <button
              type="button"
              class="discovery-candidate-select"
              :aria-label="`${t('bots.discovery.selectCandidate')} · ${pairTitle(candidate.pairKey)} · ${strategyName(candidate.strategy.kind)}`"
              :aria-describedby="`discovery-candidate-status-${candidate.id}${
                selectedIds.length >= 3 && !selectedIds.includes(candidate.id) ? ' discovery-selection-count' : ''
              }`"
              :aria-pressed="selectedIds.includes(candidate.id)"
              :disabled="
                candidate.status !== 'qualified' || (selectedIds.length >= 3 && !selectedIds.includes(candidate.id))
              "
              @click="toggleCandidate(candidate.id)"
            >
              <span>{{ selectedIds.includes(candidate.id) ? '✓' : '+' }}</span>
            </button>
            <div class="discovery-candidate-main">
              <div class="discovery-candidate-line">
                <span class="discovery-rank">{{ String(index + 1).padStart(2, '0') }}</span
                ><strong>{{ pairTitle(candidate.pairKey) }}</strong
                ><span class="discovery-method">{{ strategyName(candidate.strategy.kind) }}</span>
                <span class="discovery-request-number"
                  >{{ t('bots.discovery.requestNumber') }} {{ candidate.callNumber }}</span
                >
              </div>
              <p v-if="candidate.strategy.kind !== 'rules'" class="discovery-candidate-rule">
                {{ strategySummary(candidate.strategy) }}
              </p>
              <div v-else-if="candidate.strategy.rules" class="discovery-rule-breakdown">
                <span>{{ strategyBasics(candidate.strategy) }}</span>
                <p>
                  <strong>{{ t('bots.rules.entry') }}</strong
                  >{{ ruleGroupSummary(candidate.strategy.rules.entry) }}
                </p>
                <p v-if="candidate.strategy.rules.exit">
                  <strong>{{ t('bots.rules.exit') }}</strong
                  >{{ ruleGroupSummary(candidate.strategy.rules.exit) }}
                </p>
              </div>
              <div class="discovery-candidate-metrics">
                <div
                  class="discovery-candidate-net"
                  :class="{ 'is-loss': isNegativePercent(candidate.training.returnPercent) }"
                >
                  <span>{{ t('bots.discovery.afterCostReturn') }}</span
                  ><strong :title="`${candidate.training.returnPercent}%`">{{
                    percentOrDash(candidate.training.returnPercent)
                  }}</strong>
                </div>
                <div>
                  <span>{{ t('bots.discovery.excess') }}</span
                  ><strong :title="exactPercentTitle(candidate.training.excessReturnPercent)">{{
                    percentOrDash(candidate.training.excessReturnPercent)
                  }}</strong>
                </div>
                <div>
                  <span>{{ t('bots.discovery.trades') }}</span
                  ><strong>{{ candidate.training.trades }}</strong>
                </div>
                <div>
                  <span>{{ t('bots.discovery.drawdown') }}</span
                  ><strong :title="`${candidate.training.drawdownPercent}%`">{{
                    percentOrDash(candidate.training.drawdownPercent)
                  }}</strong>
                </div>
              </div>
              <p
                v-if="
                  isNegativePercent(candidate.training.returnPercent) &&
                  isPositivePercent(candidate.training.excessReturnPercent)
                "
                class="discovery-candidate-interpretation"
              >
                {{ t('bots.discovery.lessLossThanHolding') }}
              </p>
              <div v-if="candidate.holdoutState === 'complete' && candidate.holdout" class="discovery-holdout">
                <span>{{ t('bots.discovery.holdout') }}</span
                ><strong :title="`${candidate.holdout.returnPercent}%`">{{
                  percentOrDash(candidate.holdout.returnPercent)
                }}</strong
                ><span :title="exactPercentTitle(candidate.holdout.excessReturnPercent)"
                  >{{ t('bots.discovery.excess') }} {{ percentOrDash(candidate.holdout.excessReturnPercent) }}</span
                ><span>{{ candidate.holdout.trades }} {{ t('bots.discovery.trades') }}</span>
              </div>
              <p v-if="candidate.reason" class="discovery-candidate-reason">{{ candidateReason(candidate) }}</p>
            </div>
            <span
              :id="`discovery-candidate-status-${candidate.id}`"
              class="discovery-candidate-status"
              :class="candidate.status"
              >{{ candidateStatus(candidate) }}</span
            >
          </li>
        </ol>
        <p v-if="session && !session.candidates.length && session.phase !== 'complete'" class="discovery-source-note">
          {{ t('bots.discovery.sourceNote') }}
        </p>

        <details
          v-if="pairCounts.skipped"
          ref="skippedPairDetails"
          class="discovery-skipped"
          data-testid="discovery-skips"
        >
          <summary>
            {{ t('bots.discovery.skipReasons') }} <span>{{ pairCounts.skipped }}</span>
          </summary>
          <ul>
            <li v-for="pair in skippedPairs" :key="pair.key">
              <strong>{{ pairTitle(pair.key) }}</strong
              ><span>{{ skippedReason(pair.reason) }}</span>
              <span
                >{{ t('bots.discovery.coverage') }}
                {{ pair.coverage === undefined ? '—' : `${Math.floor(pair.coverage * 100)}%` }}</span
              >
            </li>
          </ul>
        </details>

        <DiscoveryFinalistCompare
          v-if="selectedFinalists.length && !reviewOpen"
          :finalists="selectedFinalists"
          :pair-title="pairTitle"
          :strategy-name="strategyName"
          :strategy-summary="strategySummary"
        />
        <p v-if="selectedFinalists.length && !reviewOpen" class="discovery-source-note">
          {{ t('bots.discovery.sourceNote') }}
        </p>
        <div v-if="selectedFinalists.length && !reviewOpen" class="discovery-review-entry">
          <span>{{ t('bots.discovery.selectedCount', { count: selectedIds.length }) }}</span>
          <button type="button" class="discovery-primary" data-testid="discovery-review" @click="reviewOpen = true">
            {{ t('bots.discovery.review') }} →
          </button>
        </div>
        <section
          v-if="reviewOpen"
          class="discovery-review"
          data-testid="discovery-review"
          :aria-label="t('bots.discovery.reviewTitle')"
        >
          <div class="discovery-review-heading">
            <div>
              <span class="discovery-overline">03 / {{ t('bots.discovery.review') }}</span>
              <h3>{{ t('bots.discovery.reviewTitle') }}</h3>
              <p>{{ t('bots.discovery.reviewNote') }}</p>
            </div>
            <button type="button" @click="reviewOpen = false">{{ t('bots.discovery.cancelReview') }}</button>
          </div>
          <div class="discovery-review-items">
            <article v-for="candidate in selectedFinalists" :key="candidate.id" class="discovery-review-item">
              <header>
                <strong>{{ pairTitle(candidate.pairKey) }}</strong
                ><span>{{ strategyName(candidate.strategy.kind) }}</span>
              </header>
              <code class="discovery-pair-addresses"
                >{{ candidate.template.assetIn.address }} → {{ candidate.template.assetOut.address }}</code
              >
              <div class="discovery-review-rule">
                <strong>{{ strategySummary(candidate.strategy) }}</strong>
                <p v-if="candidate.strategy.kind === 'rules' && candidate.strategy.rules">
                  {{ rulesSummary(candidate.strategy.rules) }}
                </p>
              </div>
              <div class="discovery-review-fields">
                <div class="discovery-fixed-value">
                  <span>{{ t('bots.discovery.allocation') }} · {{ candidate.template.assetIn.symbol }}</span
                  ><strong>{{ reviewInputs[candidate.id].allocation }}</strong>
                </div>
                <div class="discovery-fixed-value">
                  <span>{{ t('bots.discovery.orderLimit') }} · {{ candidate.template.assetIn.symbol }}</span
                  ><strong>{{ reviewInputs[candidate.id].orderLimit }}</strong>
                </div>
                <div class="discovery-fixed-value">
                  <span>{{ t('bots.discovery.feeReserve') }}</span
                  ><strong>{{ reviewInputs[candidate.id].feeBudgetXor }} XOR</strong>
                </div>
                <label
                  ><span>{{ t('bots.discovery.maxDrawdown') }} %</span
                  ><input
                    v-model.trim="reviewInputs[candidate.id].maxDrawdownPercent"
                    inputmode="decimal"
                    maxlength="12"
                /></label>
              </div>
              <p class="discovery-fixed-note">{{ t('bots.discovery.limitsFrozen') }}</p>
              <p class="discovery-output-token">
                {{ t('bots.discovery.outputToken') }} <strong>{{ candidate.template.assetOut.symbol }}</strong>
                <span
                  >{{ t('bots.discovery.sellOrderLimit') }}
                  {{
                    fromCodec(
                      candidate.template.policy.maxTradeCodec[candidate.template.assetOut.address],
                      candidate.template.assetOut.decimals
                    )
                  }}
                  {{ candidate.template.assetOut.symbol }}</span
                >
              </p>
            </article>
          </div>
          <div class="discovery-review-final">
            <label class="discovery-field"
              ><span>{{ t('bots.discovery.sharedCap') }}</span
              ><input
                v-model.trim="sharedCapXor"
                data-testid="discovery-shared-cap"
                inputmode="decimal"
                maxlength="100"
            /></label>
            <p>{{ t('bots.discovery.sharedCapNote') }}</p>
            <p>{{ t('bots.discovery.capCheckNote') }}</p>
            <p>{{ t('bots.discovery.goal') }}</p>
            <p v-if="!walletConnected">{{ t('bots.discovery.walletRequired') }}</p>
            <p v-else-if="externalWallet">{{ t('bots.discovery.externalWallet') }}</p>
            <button v-if="!walletConnected" type="button" data-testid="discovery-wallet" @click="emit('wallet')">
              {{ t('bots.connectWallet') }}
            </button>
            <template v-else-if="!externalWallet">
              <button type="button" data-testid="discovery-check" :disabled="busy" @click="prepareCampaign">
                {{ t('bots.discovery.checkCampaign') }}
              </button>
              <DiscoveryReviewExpiry
                v-if="preparedReview"
                :expires-at="preparedFingerprint ? preparedReview.expiresAt : 0"
                :label="t('bots.discovery.reviewExpires')"
                :expired-label="t('bots.discovery.reviewExpired')"
                :refresh-label="t('bots.discovery.refreshReview')"
                :disabled="busy"
                @refresh="prepareCampaign"
              />
              <div v-if="preparedReview" class="discovery-review-evidence" data-testid="discovery-funding">
                <p>
                  {{ t('bots.discovery.finalizedBlock') }} <strong>#{{ preparedReview.mark.blockNumber }}</strong>
                </p>
                <p>
                  {{ t('bots.discovery.committedCap') }}
                  <strong>{{ fromCodec(preparedReview.campaign.committedXorCodec, XOR.decimals) }} XOR</strong>
                </p>
                <p class="discovery-network">
                  {{ t('bots.discovery.network') }} <code>{{ preparedReview.campaign.network }}</code>
                </p>
                <div class="discovery-verified-bots">
                  <article v-for="bot in preparedReview.bots" :key="bot.id">
                    <strong>{{ bot.assetIn.symbol }} → {{ bot.assetOut.symbol }}</strong>
                    <code>{{ bot.assetIn.address }} → {{ bot.assetOut.address }}</code>
                    <p>{{ strategySummary(bot.strategy) }}</p>
                    <span>{{ t('bots.discovery.allocation') }} {{ allocationFor(bot) }} {{ bot.assetIn.symbol }}</span>
                    <span
                      >{{ t('bots.discovery.orderLimit') }}
                      {{ fromCodec(bot.policy.maxTradeCodec[bot.assetIn.address], bot.assetIn.decimals) }}
                      {{ bot.assetIn.symbol }}</span
                    >
                    <span
                      >{{ t('bots.discovery.sellOrderLimit') }}
                      {{ fromCodec(bot.policy.maxTradeCodec[bot.assetOut.address], bot.assetOut.decimals) }}
                      {{ bot.assetOut.symbol }}</span
                    >
                    <span
                      >{{ t('bots.discovery.feeReserve') }}
                      {{ fromCodec(bot.policy.feeBudgetCodec, XOR.decimals) }} XOR</span
                    >
                    <span
                      >{{ t('bots.discovery.maxDrawdown') }}
                      {{ preparedReview.campaign.progress[bot.id].maxDrawdownPercent }}%</span
                    >
                  </article>
                </div>
                <ul>
                  <li v-for="item in preparedReview.funding.assets" :key="item.asset.address">
                    <strong>{{ item.asset.symbol }}</strong>
                    <span
                      >{{ t('bots.discovery.required') }} {{ fromCodec(item.requiredCodec, item.asset.decimals) }}</span
                    >
                    <span
                      >{{ t('bots.discovery.available') }}
                      {{ fromCodec(item.availableCodec, item.asset.decimals) }}</span
                    >
                  </li>
                </ul>
                <p v-if="!preparedReview.funding.sufficient" class="discovery-funding-short">
                  {{ t('bots.errors.balance') }}
                </p>
              </div>
              <label
                v-if="preparedReview?.funding.sufficient && preparedFingerprint && preparedReview.expiresAt > reviewNow"
                class="discovery-consent"
                ><input v-model="consented" type="checkbox" data-testid="discovery-consent" /><span>{{
                  t('bots.discovery.consent')
                }}</span></label
              >
              <label
                v-if="preparedReview?.funding.sufficient && preparedFingerprint && preparedReview.expiresAt > reviewNow"
                class="discovery-field"
                ><span>{{ t('bots.discovery.walletPassword') }}</span
                ><input ref="passwordInput" type="password" autocomplete="off" data-testid="discovery-password"
              /></label>
              <button
                v-if="preparedReview?.funding.sufficient && preparedFingerprint && preparedReview.expiresAt > reviewNow"
                type="button"
                class="discovery-primary"
                data-testid="discovery-authorize"
                :disabled="!consented || busy || !preparedFingerprint || preparedReview.expiresAt <= reviewNow"
                @click="authorizeCampaign"
              >
                {{ t('bots.discovery.authorize') }} →
              </button>
            </template>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';
import { formatExperimentPercent } from '../experiment-visuals';
import DiscoveryCampaignProgress from './DiscoveryCampaignProgress.vue';
import DiscoveryFinalistCompare from './DiscoveryFinalistCompare.vue';
import DiscoveryNoQualified from './DiscoveryNoQualified.vue';
import DiscoveryReviewExpiry from './DiscoveryReviewExpiry.vue';
import DiscoveryVisuals from './DiscoveryVisuals.vue';
import { codec, fromCodec } from '../amounts';
import { validateBotEndpoint } from '../ai';
import type { DiscoveryCampaign } from '../campaign';
import { summarizeDiscoveryLiveFeedback } from '../discovery-live-feedback';
import {
  createDiscoveryEngine,
  createDiscoveryWindow,
  discoveryNextRequestAt,
  rankDiscoveryCandidates,
  type DiscoveryCandidate,
  type DiscoveryFinalist,
  type DiscoveryPair,
  type DiscoverySession,
} from '../discovery';
import {
  createIndexedDbDiscoveryStore,
  loadDiscoverySession,
  type DiscoveryHoldoutOverlap,
} from '../discovery-storage';
import { createDiscoveryProvider, type DiscoveryProvider, type DiscoveryProviderKind } from '../discovery-provider';
import type { DiscoveryApproval } from '../discovery-approval';
import type { DiscoveryCampaignReview } from '../controller';
import type { BotAiModel } from '../ai-models';
import type { ResearchSettings } from '../research';
import type { ResearchFeeSnapshot } from '../research-fees';
import type { StrategyRules } from '../strategy-rules';
import type { BotAsset, BotDefinition, BotHistory, BotOrder, StrategyConfig } from '../types';

defineOptions({ name: 'BotDiscovery' });

const props = defineProps<{
  assets: BotAsset[];
  loadHistory: (bot: BotDefinition, settings: ResearchSettings) => Promise<BotHistory>;
  loadFees: (bot: BotDefinition, settings: ResearchSettings) => Promise<ResearchFeeSnapshot>;
  walletConnected: boolean;
  externalWallet: boolean;
  walletIdentity: string;
  campaigns: DiscoveryCampaign[];
  campaignBots: BotDefinition[];
  prepare: (approval: Omit<DiscoveryApproval, 'password'>) => Promise<DiscoveryCampaignReview>;
  authorize: (reviewId: string, password: string) => Promise<void>;
  prepareResume: (campaignId: string) => Promise<DiscoveryCampaignReview>;
  pauseCampaign: (campaignId: string) => Promise<void>;
  closeCampaign: (campaignId: string) => Promise<void>;
  readCampaignOrders: (campaignId: string) => Promise<BotOrder[]>;
}>();
const emit = defineEmits<{ wallet: [] }>();
const { t } = useTranslation();

const providerKinds: DiscoveryProviderKind[] = ['claude', 'openai', 'codex', 'claude-code', 'jev', 'custom'];
const providerKind = ref<DiscoveryProviderKind>('claude');
const keyInput = ref<HTMLInputElement | null>(null);
const pairInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);
const endpoint = ref('');
const connectedEndpointHost = ref('');
const model = ref('');
const models = ref<BotAiModel[]>([]);
const connected = ref(false);
const busy = ref(false);
const running = ref(false);
const localError = ref('');
const campaignMessage = ref('');
const idea = ref('');
const capital = ref('100');
const feeBudgetXor = ref('1');
const callCap = ref(12);
const maxDrawdownPercent = ref('5');
const feedbackOptIn = ref(false);
const selectedFeedbackBotId = ref('');
const session = ref<DiscoverySession | null>(null);
const selectedIds = ref<string[]>([]);
const reviewOpen = ref(false);
const sharedCapXor = ref('');
const consented = ref(false);
const preparedReview = ref<DiscoveryCampaignReview | null>(null);
const resumeReview = ref<DiscoveryCampaignReview | null>(null);
const resumeConsented = ref(false);
const resumePasswordInput = ref<HTMLInputElement | HTMLInputElement[] | null>(null);
const closingCampaignId = ref<string | null>(null);
const candidateList = ref<HTMLOListElement | null>(null);
const skippedPairDetails = ref<HTMLDetailsElement | null>(null);
const errorAlert = ref<HTMLElement | null>(null);
const focusedCandidateId = ref<string | null>(null);
const reviewInputs = reactive<DiscoveryApproval['values']>({});
const holdoutPreflight = ref<{ intent: 'start' | 'new'; windowKey: string; ranges: DiscoveryHoldoutOverlap[] } | null>(
  null
);
const holdoutAcknowledged = ref<{ key: string; ranges: DiscoveryHoldoutOverlap[] } | null>(null);
const providerSwitchPending = ref(false);
const reviewNow = ref(Date.now());
let client: DiscoveryProvider | null = null;
let engine: ReturnType<typeof createDiscoveryEngine> | null = null;
let sequence = 0;
let mounted = false;
let preparedFingerprint: string | null = null;
let resumeIdentity: string | null = null;
let reviewClock: ReturnType<typeof setInterval> | undefined;

const isLocalProvider = computed(() => providerKind.value === 'codex' || providerKind.value === 'claude-code');
const hasSession = computed(() => session.value !== null);
const pairCounts = computed(() => ({
  total: session.value?.pairs.length ?? props.assets.length * Math.max(0, props.assets.length - 1),
  ready: session.value?.pairs.filter((pair) => pair.status === 'ready').length ?? 0,
  skipped: session.value?.pairs.filter((pair) => pair.status === 'skipped').length ?? 0,
}));
const pairProgress = computed(() =>
  pairCounts.value.total
    ? Math.round(((pairCounts.value.ready + pairCounts.value.skipped) * 100) / pairCounts.value.total)
    : 0
);
const skippedPairs = computed(() => session.value?.pairs.filter((pair) => pair.status === 'skipped') ?? []);
const visibleCandidates = computed(() => rankDiscoveryCandidates(session.value?.candidates ?? []));
const selectedFinalists = computed(() => {
  const finalists = session.value?.finalists ?? [];
  return selectedIds.value.flatMap((id) => {
    const finalist = finalists.find((candidate) => candidate.id === id);
    return finalist ? [finalist] : [];
  });
});
const feedbackOptions = computed(() =>
  props.campaigns.flatMap((campaign) =>
    campaign.botIds
      .filter((id) => campaign.progress[id]?.successfulSwaps > 0)
      .map((botId) => ({ botId, label: `${campaignBotTitle(botId)} · ${campaign.progress[botId].successfulSwaps}` }))
  )
);
const savedProviderLabel = computed(() => {
  const saved = session.value?.provider;
  return saved
    ? `${t(providerLabel(saved.kind))}${saved.endpointHost ? ` · ${saved.endpointHost}` : ''}${saved.model ? ` · ${saved.model}` : ''}`
    : '';
});
const connectedProviderLabel = computed(
  () =>
    `${t(providerLabel(providerKind.value))}${connectedEndpointHost.value ? ` · ${connectedEndpointHost.value}` : ''}${model.value ? ` · ${model.value}` : ''}`
);
const providerChanged = computed(() => {
  const saved = session.value?.provider;
  return (
    !!saved &&
    (saved.kind !== providerKind.value ||
      (saved.model ?? '') !== model.value ||
      (saved.kind === 'custom' && (saved.endpointHost ?? '') !== connectedEndpointHost.value))
  );
});
const currentWindowKey = computed(() => {
  const window = createDiscoveryWindow(reviewNow.value);
  return `${window.holdoutStartAt}-${window.endAt}`;
});
const nextRequestAt = computed(() =>
  session.value && running.value ? discoveryNextRequestAt(session.value, reviewNow.value) : null
);
const nextRequestSeconds = computed(() =>
  nextRequestAt.value === null ? 0 : Math.max(0, Math.ceil((nextRequestAt.value - reviewNow.value) / 1000))
);
const statusLabel = computed(() => {
  if (!session.value) return t(connected.value ? 'bots.discovery.ready' : 'bots.discovery.connect');
  if (!connected.value && session.value.phase !== 'complete') return t('bots.discovery.paused');
  switch (session.value.status) {
    case 'scanning':
      return t('bots.discovery.scanning');
    case 'researching':
    case 'finalizing':
      return t('bots.discovery.running');
    case 'complete':
      return t('bots.discovery.complete');
    case 'paused':
      return t('bots.discovery.paused');
    case 'error':
      return t('bots.discovery.error');
    default:
      return t('bots.discovery.ready');
  }
});

function campaignStatus(status: DiscoveryCampaign['status']): string {
  return t(`bots.discovery.campaignStatus.${status}`);
}

function outcomeLabel(outcome: DiscoveryCampaign['progress'][string]['outcome']): string {
  return t(`bots.discovery.outcome.${outcome}`);
}

function campaignBotTitle(id: string): string {
  const bot = props.campaignBots.find((entry) => entry.id === id);
  return bot ? `${bot.assetIn.symbol} → ${bot.assetOut.symbol}` : id.slice(0, 8);
}

function campaignBotOutput(id: string): string {
  return props.campaignBots.find((entry) => entry.id === id)?.assetOut.symbol ?? '?';
}

function hasActiveCampaignBot(campaign: DiscoveryCampaign): boolean {
  return campaign.botIds.some((id) => campaign.progress[id]?.outcome === 'active');
}

/** Render a percent to two decimals while retaining the sign of sub-basis-point returns. */
function ratioPercent(numerator: bigint, denominator: bigint): string {
  if (denominator <= 0n) return '—';
  const basisPoints = (numerator * 10_000n) / denominator;
  if (basisPoints === 0n && numerator !== 0n) return numerator < 0n ? '-<0.01' : '<0.01';
  const absolute = basisPoints < 0n ? -basisPoints : basisPoints;
  return `${basisPoints < 0n ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

function markedReturn(progress: DiscoveryCampaign['progress'][string]): string {
  const opened = codec(progress.openedOutputCodec);
  return ratioPercent(codec(progress.latestOutputCodec) - opened, opened);
}

function markedExcess(progress: DiscoveryCampaign['progress'][string]): string {
  return ratioPercent(
    codec(progress.latestOutputCodec) - codec(progress.benchmarkOutputCodec),
    codec(progress.openedOutputCodec)
  );
}

/** Remove the separate XOR fee reserve from the reviewed input allocation. */
function allocationFor(bot: BotDefinition): string {
  const initial = codec(bot.portfolio.initial[bot.assetIn.address] ?? '0');
  const fee = bot.assetIn.address === XOR.address ? codec(bot.policy.feeBudgetCodec) : 0n;
  return fromCodec((initial - fee).toString(), bot.assetIn.decimals);
}

/** Show only app-owned messages; provider bodies, keys, and raw exceptions never enter the page. */
function errorText(failure: unknown): string {
  const key = failure instanceof Error ? failure.message : '';
  return /^bots\.errors\.[a-zA-Z]+$/.test(key) ? t(key) : t('bots.discovery.error');
}

/** Every provider proposes the same typed rule. Pairing is used only by local CLI adapters. */
async function connectAi(): Promise<void> {
  if (busy.value || running.value) return;
  busy.value = true;
  localError.value = '';
  const secret = keyInput.value?.value ?? '';
  const code = pairInput.value?.value ?? '';
  if (keyInput.value) keyInput.value.value = '';
  if (pairInput.value) pairInput.value.value = '';
  try {
    client?.disconnect();
    client = createDiscoveryProvider(providerKind.value, { apiKey: secret, endpoint: endpoint.value.trim() });
    if (isLocalProvider.value) await client.pair(code, AbortSignal.timeout(30_000));
    if (providerKind.value === 'claude' || providerKind.value === 'openai') {
      models.value = await client.listModels(AbortSignal.timeout(15_000));
      const savedModel =
        session.value?.provider?.kind === providerKind.value ? session.value.provider.model : undefined;
      model.value = models.value.find((entry) => entry.id === savedModel)?.id ?? models.value[0]?.id ?? '';
      if (!model.value) throw new Error('bots.errors.provider');
      client.selectModel(model.value);
    } else {
      models.value = [];
      model.value = '';
    }
    connectedEndpointHost.value =
      providerKind.value === 'custom' ? new URL(validateBotEndpoint(endpoint.value.trim())).host : '';
    connected.value = true;
  } catch (failure) {
    client?.disconnect();
    client = null;
    connected.value = false;
    connectedEndpointHost.value = '';
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

/** A model switch affects only later rounds; a running search keeps its current choice. */
function selectModel(): void {
  try {
    client?.selectModel(model.value);
  } catch (failure) {
    localError.value = errorText(failure);
  }
}

/** Disconnecting revokes only AI access; an already approved bot is never modified by this control. */
function disconnectAi(): void {
  if (running.value) void pauseResearch();
  providerSwitchPending.value = false;
  client?.disconnect();
  client = null;
  connected.value = false;
  connectedEndpointHost.value = '';
  models.value = [];
  model.value = '';
  if (keyInput.value) keyInput.value.value = '';
  if (pairInput.value) pairInput.value.value = '';
}

function makeEngine(provider: DiscoveryProvider, assets: BotAsset[] = props.assets) {
  return createDiscoveryEngine({
    assets,
    loadHistory: props.loadHistory,
    loadFees: props.loadFees,
    provider,
    onUpdate(value) {
      if (mounted) session.value = value;
    },
  });
}

/** The engine owns all pair evidence, sealed holdout state, request counts and IndexedDB checkpoints. */
async function runEngine(): Promise<void> {
  if (!engine) return;
  const current = ++sequence;
  running.value = true;
  try {
    const result = await engine.run();
    if (current === sequence && mounted) {
      session.value = result;
      if (result.status === 'error') localError.value = errorText(new Error(result.error));
    }
  } catch (failure) {
    if (current === sequence && mounted) localError.value = errorText(failure);
  } finally {
    if (current === sequence && mounted) running.value = false;
  }
}

async function startResearch(): Promise<void> {
  if (!client || busy.value || running.value || props.assets.length < 2) return;
  if (!(await checkHoldoutPreflight('start'))) return;
  await launchResearch();
}

/** Every warning precedes dispatch, while the atomic holdout reservation remains authoritative. */
async function checkHoldoutPreflight(intent: 'start' | 'new'): Promise<boolean> {
  try {
    const window = createDiscoveryWindow(Date.now());
    const key = `${window.holdoutStartAt}-${window.endAt}`;
    const ranges = await createIndexedDbDiscoveryStore().findHoldoutOverlaps(window.holdoutStartAt, window.endAt);
    if (ranges.length && holdoutAcknowledged.value?.key !== key) {
      holdoutPreflight.value = { intent, windowKey: key, ranges };
      return false;
    }
    holdoutPreflight.value = null;
    return true;
  } catch (failure) {
    localError.value = errorText(failure);
    return false;
  }
}

/** Keep the acknowledgement scoped to the actual completed-hour window. */
async function confirmHoldoutPreflight(): Promise<void> {
  const pending = holdoutPreflight.value;
  if (!pending) return;
  const window = createDiscoveryWindow(Date.now());
  const windowKey = `${window.holdoutStartAt}-${window.endAt}`;
  if (windowKey !== pending.windowKey) {
    holdoutPreflight.value = null;
    await checkHoldoutPreflight(pending.intent);
    return;
  }
  holdoutAcknowledged.value = { key: windowKey, ranges: pending.ranges };
  holdoutPreflight.value = null;
  if (pending.intent === 'new') await clearResearch();
  else await startResearch();
}

/** Start only after the user has seen any prior holdout exposure and the provider is connected. */
async function launchResearch(): Promise<void> {
  if (!client || busy.value || running.value) return;
  busy.value = true;
  localError.value = '';
  campaignMessage.value = '';
  try {
    let liveFeedback;
    if (feedbackOptIn.value) {
      const campaign = props.campaigns.find((entry) => entry.botIds.includes(selectedFeedbackBotId.value));
      if (!campaign) throw new Error('bots.errors.stale');
      const members = campaign.botIds.map((id) => props.campaignBots.find((bot) => bot.id === id));
      if (members.some((member) => !member)) throw new Error('bots.errors.stale');
      const orders = await props.readCampaignOrders(campaign.id);
      liveFeedback = summarizeDiscoveryLiveFeedback(
        campaign,
        members as BotDefinition[],
        orders,
        selectedFeedbackBotId.value
      );
      if (!liveFeedback) throw new Error('bots.errors.stale');
    }
    engine = makeEngine(client);
    session.value = await engine.start({
      idea: idea.value,
      callCap: callCap.value,
      capital: capital.value,
      feeBudgetXor: feeBudgetXor.value,
      maxDrawdownPercent: maxDrawdownPercent.value,
      provider: {
        kind: providerKind.value,
        ...(model.value ? { model: model.value } : {}),
        ...(connectedEndpointHost.value ? { endpointHost: connectedEndpointHost.value } : {}),
      },
      ...(liveFeedback ? { shareLiveFeedback: true, liveFeedback } : {}),
    });
    selectedIds.value = [];
    focusedCandidateId.value = null;
    reviewOpen.value = false;
    void runEngine();
  } catch (failure) {
    localError.value = errorText(failure);
    engine = null;
  } finally {
    busy.value = false;
  }
}

async function resumeResearch(): Promise<void> {
  if (!client || !session.value || busy.value || running.value || session.value.assets.length < 2) return;
  if (providerChanged.value) {
    providerSwitchPending.value = true;
    return;
  }
  await continueResearch();
}

/** A provider switch is explicit because prior training context and cost may differ. */
async function confirmProviderSwitch(): Promise<void> {
  if (!providerSwitchPending.value) return;
  providerSwitchPending.value = false;
  await continueResearch();
}

async function continueResearch(): Promise<void> {
  if (!client || !session.value || busy.value || running.value) return;
  busy.value = true;
  localError.value = '';
  try {
    engine = makeEngine(client, session.value.assets);
    session.value = await engine.resume(session.value, {
      kind: providerKind.value,
      ...(model.value ? { model: model.value } : {}),
      ...(connectedEndpointHost.value ? { endpointHost: connectedEndpointHost.value } : {}),
    });
    if (session.value.liveFeedback && !feedbackOptIn.value) session.value = await engine.revokeLiveFeedback();
    void runEngine();
  } catch (failure) {
    localError.value = errorText(failure);
    engine = null;
  } finally {
    busy.value = false;
  }
}

async function pauseResearch(): Promise<void> {
  if (!engine || !running.value) return;
  try {
    session.value = await engine.pause();
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    sequence++;
    running.value = false;
  }
}

/** A new run discards the old public checkpoint; API connections remain memory-only. */
async function newResearch(): Promise<void> {
  if (running.value || busy.value) return;
  if (!(await checkHoldoutPreflight('new'))) return;
  await clearResearch();
}

async function clearResearch(): Promise<void> {
  if (running.value || busy.value) return;
  busy.value = true;
  try {
    await createIndexedDbDiscoveryStore().clear();
    engine = null;
    session.value = null;
    selectedIds.value = [];
    focusedCandidateId.value = null;
    reviewOpen.value = false;
    campaignMessage.value = '';
    localError.value = '';
    feedbackOptIn.value = false;
    selectedFeedbackBotId.value = '';
    providerSwitchPending.value = false;
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(timestamp);
}

function providerLabel(kind: DiscoveryProviderKind): string {
  return `bots.discovery.${kind === 'claude-code' ? 'claudeCode' : kind}`;
}

function pairTitle(key: string): string {
  const [input, output] = key.split('>');
  const assets = session.value?.assets ?? props.assets;
  const left = assets.find((asset) => asset.address === input)?.symbol ?? '?';
  const right = assets.find((asset) => asset.address === output)?.symbol ?? '?';
  return `${left} → ${right}`;
}

function strategyName(kind: StrategyConfig['kind']): string {
  return t(kind === 'rules' ? 'bots.rules.title' : `bots.strategies.${kind}`);
}

function intervalLabel(milliseconds: number): string {
  if (milliseconds === 3_600_000) return t('bots.startFlow.hourly');
  if (milliseconds % 3_600_000 === 0) return t('bots.startFlow.hours', { count: milliseconds / 3_600_000 });
  if (milliseconds % 60_000 === 0) return t('bots.startFlow.minutes', { count: milliseconds / 60_000 });
  return t('bots.startFlow.seconds', { count: milliseconds / 1000 });
}

/** Round display labels only; candidate metrics stay exact in the checkpoint and title. */
function percentOrDash(value: string | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatExperimentPercent(value)}%`;
}

function exactPercentTitle(value: string | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : `${value}%`;
}

/** Keep the absolute after-cost result visually separate from the holding comparison. */
function isNegativePercent(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && new FPNumber(value, 36).lt(new FPNumber('0', 36));
}

/** A positive relative result can still accompany an absolute loss. */
function isPositivePercent(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && new FPNumber(value, 36).gt(new FPNumber('0', 36));
}

/** The shared amount and interval are shown once before separate rule clauses. */
function strategyBasics(strategy: StrategyConfig): string {
  return `${strategy.amount} · ${intervalLabel(strategy.intervalMs)}`;
}

/** Compact summary stays coupled to the exact typed strategy shown again in the review. */
function strategySummary(strategy: StrategyConfig): string {
  const prefix = strategyBasics(strategy);
  if (strategy.kind === 'sma')
    return `${prefix} · ${t('bots.fastWindow')} ${strategy.fastWindow} / ${t('bots.slowWindow')} ${strategy.slowWindow}`;
  if (strategy.kind === 'threshold')
    return `${prefix} · ${t(`bots.rules.${strategy.direction}`)} ${strategy.threshold}`;
  if (strategy.kind === 'rules' && strategy.rules) return `${prefix} · ${rulesSummary(strategy.rules)}`;
  return prefix;
}

/** Keep rule operands in their original typed order for inspection and approval. */
function ruleGroupSummary(group: StrategyRules['entry']): string {
  return group.conditions
    .map((condition) => {
      const value =
        'threshold' in condition
          ? ` ${condition.threshold}%`
          : 'percentile' in condition
            ? ` P${condition.percentile}`
            : '';
      return `${t(`bots.rules.conditions.${condition.kind}`)} ${condition.window}h ${t(`bots.rules.${condition.direction}`)}${value}`;
    })
    .join(` ${t(`bots.rules.${group.operator}`)} `);
}

function rulesSummary(rules: StrategyRules): string {
  return (
    `${t('bots.rules.entry')}: ${ruleGroupSummary(rules.entry)}` +
    (rules.exit ? ` · ${t('bots.rules.exit')}: ${ruleGroupSummary(rules.exit)}` : '')
  );
}

function candidateStatus(candidate: DiscoveryCandidate): string {
  if (candidate.status === 'qualified') return t('bots.discovery.qualified');
  if (candidate.status === 'exploratory') return t('bots.discovery.exploratory');
  if (candidate.status === 'rejected') return t('bots.discovery.rejected');
  return t('bots.discovery.trainingCandidate');
}

/** Explain the actual failed gate beside each candidate's after-cost measurements. */
function candidateReason(candidate: DiscoveryCandidate): string {
  if (!candidate.reason) return '';
  if (candidate.reason !== 'trainingGate' && candidate.reason !== 'holdoutGate')
    return t(`bots.discovery.reason.${candidate.reason}`);
  const metrics = candidate.reason === 'holdoutGate' ? candidate.holdout : candidate.training;
  if (!metrics) return t(`bots.discovery.reason.${candidate.reason}`);
  const issues: string[] = [];
  if (metrics.coverage !== 1) issues.push(t('bots.discovery.reason.coverage'));
  const minimumTrades = candidate.reason === 'holdoutGate' ? 5 : 10;
  if (metrics.trades < minimumTrades) issues.push(t('bots.discovery.reason.tradeMinimum', { count: minimumTrades }));
  if (!new FPNumber(metrics.returnPercent, 36).gt(new FPNumber('0', 36)))
    issues.push(t('bots.discovery.reason.netReturn'));
  if (!metrics.excessReturnPercent || !new FPNumber(metrics.excessReturnPercent, 36).gt(new FPNumber('0', 36)))
    issues.push(t('bots.discovery.reason.holding'));
  if (new FPNumber(metrics.drawdownPercent, 36).gt(new FPNumber(session.value?.maxDrawdownPercent ?? '5', 36)))
    issues.push(t('bots.discovery.reason.drawdown'));
  return issues.length
    ? `${t(`bots.discovery.reason.${candidate.reason}`)}: ${issues.join(' · ')}`
    : t(`bots.discovery.reason.${candidate.reason}`);
}

function skippedReason(reason: DiscoveryPair['reason']): string {
  const key = {
    incompleteHistory: 'noHistory',
    denomination: 'denomination',
    routeUnavailable: 'routeUnavailable',
    amount: 'amountUnavailable',
    historyChanged: 'historyChanged',
  }[reason ?? 'incompleteHistory'];
  return t(`bots.discovery.${key}`);
}

/** Chart inspection highlights the candidate without moving the user away from the plot. */
function focusCandidateFromPlot(id: string): void {
  if (!visibleCandidates.value.some((candidate) => candidate.id === id)) return;
  focusedCandidateId.value = id;
}

/** Move to the evidence row only after the separate inspector action. */
async function viewCandidateFromPlot(id: string): Promise<void> {
  if (!visibleCandidates.value.some((candidate) => candidate.id === id)) return;
  focusedCandidateId.value = id;
  await nextTick();
  const row = [...(candidateList.value?.querySelectorAll<HTMLElement>('li[data-candidate-id]') ?? [])].find(
    (item) => item.dataset.candidateId === id
  );
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  });
}

/** Expand the recorded skip evidence when a completed search offers it as the next action. */
async function openSkippedPairs(): Promise<void> {
  await nextTick();
  const details = skippedPairDetails.value;
  if (!details) return;
  details.open = true;
  details.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

/** Selection is limited to sealed, qualified finalists; AI can never add itself to a live campaign. */
function toggleCandidate(id: string): void {
  const candidate = session.value?.finalists.find((item) => item.id === id);
  if (!candidate) return;
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter((item) => item !== id);
  else if (selectedIds.value.length < 3) selectedIds.value = [...selectedIds.value, id];
  for (const chosen of selectedFinalists.value) initializeReview(chosen);
  clearPreparedReview();
  reviewOpen.value = false;
}

function initializeReview(candidate: DiscoveryFinalist): void {
  if (reviewInputs[candidate.id]) return;
  const input = candidate.template.assetIn;
  const fee = codec(candidate.template.policy.feeBudgetCodec);
  const initial = codec(candidate.template.portfolio.initial[input.address] ?? '0');
  const allocation = initial - (input.address === XOR.address ? fee : 0n);
  reviewInputs[candidate.id] = {
    allocation: fromCodec((allocation > 0n ? allocation : 0n).toString(), input.decimals),
    orderLimit: fromCodec(candidate.template.policy.maxTradeCodec[input.address], input.decimals),
    feeBudgetXor: fromCodec(fee.toString(), XOR.decimals),
    maxDrawdownPercent: session.value?.maxDrawdownPercent ?? '5',
  };
}

function clearPreparedReview(): void {
  preparedReview.value = null;
  preparedFingerprint = null;
  consented.value = false;
  if (passwordInput.value) passwordInput.value.value = '';
}

/** A prepared wallet grant is bound to the exact visible selection, values and wallet. */
function reviewFingerprint(): string {
  return JSON.stringify({
    selectedIds: selectedIds.value,
    sharedCapXor: sharedCapXor.value,
    values: reviewInputs,
    walletIdentity: props.walletIdentity,
  });
}

function clearResumeReview(): void {
  resumeReview.value = null;
  resumeIdentity = null;
  resumeConsented.value = false;
  const field = Array.isArray(resumePasswordInput.value) ? resumePasswordInput.value[0] : resumePasswordInput.value;
  if (field) field.value = '';
}

/** A manual pause revokes the shared in-memory grant for the campaign. */
async function pauseLiveCampaign(id: string): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  localError.value = '';
  clearResumeReview();
  try {
    await props.pauseCampaign(id);
    campaignMessage.value = t('bots.discovery.campaignPaused');
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

/** A deliberate close settles receipts and releases every member allocation as one ledger change. */
async function closeLiveCampaign(id: string): Promise<void> {
  if (busy.value || closingCampaignId.value !== id) return;
  busy.value = true;
  localError.value = '';
  try {
    await props.closeCampaign(id);
    closingCampaignId.value = null;
    clearResumeReview();
    campaignMessage.value = t('bots.discovery.campaignClosed');
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

/** A paused campaign gets a new finalized review; no signing authority is restored automatically. */
async function prepareCampaignResume(id: string): Promise<void> {
  if (busy.value || !props.walletConnected || props.externalWallet) return;
  busy.value = true;
  localError.value = '';
  resumeConsented.value = false;
  resumeIdentity = null;
  const oldPassword = Array.isArray(resumePasswordInput.value)
    ? resumePasswordInput.value[0]
    : resumePasswordInput.value;
  if (oldPassword) oldPassword.value = '';
  const walletIdentity = props.walletIdentity;
  try {
    const review = await props.prepareResume(id);
    if (walletIdentity !== props.walletIdentity || props.campaigns.find((item) => item.id === id)?.status !== 'paused')
      throw new Error('bots.errors.stale');
    if (review.expiresAt <= Date.now()) throw new Error('bots.errors.stale');
    resumeReview.value = review;
    resumeIdentity = walletIdentity;
    reviewNow.value = Date.now();
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

/** Resume uses the same one-use review ID and a newly entered wallet password. */
async function authorizeCampaignResume(): Promise<void> {
  const review = resumeReview.value;
  if (
    review &&
    (resumeIdentity !== props.walletIdentity ||
      props.campaigns.find((item) => item.id === review.id)?.status !== 'paused')
  ) {
    clearResumeReview();
    localError.value = errorText(new Error('bots.errors.stale'));
    return;
  }
  if (
    !review?.funding.sufficient ||
    review.expiresAt <= Date.now() ||
    busy.value ||
    !resumeConsented.value ||
    !props.walletConnected ||
    props.externalWallet
  )
    return;
  const field = Array.isArray(resumePasswordInput.value) ? resumePasswordInput.value[0] : resumePasswordInput.value;
  const password = field?.value ?? '';
  if (field) field.value = '';
  busy.value = true;
  localError.value = '';
  try {
    await props.authorize(review.id, password);
    clearResumeReview();
    campaignMessage.value = t('bots.discovery.campaignResumed');
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

function reviewInput(): Omit<DiscoveryApproval, 'password'> {
  return {
    finalists: selectedFinalists.value.map((candidate) => structuredClone(toRaw(candidate))),
    values: Object.fromEntries(
      selectedFinalists.value.map((candidate) => [candidate.id, { ...reviewInputs[candidate.id] }])
    ),
    sharedCapXor: sharedCapXor.value,
  };
}

/** Show finalized funding and cap evidence before asking for the wallet password. */
async function prepareCampaign(): Promise<void> {
  if (busy.value || !props.walletConnected || props.externalWallet || !selectedFinalists.value.length) return;
  busy.value = true;
  localError.value = '';
  consented.value = false;
  preparedFingerprint = null;
  if (passwordInput.value) passwordInput.value.value = '';
  const fingerprint = reviewFingerprint();
  const input = reviewInput();
  try {
    const review = await props.prepare(input);
    if (fingerprint !== reviewFingerprint()) throw new Error('bots.errors.stale');
    if (review.expiresAt <= Date.now()) throw new Error('bots.errors.stale');
    preparedReview.value = review;
    preparedFingerprint = fingerprint;
    reviewNow.value = Date.now();
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

/** Only a still-current in-memory review ID and transient password enter the live controller. */
async function authorizeCampaign(): Promise<void> {
  const review = preparedReview.value;
  if (preparedFingerprint !== reviewFingerprint()) {
    clearPreparedReview();
    localError.value = errorText(new Error('bots.errors.stale'));
    return;
  }
  if (
    !review?.funding.sufficient ||
    review.expiresAt <= Date.now() ||
    busy.value ||
    !consented.value ||
    !props.walletConnected ||
    props.externalWallet
  )
    return;
  const password = passwordInput.value?.value ?? '';
  if (passwordInput.value) passwordInput.value.value = '';
  busy.value = true;
  localError.value = '';
  try {
    await props.authorize(review.id, password);
    campaignMessage.value = t('bots.discovery.campaignStarted');
    reviewOpen.value = false;
    clearPreparedReview();
    selectedIds.value = [];
  } catch (failure) {
    localError.value = errorText(failure);
  } finally {
    busy.value = false;
  }
}

watch(
  () => [selectedIds.value, sharedCapXor.value, JSON.stringify(reviewInputs), props.walletIdentity],
  clearPreparedReview
);
watch(() => props.walletIdentity, clearResumeReview);
watch(localError, async (message) => {
  if (!message || !mounted) return;
  await nextTick();
  errorAlert.value?.focus();
});

function handlePageHide(): void {
  if (running.value) void pauseResearch();
}

function syncReviewClock(): void {
  reviewNow.value = Date.now();
  if (preparedReview.value && preparedReview.value.expiresAt <= reviewNow.value) {
    consented.value = false;
    if (passwordInput.value) passwordInput.value.value = '';
  }
  if (resumeReview.value && resumeReview.value.expiresAt <= reviewNow.value) {
    resumeConsented.value = false;
    const field = Array.isArray(resumePasswordInput.value) ? resumePasswordInput.value[0] : resumePasswordInput.value;
    if (field) field.value = '';
  }
}

onMounted(async () => {
  mounted = true;
  window.addEventListener('pagehide', handlePageHide);
  document.addEventListener('visibilitychange', syncReviewClock);
  reviewClock = setInterval(syncReviewClock, 1000);
  try {
    const checkpoint = await loadDiscoverySession();
    if (!mounted || !checkpoint) return;
    session.value = checkpoint;
    idea.value = checkpoint.idea;
    capital.value = checkpoint.capital;
    feeBudgetXor.value = checkpoint.feeBudgetXor;
    callCap.value = checkpoint.callCap;
    maxDrawdownPercent.value = checkpoint.maxDrawdownPercent;
    if (checkpoint.provider) providerKind.value = checkpoint.provider.kind;
  } catch (failure) {
    if (mounted) localError.value = errorText(failure);
  }
});
onUnmounted(() => {
  mounted = false;
  window.removeEventListener('pagehide', handlePageHide);
  document.removeEventListener('visibilitychange', syncReviewClock);
  if (reviewClock) clearInterval(reviewClock);
  sequence++;
  clearPreparedReview();
  clearResumeReview();
  if (engine) {
    const current = engine;
    void (running.value ? current.pause().catch(() => undefined) : Promise.resolve()).finally(() => {
      void current.dispose();
    });
  } else client?.disconnect();
  client = null;
});
</script>

<style scoped lang="scss">
.discovery {
  --discovery-surface: var(--bot-surface, var(--s-color-utility-surface));
  --discovery-recess: var(--bot-recess, var(--s-color-base-background));
  --discovery-line: var(--bot-border, var(--s-color-base-border-secondary));
  --discovery-text: var(--s-color-base-content-primary);
  --discovery-muted: var(--bot-muted, var(--s-color-base-content-secondary));
  --discovery-accent: var(--bot-accent, var(--s-color-action-text));
  --discovery-good: var(--s-color-status-success-text);
  --discovery-raised: var(--bot-shadow-raised);
  --discovery-inset: var(--bot-shadow-inset);
  color: var(--discovery-text);
  min-width: 0;
  padding: 9px 0 32px;
  font-variant-numeric: tabular-nums;
}
.discovery * {
  box-sizing: border-box;
}
.discovery-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 4px 0 18px;
  h2 {
    font-size: clamp(32px, 3.1vw, 44px);
    line-height: 1.04;
    letter-spacing: -0.055em;
    font-weight: 680;
    margin: 5px 0 8px;
  }
  p:last-child {
    color: var(--discovery-muted);
    line-height: 1.5;
    max-width: 54ch;
    margin: 0;
  }
}
.discovery-kicker,
.discovery-overline {
  color: var(--discovery-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.discovery-kicker {
  margin: 0;
}
.discovery-state {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 39px;
  padding: 8px 14px;
  border-radius: 99px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  color: var(--discovery-muted);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--discovery-accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--discovery-accent) 13%, transparent);
  }
  i.active {
    animation: discovery-pulse 1.9s ease-in-out infinite;
  }
}
.discovery-layout {
  display: grid;
  grid-template-columns: #{'minmax' }(264px, 306px) #{'minmax' }(0, 1fr);
  gap: clamp(30px, 4vw, 64px);
  align-items: start;
}
.discovery-layout.is-complete {
  grid-template-columns: 1fr;
}
.discovery-controls {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 0 24px 20px 2px;
  border-inline-end: 1px solid var(--discovery-line);
}
.discovery-control-group {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.discovery-group-heading {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding-bottom: 6px;
  span {
    color: var(--discovery-accent);
    font:
      12px ui-monospace,
      monospace;
  }
  h3 {
    font-size: 16px;
    letter-spacing: -0.02em;
    margin: 0;
  }
}
.discovery-saved-provider-inline {
  margin: -2px 0 0;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.45;
  strong {
    color: var(--discovery-text);
    font-weight: 700;
  }
}
.discovery-field {
  display: grid;
  min-width: 0;
  gap: 7px;
  > span {
    color: var(--discovery-muted);
    font-size: 11px;
    font-weight: 650;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-width: 0;
    color: var(--discovery-text);
    background: var(--discovery-recess);
    border: 1px solid color-mix(in srgb, var(--discovery-line) 72%, transparent);
    border-radius: 11px;
    box-shadow: var(--discovery-inset);
    padding: 11px 13px;
    font: inherit;
    min-height: 43px;
  }
  textarea {
    resize: vertical;
    min-height: 70px;
    line-height: 1.45;
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--discovery-muted);
    opacity: 0.7;
  }
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 2px;
  }
  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.63;
  }
}
.discovery-advanced {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  summary {
    cursor: pointer;
    color: var(--discovery-text);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.5;
  }
  summary span {
    display: block;
    color: var(--discovery-muted);
    font-size: 10px;
    font-weight: 500;
    margin-top: 2px;
  }
  &[open] {
    display: grid;
    gap: 12px;
  }
  summary:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 3px;
  }
}
.discovery-decision {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  border-inline-start: 3px solid var(--s-color-status-warning-text, var(--discovery-accent));
  font-size: 11px;
  line-height: 1.5;
  strong {
    font-size: 12px;
  }
  p {
    margin: 0;
    color: var(--discovery-muted);
  }
  ul {
    margin: 2px 0;
    padding-inline-start: 19px;
    color: var(--discovery-muted);
  }
}
.discovery-decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    min-height: 42px;
    border: 0;
    border-radius: 9px;
    padding: 8px 11px;
    color: var(--discovery-text);
    background: var(--discovery-recess);
    box-shadow: var(--discovery-raised);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button.discovery-primary {
    color: var(--s-color-on-action);
    background: var(--s-color-action-fill);
  }
  button:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 2px;
  }
}
.discovery-field-row {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  gap: 12px;
}
.discovery-help,
.discovery-runtime-note,
.discovery-source-note {
  margin: 0;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.55;
}
.discovery-download {
  color: var(--discovery-accent);
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}
.discovery-connection-actions,
.discovery-run-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 13px;
}
.discovery-connection-actions button,
.discovery-run-actions button,
.discovery-review button {
  min-height: 42px;
  padding: 9px 15px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: var(--discovery-surface);
  color: var(--discovery-text);
  box-shadow: var(--discovery-raised);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
  &:hover:not(:disabled) {
    color: var(--discovery-accent);
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: var(--discovery-inset);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 3px;
  }
}
.discovery-connection-actions .discovery-connected {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--discovery-good);
  font-size: 11px;
  font-weight: 650;
}
.discovery-connected i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.discovery-run-actions .discovery-primary,
.discovery-review .discovery-primary,
.discovery-review-entry .discovery-primary {
  color: var(--s-color-on-action);
  background: var(--s-color-action-fill);
  box-shadow:
    4px 4px 11px var(--s-shadow-color-dark),
    -3px -3px 9px var(--s-shadow-color-light-dark);
  &:hover:not(:disabled) {
    color: var(--s-color-on-action);
    background: var(--s-color-action-fill-hover);
  }
  &:disabled {
    color: var(--discovery-muted);
    background: var(--discovery-recess);
    box-shadow: var(--discovery-inset);
    opacity: 1;
  }
}
.discovery-run-actions .discovery-primary {
  width: 100%;
  justify-content: space-between;
  display: inline-flex;
}
.discovery-runtime-note {
  border-top: 1px solid var(--discovery-line);
  padding-top: 16px;
}
.discovery-workspace {
  min-width: 0;
}
.discovery-complete-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: var(--discovery-muted);
  font-size: 12px;
  font-weight: 650;
  button {
    min-height: 40px;
    border: 0;
    border-radius: 10px;
    padding: 8px 14px;
    background: var(--discovery-surface);
    box-shadow: var(--discovery-raised);
    color: var(--discovery-text);
    font: inherit;
    cursor: pointer;
    &:hover:not(:disabled) {
      color: var(--discovery-accent);
    }
    &:focus-visible {
      outline: 2px solid var(--discovery-accent);
      outline-offset: 3px;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
.discovery-progress {
  position: relative;
  overflow: hidden;
  padding: 22px 24px 17px;
  border-radius: 19px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
}
.discovery-progress-head {
  display: grid;
  grid-template-columns: repeat(3, #{'minmax' }(0, 1fr));
  gap: 18px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  strong {
    margin-top: auto;
    font-size: clamp(27px, 3vw, 39px);
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 650;
  }
  small {
    font-size: 14px;
    color: var(--discovery-muted);
    font-weight: 500;
    letter-spacing: 0;
  }
}
.discovery-progress-track {
  overflow: hidden;
  height: 5px;
  margin: 22px 0 13px;
  border-radius: 99px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  span {
    display: block;
    height: 100%;
    background: var(--discovery-accent);
    border-radius: inherit;
    transition: width 460ms ease;
  }
}
.discovery-progress.is-active .discovery-progress-track span {
  box-shadow: 0 0 14px color-mix(in srgb, var(--discovery-accent) 35%, transparent);
}
.discovery-progress.is-active::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -38%;
  width: 38%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--discovery-accent) 7%, transparent),
    transparent
  );
  animation: discovery-scan-sheen 4.5s linear infinite;
}
.discovery-progress-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.4;
}
.discovery-holdout-reuse {
  margin: 13px 0 0;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.4;
}
.discovery-progress-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 17px;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid var(--discovery-line);
  p {
    margin: 0;
    color: var(--discovery-muted);
    font-size: 11px;
    line-height: 1.45;
  }
  strong {
    color: var(--discovery-text);
    font-weight: 650;
  }
}
.discovery-live {
  margin-top: 28px;
}
.discovery-live-heading,
.discovery-live-campaign > header,
.discovery-live-member > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.discovery-live-heading {
  margin-bottom: 13px;
  h3 {
    margin: 4px 0 0;
    font-size: 23px;
    letter-spacing: -0.03em;
  }
  > span {
    color: var(--discovery-muted);
    font-size: 12px;
  }
}
.discovery-live-campaign {
  margin-top: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  > header {
    padding-bottom: 13px;
    border-bottom: 1px solid var(--discovery-line);
  }
  > header strong {
    font-size: 14px;
  }
  > header span {
    color: var(--discovery-muted);
    font-size: 11px;
    font-weight: 700;
  }
  > header span.running {
    color: var(--discovery-good);
  }
}
.discovery-live-members {
  display: grid;
  gap: 9px;
  margin-top: 13px;
}
.discovery-live-member {
  padding: 11px 13px;
  border-radius: 10px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  > div:first-child strong {
    font-size: 12px;
  }
  > div:first-child span {
    color: var(--discovery-muted);
    font-size: 10px;
  }
}
.discovery-live-performance {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--discovery-line);
  span {
    display: grid;
    gap: 4px;
    color: var(--discovery-muted);
    font-size: 10px;
  }
  strong {
    color: var(--discovery-text);
    font-size: 12px;
  }
}
.discovery-live-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 13px;
  button {
    min-height: 44px;
    padding: 9px 14px;
    border: 0;
    border-radius: 9px;
    background: var(--discovery-recess);
    box-shadow: var(--discovery-raised);
    color: var(--discovery-text);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 3px;
  }
}
.discovery-resume-requirement {
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.4;
}
.discovery-close-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 13px;
  margin-top: 13px;
  border-radius: 10px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  p {
    flex-basis: 100%;
    margin: 0 0 4px;
    color: var(--discovery-muted);
    font-size: 11px;
    line-height: 1.45;
  }
  button {
    min-height: 44px;
    padding: 9px 14px;
    border: 0;
    border-radius: 9px;
    background: var(--discovery-surface);
    box-shadow: var(--discovery-raised);
    color: var(--discovery-text);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  button:last-child {
    color: var(--discovery-accent);
  }
  button:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 3px;
  }
}
.discovery-review-evidence,
.discovery-resume-review {
  display: grid;
  gap: 8px;
  padding: 15px;
  border-radius: 11px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  font-size: 11px;
  p {
    margin: 0;
    color: var(--discovery-muted);
  }
  p strong {
    margin-inline-start: 6px;
    color: var(--discovery-text);
  }
  ul {
    display: grid;
    gap: 6px;
    padding: 0;
    margin: 3px 0 0;
    list-style: none;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--discovery-recess);
    box-shadow: var(--discovery-inset);
  }
}
.discovery-resume-review {
  margin-top: 13px;
  > .discovery-primary {
    justify-self: start;
  }
}
.discovery-verified-bots {
  display: grid;
  gap: 8px;
  article {
    display: grid;
    gap: 4px;
    padding: 11px;
    border-radius: 9px;
    background: var(--discovery-recess);
    box-shadow: var(--discovery-inset);
  }
  strong {
    font-size: 12px;
  }
  p,
  span {
    color: var(--discovery-muted);
    font-size: 10px;
    line-height: 1.35;
  }
  p {
    margin: 0 0 3px;
  }
}
.discovery-funding-short {
  color: var(--s-color-status-error-text, var(--discovery-accent)) !important;
}
.discovery-results-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin: 33px 0 18px;
  h3 {
    font-size: clamp(22px, 2.1vw, 29px);
    letter-spacing: -0.035em;
    margin: 5px 0 0;
  }
}
.discovery-selection-count {
  color: var(--discovery-muted);
  font-size: 12px;
  white-space: nowrap;
}
.discovery-empty {
  min-height: 128px;
  border-radius: 17px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 11px;
  color: var(--discovery-muted);
  text-align: center;
  p {
    margin: 0 18px;
    font-size: 12px;
    line-height: 1.5;
  }
}
.discovery-ranking-note {
  margin: -7px 0 15px;
  max-width: 90ch;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.5;
}
.discovery-fee-assumption {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: -3px 0 17px;
  padding: 11px 14px;
  border-radius: 11px;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  color: var(--discovery-text);
  font-size: 12px;
  line-height: 1.5;
  span {
    color: var(--discovery-accent);
    font-size: 16px;
    line-height: 1;
  }
}
.discovery-candidate-reason {
  margin: 10px 0 0;
  color: var(--s-color-status-warning-text, var(--discovery-muted));
  font-size: 11px;
  line-height: 1.45;
}
.discovery-empty-orbit {
  position: relative;
  width: 74px;
  height: 66px;
}
.discovery-empty-orbit::before,
.discovery-empty-orbit::after {
  content: '';
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--discovery-accent) 42%, transparent);
  border-radius: 50%;
  transform: rotate(-27deg);
}
.discovery-empty-orbit::before {
  inset: 14px 1px;
  animation: discovery-orbit 9s linear infinite;
}
.discovery-empty-orbit::after {
  inset: 2px 23px;
  transform: rotate(27deg);
  animation: discovery-orbit-reverse 12s linear infinite;
}
.discovery-empty-orbit i {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--discovery-accent);
}
.discovery-empty-orbit i:nth-child(1) {
  top: 18px;
  left: 3px;
}
.discovery-empty-orbit i:nth-child(2) {
  top: 2px;
  left: 43px;
}
.discovery-empty-orbit i:nth-child(3) {
  bottom: 11px;
  right: 3px;
}
.discovery-candidates {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.discovery-candidate {
  position: relative;
  display: grid;
  grid-template-columns: 40px #{'minmax' }(0, 1fr) auto;
  gap: 14px;
  padding: 19px 18px;
  border-radius: 15px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  transition:
    transform 240ms ease,
    box-shadow 240ms ease;
  animation: discovery-rise 470ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  animation-delay: var(--candidate-delay, 0ms);
  scroll-margin-block: 80px;
  &.is-selected {
    box-shadow: var(--discovery-inset);
  }
  &.is-focused {
    box-shadow:
      var(--discovery-raised),
      0 0 0 2px color-mix(in srgb, var(--discovery-accent) 62%, transparent),
      0 0 28px color-mix(in srgb, var(--discovery-accent) 14%, transparent);
  }
  &.is-focused::before {
    content: '';
    position: absolute;
    inset-block: 14px;
    inset-inline-start: 0;
    width: 3px;
    border-radius: 99px;
    background: var(--discovery-accent);
  }
  &.is-qualified:not(.is-selected):hover {
    transform: translateY(-2px);
  }
}
@keyframes discovery-scan-sheen {
  to {
    transform: translateX(365%);
  }
}
@keyframes discovery-orbit {
  from {
    transform: rotate(-27deg);
  }
  to {
    transform: rotate(333deg);
  }
}
@keyframes discovery-orbit-reverse {
  from {
    transform: rotate(27deg);
  }
  to {
    transform: rotate(-333deg);
  }
}
@keyframes discovery-rise {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.discovery-candidate-select {
  align-self: start;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--discovery-accent);
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
  font-size: 20px;
  cursor: pointer;
  &:disabled {
    color: var(--discovery-muted);
    opacity: 0.45;
    cursor: not-allowed;
  }
  &[aria-pressed='true'] {
    background: var(--s-color-action-fill);
    color: var(--s-color-on-action);
    box-shadow: none;
  }
  &:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 3px;
  }
}
.discovery-candidate-main {
  min-width: 0;
}
.discovery-candidate-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  strong {
    font-size: 16px;
    letter-spacing: -0.015em;
  }
}
.discovery-rank {
  font:
    10px ui-monospace,
    monospace;
  color: var(--discovery-muted);
}
.discovery-method {
  color: var(--discovery-muted);
  font-size: 11px;
}
.discovery-request-number {
  margin-inline-start: auto;
  color: var(--discovery-muted);
  font-size: 10px;
}
.discovery-candidate-rule {
  margin: 7px 0 13px;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.discovery-rule-breakdown {
  display: grid;
  gap: 5px;
  margin: 8px 0 14px;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  p {
    display: flex;
    gap: 9px;
    margin: 0;
  }
  strong {
    min-width: 44px;
    color: var(--discovery-text);
    font-weight: 700;
  }
}
.discovery-candidate-metrics {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  > div {
    display: grid;
    gap: 4px;
    min-width: 65px;
  }
  span {
    color: var(--discovery-muted);
    font-size: 10px;
  }
  strong {
    font-size: 14px;
    font-weight: 650;
  }
  .discovery-candidate-net strong {
    font-size: 21px;
    letter-spacing: -0.03em;
  }
  .discovery-candidate-net.is-loss strong {
    color: var(--s-color-status-error-text, var(--discovery-accent));
  }
}
.discovery-candidate-interpretation {
  margin: 10px 0 0;
  color: var(--s-color-status-warning-text, var(--discovery-text));
  font-size: 11px;
  font-weight: 650;
  line-height: 1.5;
}
.discovery-holdout {
  display: flex;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--discovery-line);
  color: var(--discovery-muted);
  font-size: 11px;
  strong {
    color: var(--discovery-good);
    font-size: 14px;
  }
}
.discovery-candidate-status {
  align-self: start;
  padding: 5px 8px;
  border-radius: 99px;
  background: var(--discovery-recess);
  color: var(--discovery-muted);
  font-size: 10px;
  white-space: nowrap;
  &.qualified {
    color: var(--discovery-good);
  }
}
.discovery-source-note {
  margin: 17px 0 0;
}
.discovery-skipped {
  margin-top: 20px;
  border-top: 1px solid var(--discovery-line);
  padding-top: 14px;
  summary {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    color: var(--discovery-muted);
    font-size: 12px;
    font-weight: 650;
  }
  ul {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    max-height: 240px;
    overflow: auto;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: space-between;
    padding: 9px 2px;
    border-bottom: 1px solid var(--discovery-line);
    font-size: 11px;
  }
  li span {
    color: var(--discovery-muted);
    text-align: end;
  }
}
.discovery-review-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 25px;
  padding: 16px 0;
  border-top: 1px solid var(--discovery-line);
  font-size: 12px;
  color: var(--discovery-muted);
}
.discovery-review-entry button {
  min-height: 44px;
  border: 0;
  border-radius: 11px;
  padding: 9px 17px;
  color: var(--s-color-on-action);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.discovery-review {
  margin-top: 25px;
  padding-top: 21px;
  border-top: 1px solid var(--discovery-line);
}
.discovery-review-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  h3 {
    font-size: 26px;
    letter-spacing: -0.035em;
    margin: 5px 0;
  }
  p {
    color: var(--discovery-muted);
    margin: 0;
    line-height: 1.5;
  }
}
.discovery-review-items {
  display: grid;
  gap: 15px;
  margin: 20px 0;
}
.discovery-review-item {
  padding: 18px 20px;
  border-radius: 15px;
  background: var(--discovery-surface);
  box-shadow: var(--discovery-raised);
  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
  }
  header strong {
    font-size: 17px;
  }
  header span {
    color: var(--discovery-muted);
    font-size: 11px;
  }
}
.discovery-pair-addresses,
.discovery-verified-bots code,
.discovery-network code {
  display: block;
  overflow-wrap: anywhere;
  color: var(--discovery-muted);
  font-size: 10px;
  line-height: 1.4;
}
.discovery-pair-addresses {
  margin-top: 7px;
}
.discovery-fixed-note {
  margin: 12px 0 0;
  color: var(--discovery-muted);
  font-size: 11px;
  line-height: 1.4;
}
.discovery-review-rule {
  margin: 10px 0 17px;
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  p {
    color: var(--discovery-muted);
    margin: 6px 0 0;
  }
}
.discovery-review-fields {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
  gap: 12px;
  label {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  label span {
    color: var(--discovery-muted);
    font-size: 11px;
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    padding: 8px 11px;
    color: var(--discovery-text);
    background: var(--discovery-recess);
    border: 0;
    border-radius: 9px;
    box-shadow: var(--discovery-inset);
    font: inherit;
  }
}
.discovery-fixed-value {
  display: grid;
  gap: 6px;
  min-width: 0;
  span {
    color: var(--discovery-muted);
    font-size: 11px;
  }
  strong {
    min-height: 38px;
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--discovery-line);
    color: var(--discovery-text);
    font-size: 14px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
}
.discovery-output-token {
  margin: 16px 0 0;
  padding-top: 11px;
  border-top: 1px solid var(--discovery-line);
  color: var(--discovery-muted);
  font-size: 11px;
  strong {
    color: var(--discovery-text);
    margin-inline-start: 7px;
  }
  span {
    display: block;
    margin-top: 7px;
  }
}
.discovery-review-final {
  display: grid;
  gap: 12px;
  padding: 22px;
  background: var(--discovery-recess);
  border-radius: 15px;
  box-shadow: var(--discovery-inset);
  > p {
    color: var(--discovery-muted);
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
  }
  > .discovery-primary {
    justify-self: start;
  }
}
.discovery-consent {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 12px;
  line-height: 1.5;
  input {
    accent-color: var(--discovery-accent);
    margin-top: 3px;
  }
}
.discovery-error,
.discovery-success {
  margin: 17px 0 0;
  padding: 13px 16px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
  background: var(--discovery-recess);
  box-shadow: var(--discovery-inset);
}
.discovery-error {
  color: var(--s-color-status-error-text, var(--discovery-accent));
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }
}
.discovery-success {
  color: var(--discovery-good);
}
@keyframes discovery-pulse {
  50% {
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--discovery-accent) 8%, transparent);
  }
}
@media (max-width: 980px) {
  .discovery-layout {
    grid-template-columns: 1fr;
    gap: 26px;
  }
  .discovery-controls {
    grid-template-columns: repeat(2, #{'minmax' }(0, 1fr));
    align-items: start;
    padding: 0 0 25px;
    border-inline-end: 0;
    border-bottom: 1px solid var(--discovery-line);
  }
  .discovery-runtime-note {
    grid-column: 1 / -1;
  }
}
@media (max-width: 650px) {
  .discovery-heading {
    flex-direction: column;
    gap: 10px;
    padding: 7px 0 17px;
  }
  .discovery-kicker {
    display: none;
  }
  .discovery-heading h2 {
    font-size: 34px;
    margin: 0 0 5px;
  }
  .discovery-heading p:last-child {
    font-size: 12px;
  }
  .discovery-state {
    min-height: 29px;
    padding: 5px 11px;
    font-size: 10px;
  }
  .discovery-controls {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 0 0 17px;
  }
  .discovery-control-group {
    gap: 10px;
  }
  .discovery-group-heading {
    padding-bottom: 0;
  }
  .discovery-provider-field > span,
  .discovery-idea-field > span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  .discovery-idea-field textarea {
    min-height: 62px;
  }
  .discovery-run-actions button {
    min-height: 46px;
  }
  .discovery-runtime-note {
    grid-column: auto;
  }
  .discovery-progress {
    padding: 18px 16px 15px;
  }
  .discovery-progress-head {
    gap: 8px;
  }
  .discovery-progress-head strong {
    font-size: 27px;
  }
  .discovery-progress-foot {
    flex-direction: column;
    gap: 2px;
  }
  .discovery-results-heading {
    align-items: start;
    flex-direction: column;
    gap: 8px;
  }
  .discovery-candidate {
    grid-template-columns: 34px #{'minmax' }(0, 1fr);
    padding: 15px 13px;
    gap: 10px;
  }
  .discovery-candidate-status {
    grid-column: 2;
    justify-self: start;
  }
  .discovery-candidate-select {
    width: 44px;
    height: 44px;
  }
  .discovery-candidate-metrics {
    gap: 12px;
  }
  .discovery-review-fields {
    grid-template-columns: 1fr;
  }
  .discovery-review-heading {
    flex-direction: column;
  }
}
@media (prefers-reduced-motion: reduce) {
  .discovery *,
  .discovery *::before,
  .discovery *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
