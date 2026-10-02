<template>
  <section
    class="autopilot"
    data-testid="autopilot"
    :aria-label="t('bots.autopilot.title')"
    :aria-busy="busy && stage !== 'research' && !desktopConnecting"
  >
    <header class="autopilot-header">
      <span class="autopilot-label">{{ t('bots.autopilot.title') }}</span>
      <button type="button" class="autopilot-link" data-testid="autopilot-advanced" @click="emit('advanced')">
        {{ t('bots.autopilot.advanced') }} <span aria-hidden="true">↗</span>
      </button>
    </header>

    <div :key="stage" class="autopilot-stage">
      <form v-if="setupForm" class="autopilot-go-form" data-testid="autopilot-fund-form" @submit.prevent="go">
        <fieldset :disabled="busy">
          <div class="autopilot-budget-row">
            <label class="autopilot-field autopilot-budget">
              <span>{{
                inputAsset
                  ? t('bots.autopilot.budget', { symbol: inputAsset.symbol })
                  : t('bots.autopilot.budgetUnselected')
              }}</span>
              <input
                v-model="capital"
                data-testid="autopilot-capital"
                inputmode="decimal"
                maxlength="100"
                placeholder="0.00"
                :disabled="canResumeWatch"
                required
              />
            </label>
            <label class="autopilot-field autopilot-input-token">
              <span>{{ t('bots.spendToken') }}</span>
              <select v-model="assetInAddress" data-testid="autopilot-asset-in" :disabled="canResumeWatch" required>
                <option v-for="asset in assets" :key="asset.address" :value="asset.address">
                  {{ asset.symbol }}
                </option>
              </select>
            </label>
          </div>
          <label class="autopilot-field">
            <span>{{ t('bots.autopilot.maximizeToken') }}</span>
            <select v-model="assetOutAddress" data-testid="autopilot-asset-out" :disabled="canResumeWatch" required>
              <option v-for="asset in tradeAssets" :key="asset.address" :value="asset.address">
                {{ asset.symbol }}
              </option>
            </select>
          </label>
          <p
            v-if="draftError && stage !== 'watching'"
            :id="draftErrorId"
            class="autopilot-error"
            role="alert"
            data-testid="autopilot-error"
          >
            {{ draftError }}
          </p>
          <details
            v-if="shownDiagnostics && (canResumeWatch || stage === 'watching' || (displayError && !validationError))"
            class="autopilot-details"
            data-testid="autopilot-diagnostics"
          >
            <summary>
              {{
                t(
                  stage === 'watching' || canResumeWatch
                    ? diagnosticsDataThrough
                      ? 'bots.autopilot.diagnostics.lastCheckThrough'
                      : 'bots.autopilot.diagnostics.lastCheck'
                    : 'bots.autopilot.diagnostics.details',
                  diagnosticsDataThrough ? { time: diagnosticsDataThrough } : undefined
                )
              }}
            </summary>
            <template v-if="openingExplanation">
              <p class="autopilot-note" data-testid="autopilot-opening-bound">
                {{ t('bots.autopilot.diagnostics.opening', openingExplanation.bound) }}
              </p>
              <p class="autopilot-note" data-testid="autopilot-opening-dates">
                {{ t('bots.autopilot.diagnostics.openingDates', openingExplanation.dates) }}
              </p>
            </template>
            <template v-else>
              <p class="autopilot-note">{{ t(`bots.autopilot.diagnostics.${shownDiagnostics.stage}`) }}</p>
              <p v-if="shownDiagnostics.screening" class="autopilot-note" data-testid="autopilot-screening-count">
                {{
                  t('bots.autopilot.diagnostics.screeningCount', {
                    drafted: shownDiagnostics.screening.submitted,
                    tested: shownDiagnostics.failures.length,
                  })
                }}
              </p>
              <ul v-if="shownDiagnostics.failures.length" class="autopilot-diagnostic-list">
                <li v-for="failure in shownDiagnostics.failures" :key="failure.candidate">
                  #{{ failure.candidate }}:
                  {{ failure.reasons.map((reason) => t(diagnosticMessages[reason])).join(' · ') }}
                </li>
              </ul>
              <ul v-if="shownDiagnostics.screening?.dropped.length" class="autopilot-diagnostic-list">
                <li v-for="drop in shownDiagnostics.screening.dropped" :key="drop.candidate">
                  {{ t('bots.autopilot.diagnostics.screenedDraft', { number: drop.candidate }) }}:
                  {{ drop.reasons.map((reason) => t(screeningMessages[reason])).join(' · ') }}
                </li>
              </ul>
              <p
                v-if="shownDiagnostics.feePressure && stage !== 'watching'"
                class="autopilot-note"
                data-testid="autopilot-fee-pressure"
              >
                {{ feePressureMessage }}
              </p>
            </template>
          </details>
          <div v-if="stage === 'watching'" role="status" aria-live="polite" data-testid="autopilot-watching">
            <strong>{{ t('bots.autopilot.watch.title') }}</strong>
            <p class="autopilot-note">
              {{
                t(
                  companionConnected
                    ? 'bots.autopilot.watch.companionNote'
                    : desktopMode
                      ? 'bots.autopilot.watch.desktopNote'
                      : 'bots.autopilot.watch.note'
                )
              }}
            </p>
            <p
              v-if="companionError || (displayError && !diagnostics)"
              class="autopilot-note"
              data-testid="autopilot-watch-error"
            >
              {{ companionError ? t(companionError) : watchErrorMessage }}
            </p>
            <p
              v-if="diagnostics?.feePressure"
              class="autopilot-note autopilot-watch-fee-pressure"
              data-testid="autopilot-watch-fee-pressure"
            >
              {{ feePressureMessage }}
            </p>
            <p v-if="watchCheckTime" class="autopilot-note" data-testid="autopilot-watch-next">
              {{ t('bots.autopilot.watch.next', { time: watchCheckTime }) }}
            </p>
          </div>
          <template v-if="stage === 'watching'">
            <button
              v-if="canRefreshDesktopRequest"
              class="autopilot-primary"
              data-testid="autopilot-refresh-desktop"
              type="button"
              :disabled="busy"
              @click="emit('refreshDesktopRequest')"
            >
              {{ t('bots.codex.prepareAgain') }}
            </button>
            <button
              class="autopilot-secondary"
              data-testid="autopilot-watch-stop"
              type="button"
              @click="emit('cancel')"
            >
              {{ t('bots.autopilot.watch.stop') }}
            </button>
          </template>
          <div v-else-if="canResumeWatch" class="autopilot-recovery" data-testid="autopilot-watch-recovery">
            <p class="autopilot-note">
              {{ t(recoveryInput ? 'bots.autopilot.watch.paused' : 'ux.swap.accountUnavailable') }}
            </p>
            <code
              v-if="watchRecovery?.walletAddress"
              class="autopilot-watch-owner"
              data-testid="autopilot-watch-owner"
              >{{ watchRecovery.walletAddress }}</code
            >
            <p v-if="savedWatchFailure" class="autopilot-note" data-testid="autopilot-watch-saved-error">
              {{
                t('bots.autopilot.diagnostics.lastCheckThrough', {
                  time: completedThroughText(savedWatchFailure.completedThrough),
                })
              }}:
              {{ t(savedWatchFailure.errorKey) }}
            </p>
            <button
              v-if="walletConnected && !recoveryInput"
              class="autopilot-secondary"
              data-testid="autopilot-watch-wallet"
              type="button"
              :disabled="busy"
              @click="emit('wallet')"
            >
              {{ t('bots.connectWallet') }}
            </button>
            <button
              class="autopilot-primary autopilot-go"
              data-testid="autopilot-watch-resume"
              type="button"
              :disabled="busy || (walletConnected && !recoveryInput)"
              @click="emit('resumeWatch')"
            >
              {{ t('bots.autopilot.watch.resume') }}
            </button>
            <button
              class="autopilot-secondary"
              data-testid="autopilot-watch-stop"
              type="button"
              @click="emit('cancel')"
            >
              {{ t('bots.autopilot.watch.stop') }}
            </button>
          </div>
          <button
            v-else
            class="autopilot-primary autopilot-go"
            data-testid="autopilot-go"
            type="submit"
            :disabled="busy || !validDraft"
            :aria-describedby="draftError ? draftErrorId : undefined"
          >
            {{ t('bots.autopilot.go') }}
          </button>
          <p v-if="inputAsset && !xorReserveLeavesTooLittle" class="autopilot-note" data-testid="autopilot-fee-reserve">
            {{ feeReserveNote }}
          </p>
          <div
            v-if="walletConnected && inputAsset && (!canResumeWatch || recoveryInput)"
            class="autopilot-setup-funding"
            data-testid="autopilot-setup-funding"
          >
            <p v-if="setupFundingState === 'loading'" class="autopilot-note" role="status">
              {{ t('bots.autopilot.setupFunding.checking') }}
            </p>
            <p v-else-if="setupFundingState === 'error'" class="autopilot-note">
              {{ t('bots.autopilot.setupFunding.unavailable') }}
            </p>
            <template v-else-if="fundingPreflight">
              <p class="autopilot-note" data-testid="autopilot-setup-funding-status">
                {{
                  t(
                    fundingPreflight.sufficient
                      ? 'bots.autopilot.setupFunding.ready'
                      : 'bots.autopilot.setupFunding.short'
                  )
                }}
              </p>
              <p
                v-for="item in fundingPreflight.assets.filter((asset) => asset.shortfallCodec !== '0')"
                :key="item.asset.address"
                class="autopilot-note"
              >
                {{ t('bots.autopilot.setupFunding.missing', { amount: item.shortfall, symbol: item.asset.symbol }) }}
              </p>
            </template>
            <button
              type="button"
              class="autopilot-link"
              data-testid="autopilot-setup-funding-refresh"
              @click="emit('readSetupFunding', inputAsset.address)"
            >
              {{ t('bots.autopilot.setupFunding.refresh') }}
            </button>
            <div v-if="fundingPreflight && !fundingPreflight.sufficient && walletAddress" class="autopilot-address">
              <code>{{ walletAddress }}</code>
              <button type="button" class="autopilot-link" @click="copyAddress">
                {{ t(addressCopied ? 'bots.autopilot.addressCopied' : 'bots.autopilot.copyAddress') }}
              </button>
            </div>
          </div>
          <p v-if="awaitingWallet && !walletConnected" class="autopilot-note" role="status">
            {{ t('bots.connectWallet') }}
          </p>
          <details class="autopilot-details" data-testid="autopilot-settings">
            <summary>{{ t('bots.tradingLimits') }}</summary>
            <div class="autopilot-fields">
              <label class="autopilot-field">
                <span>{{ t('bots.goals.targetLabel') }}</span>
                <input
                  v-model="targetReturnPercent"
                  data-testid="autopilot-target"
                  inputmode="decimal"
                  maxlength="24"
                  :disabled="canResumeWatch"
                  required
                />
              </label>
              <label class="autopilot-field">
                <span>{{ t('bots.goals.drawdownLabel') }}</span>
                <input
                  v-model="maxLossPercent"
                  data-testid="autopilot-loss"
                  inputmode="decimal"
                  maxlength="24"
                  :disabled="canResumeWatch"
                  required
                />
              </label>
              <label class="autopilot-field">
                <span>{{ t('bots.feeBudget') }} (XOR)</span>
                <input
                  v-model="feeBudgetXor"
                  data-testid="autopilot-fee-budget"
                  :disabled="canResumeWatch"
                  inputmode="decimal"
                  maxlength="100"
                  required
                />
              </label>
            </div>
            <p v-if="externalWallet" class="autopilot-note" data-testid="autopilot-external-signing">
              {{ t('bots.externalSigning') }}
            </p>
          </details>
          <details
            v-if="
              walletConnected &&
              walletAddress &&
              (!canResumeWatch || recoveryInput) &&
              (fundingPreflight?.sufficient || !fundingPreflight)
            "
            class="autopilot-details"
          >
            <summary>{{ t('bots.autopilot.deposit') }} · SORA</summary>
            <div class="autopilot-address">
              <code data-testid="autopilot-wallet-address">{{ walletAddress }}</code>
              <button type="button" class="autopilot-link" @click="copyAddress">
                {{ t(addressCopied ? 'bots.autopilot.addressCopied' : 'bots.autopilot.copyAddress') }}
              </button>
            </div>
          </details>
        </fieldset>
        <p
          v-if="desktopMode && desktopConnected"
          class="autopilot-note autopilot-connected"
          data-testid="autopilot-desktop-selected"
        >
          {{ t('bots.autopilot.desktop.connected') }}
          <button
            type="button"
            class="autopilot-link"
            data-testid="autopilot-disconnect-desktop"
            @click="emit('disconnectDesktop')"
          >
            {{ t('bots.autopilot.desktop.disconnect') }}
          </button>
        </p>
        <p
          v-else-if="(stage === 'fund' || stage === 'watching') && aiLabel && !desktopMode"
          class="autopilot-note autopilot-connected"
        >
          {{ aiLabel }} · {{ t('bots.connected') }}
        </p>
      </form>

      <div v-else-if="stage === 'connect' && !apiMode" data-testid="autopilot-desktop-connect">
        <h2>{{ t(desktopConnecting ? 'bots.autopilot.desktop.waiting' : 'bots.autopilot.connectTitle') }}</h2>
        <p v-if="!desktopConnecting" class="autopilot-note">{{ t('bots.autopilot.desktop.noKey') }}</p>
        <button
          v-if="!desktopConnecting"
          type="button"
          class="autopilot-primary"
          data-testid="autopilot-connect-desktop"
          :disabled="busy"
          @click="emit('connectDesktop')"
        >
          {{ t('bots.autopilot.desktop.useApp') }} <span aria-hidden="true">→</span>
        </button>
        <template v-else>
          <p class="autopilot-note" data-testid="autopilot-desktop-waiting">
            {{ t('bots.autopilot.desktop.keepTabOpen') }}
          </p>
          <details class="autopilot-details" data-testid="autopilot-companion-setup">
            <summary>{{ t('bots.autopilot.companion.connect') }}</summary>
            <p class="autopilot-note">
              {{ t('bots.autopilot.companion.setup') }}
              <code>node polkaswap-codex-companion.mjs</code>
            </p>
            <a
              class="autopilot-link"
              data-testid="autopilot-companion-download"
              href="./.well-known/polkaswap-codex-companion.mjs"
              download
            >
              {{ t('bots.autopilot.companion.download') }}
            </a>
            <label class="autopilot-field">
              <span>{{ t('bots.autopilot.companion.code') }}</span>
              <input
                v-model="pairingCode"
                data-testid="autopilot-companion-code"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                maxlength="32"
              />
            </label>
            <button
              type="button"
              class="autopilot-secondary autopilot-alternative"
              data-testid="autopilot-companion-pair"
              :disabled="busy || companionPairing || !validPairingCode"
              @click="pairCompanion"
            >
              {{ t('bots.autopilot.companion.pair') }}
            </button>
            <p v-if="companionError" class="autopilot-error" role="alert" data-testid="autopilot-companion-error">
              {{ t(companionError) }}
            </p>
          </details>
          <a
            v-if="desktopLink"
            class="autopilot-primary"
            data-testid="autopilot-open-desktop"
            :href="desktopLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('bots.autopilot.desktop.openApp') }} <span aria-hidden="true">↗</span>
          </a>
          <details class="autopilot-details" data-testid="autopilot-connection-instructions">
            <summary>{{ t('bots.autopilot.desktop.instructions') }}</summary>
            <label class="autopilot-field">
              <textarea
                :value="desktopPrompt"
                :aria-label="t('bots.codex.prompt')"
                data-testid="autopilot-desktop-prompt"
                rows="4"
                readonly
              />
            </label>
          </details>
          <button
            type="button"
            class="autopilot-link autopilot-alternative"
            data-testid="autopilot-copy-desktop-prompt"
            :disabled="!desktopPrompt"
            @click="copyDesktopPrompt"
          >
            {{ t(promptCopied ? 'bots.codex.copied' : 'bots.autopilot.desktop.copyInstructions') }}
          </button>
          <details class="autopilot-details" data-testid="autopilot-assistant-controls">
            <summary>{{ t('bots.autopilot.desktop.assistantControls') }}</summary>
            <label class="autopilot-field">
              <span>{{ t('bots.autopilot.desktop.connectionId') }}</span>
              <input
                v-model="agentConnectionId"
                data-testid="autopilot-agent-connection-id"
                autocomplete="off"
                maxlength="128"
              />
            </label>
            <button
              type="button"
              class="autopilot-secondary autopilot-alternative"
              data-testid="autopilot-agent-acknowledge"
              :disabled="!agentConnectionId.trim()"
              @click="acknowledgeDesktop"
            >
              {{ t('bots.autopilot.desktop.connectAssistant') }}
            </button>
          </details>
        </template>
        <button
          type="button"
          class="autopilot-link autopilot-alternative"
          data-testid="autopilot-use-api"
          :disabled="busy"
          @click="setApiMode(true)"
        >
          {{ t('bots.codex.useApi') }}
        </button>
      </div>

      <form v-else-if="stage === 'connect'" data-testid="autopilot-connect-form" @submit.prevent="connect">
        <h2>{{ t('bots.autopilot.connectTitle') }}</h2>
        <button
          type="button"
          class="autopilot-link"
          data-testid="autopilot-back-desktop"
          :disabled="busy"
          @click="setApiMode(false)"
        >
          <span aria-hidden="true">←</span> {{ t('bots.autopilot.desktop.back') }}
        </button>
        <fieldset :disabled="busy">
          <label class="autopilot-field">
            <span>{{ t('bots.provider') }}</span>
            <select v-model="provider" data-testid="autopilot-provider">
              <option v-for="option in providers" :key="option" :value="option">
                {{ t(`bots.providers.${option}`) }}
              </option>
            </select>
          </label>
          <label v-if="needsEndpoint" class="autopilot-field">
            <span>{{ t('bots.endpoint') }}</span>
            <input
              v-model="endpoint"
              data-testid="autopilot-endpoint"
              type="url"
              required
              autocomplete="off"
              placeholder="https://"
            />
          </label>
          <p v-if="needsEndpoint" class="autopilot-note">{{ t('bots.autopilot.endpointNote') }}</p>
          <label class="autopilot-field">
            <span>{{ t('bots.apiKey') }}</span>
            <input
              ref="keyInput"
              data-testid="autopilot-key"
              type="password"
              required
              autocomplete="off"
              maxlength="4096"
            />
          </label>
          <p class="autopilot-note">{{ t('bots.autopilot.connectNote') }}</p>
          <button class="autopilot-primary" data-testid="autopilot-connect" type="submit" :disabled="busy">
            {{ t('bots.connect') }} <span aria-hidden="true">→</span>
          </button>
        </fieldset>
      </form>

      <div v-else-if="stage === 'research'" class="autopilot-research">
        <template v-if="desktopPending">
          <h2 role="status" aria-live="polite" aria-atomic="true">
            {{
              t(
                companionConnected && !companionError
                  ? 'bots.autopilot.companion.drafting'
                  : 'bots.autopilot.desktop.sendPrompt'
              )
            }}
          </h2>
          <p v-if="companionError" class="autopilot-error" role="alert" data-testid="autopilot-companion-error">
            {{ t(companionError) }}
          </p>
          <button
            v-if="companionConnected && companionError"
            type="button"
            class="autopilot-secondary autopilot-alternative"
            data-testid="autopilot-companion-retry"
            @click="emit('companionRetry')"
          >
            {{ t('retryText') }}
          </button>
          <a
            v-if="desktopLink && (!companionConnected || companionError)"
            class="autopilot-primary"
            data-testid="autopilot-open-desktop"
            :href="desktopLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('bots.autopilot.desktop.openApp') }} <span aria-hidden="true">↗</span>
          </a>
          <details class="autopilot-details" data-testid="autopilot-connection-instructions">
            <summary>{{ t('bots.autopilot.desktop.instructions') }}</summary>
            <label class="autopilot-field">
              <textarea
                :value="desktopPrompt"
                :aria-label="t('bots.codex.prompt')"
                data-testid="autopilot-desktop-prompt"
                rows="4"
                readonly
              />
            </label>
          </details>
          <button
            type="button"
            class="autopilot-link autopilot-alternative"
            data-testid="autopilot-copy-desktop-prompt"
            :disabled="!desktopPrompt"
            @click="copyDesktopPrompt"
          >
            {{ t(promptCopied ? 'bots.codex.copied' : 'bots.autopilot.desktop.copyInstructions') }}
          </button>
          <details class="autopilot-details" data-testid="autopilot-assistant-controls">
            <summary>{{ t('bots.autopilot.desktop.assistantControls') }}</summary>
            <label class="autopilot-field">
              <span>{{ t('bots.autopilot.desktop.context') }}</span>
              <textarea
                :value="contextPages[contextPage]"
                :aria-describedby="contextPages.length > 1 ? contextPageCountId : undefined"
                data-testid="autopilot-agent-context"
                rows="5"
                readonly
              />
            </label>
            <div v-if="contextPages.length > 1" class="autopilot-context-pages">
              <button
                type="button"
                class="autopilot-link"
                data-testid="autopilot-agent-context-previous"
                :disabled="contextPage === 0"
                @click="contextPage--"
              >
                {{ t('bots.research.previous') }}
              </button>
              <span :id="contextPageCountId" data-testid="autopilot-agent-context-page" aria-live="polite">
                {{ contextPage + 1 }} / {{ contextPages.length }}
              </span>
              <button
                type="button"
                class="autopilot-link"
                data-testid="autopilot-agent-context-next"
                :disabled="contextPage === contextPages.length - 1"
                @click="contextPage++"
              >
                {{ t('bots.research.next') }}
              </button>
            </div>
            <label class="autopilot-field">
              <span>{{ t('bots.autopilot.desktop.draft') }}</span>
              <textarea
                v-model="agentDraft"
                data-testid="autopilot-agent-draft"
                rows="5"
                maxlength="32768"
                spellcheck="false"
              />
            </label>
            <button
              type="button"
              class="autopilot-secondary autopilot-alternative"
              data-testid="autopilot-agent-submit"
              :disabled="!agentDraft.trim() || !desktopContext"
              @click="submitDesktopDraft"
            >
              {{ t('bots.autopilot.desktop.submitDraft') }}
            </button>
          </details>
        </template>
        <template v-else>
          <span class="autopilot-spinner" aria-hidden="true" />
          <h2 role="status" aria-live="polite" aria-atomic="true" data-testid="autopilot-progress">
            {{ progress || t('bots.autopilot.researchTitle') }}
          </h2>
        </template>
      </div>

      <form v-else-if="stage === 'review' && reviewBot" data-testid="autopilot-review-form" @submit.prevent="start">
        <h2>{{ reviewBot.goal?.title ?? t('bots.autopilot.reviewTitle') }}</h2>
        <p class="autopilot-note" data-testid="autopilot-review-budget">
          {{ t('bots.autopilot.budget', { symbol: reviewBot.assetIn.symbol }) }}
        </p>
        <p class="autopilot-review-amount">
          <bdi
            >{{ reviewAllocation }} <small>{{ reviewBot.assetIn.symbol }}</small></bdi
          >
        </p>
        <p class="autopilot-note" data-testid="autopilot-review-trade">
          {{ t('bots.research.perTrade') }}:
          <bdi>{{ reviewBot.strategy.amount }} {{ reviewBot.assetIn.symbol }}</bdi>
        </p>
        <p
          v-if="reviewBot.assetIn.address === reviewBot.policy.feeAsset.address"
          class="autopilot-note"
          data-testid="autopilot-fees-included"
        >
          {{ t('bots.startFlow.feeIncluded') }}
        </p>
        <p v-if="reviewBot.goal" class="autopilot-note">
          {{
            t(reviewBot.goal.lossMetric === 'drawdown' ? 'bots.autopilot.targetDrawdown' : 'bots.autopilot.target', {
              target: reviewBot.goal.targetReturnPercent,
              loss: reviewBot.goal.maxLossPercent,
            })
          }}
        </p>
        <div v-if="funding" class="autopilot-balances" data-testid="autopilot-funding">
          <div v-for="item in funding.assets" :key="item.asset.address">
            <span>{{
              t('bots.autopilot.funding', {
                available: displayAmount(item.availableCodec, item.asset.decimals),
                symbol: item.asset.symbol,
              })
            }}</span>
            <span>{{
              t('bots.autopilot.required', {
                required: displayAmount(item.requiredCodec, item.asset.decimals),
                symbol: item.asset.symbol,
              })
            }}</span>
          </div>
        </div>
        <div v-if="!funding?.sufficient" class="autopilot-deposit" data-testid="autopilot-deposit">
          <p>{{ t('bots.autopilot.deposit') }} · SORA</p>
          <div v-if="walletAddress" class="autopilot-address">
            <code>{{ walletAddress }}</code>
            <button type="button" class="autopilot-link" @click="copyAddress">
              {{ t(addressCopied ? 'bots.autopilot.addressCopied' : 'bots.autopilot.copyAddress') }}
            </button>
          </div>
          <button
            type="button"
            class="autopilot-primary"
            data-testid="autopilot-refresh"
            :disabled="busy"
            @click="emit('refreshFunding')"
          >
            {{ t('bots.autopilot.refreshFunding') }}
          </button>
        </div>
        <p class="autopilot-note autopilot-session">{{ t('bots.autopilot.session') }}</p>
        <p class="autopilot-note">{{ t('bots.autopilot.risk') }}</p>
        <p v-if="externalWallet" class="autopilot-note" data-testid="autopilot-external-signing">
          {{ t('bots.externalSigning') }}
        </p>
        <p v-if="!externalWallet" class="autopilot-note">{{ t('bots.autopilot.unlockNote') }}</p>
        <details class="autopilot-details">
          <summary>{{ t('bots.tradingLimits') }}</summary>
          <dl class="autopilot-limits">
            <div>
              <dt>{{ t('bots.allowedPair') }}</dt>
              <dd>{{ reviewBot.assetIn.symbol }} / {{ reviewBot.assetOut.symbol }}</dd>
            </div>
            <div>
              <dt>{{ t('bots.feeBudget') }}</dt>
              <dd>
                {{ displayAmount(reviewBot.policy.feeBudgetCodec, reviewBot.policy.feeAsset.decimals) }}
                {{ reviewBot.policy.feeAsset.symbol }}
              </dd>
            </div>
            <div>
              <dt>{{ t('bots.slippage') }}</dt>
              <dd>{{ reviewBot.policy.slippagePercent }}%</dd>
            </div>
            <div>
              <dt>{{ t('bots.priceImpact') }}</dt>
              <dd>{{ reviewBot.policy.maxPriceImpactPercent }}%</dd>
            </div>
            <div v-for="asset in [reviewBot.assetIn, reviewBot.assetOut]" :key="asset.address">
              <dt>{{ t('bots.maxTrade') }} ({{ asset.symbol }})</dt>
              <dd>{{ displayAmount(reviewBot.policy.maxTradeCodec[asset.address] ?? '0', asset.decimals) }}</dd>
            </div>
          </dl>
          <p class="autopilot-note">{{ t('bots.appLimitsNotice') }}</p>
        </details>
        <fieldset v-if="funding?.sufficient" :disabled="busy">
          <label v-if="!externalWallet" class="autopilot-field"
            ><span>{{ t('bots.walletPassword') }}</span>
            <input
              ref="passwordInput"
              data-testid="autopilot-password"
              type="password"
              autocomplete="current-password"
            />
          </label>
          <label class="autopilot-consent">
            <input v-model="consented" data-testid="autopilot-consent" type="checkbox" required />
            <span>{{ t('bots.consentAcknowledgment') }}</span>
          </label>
          <button class="autopilot-primary" data-testid="autopilot-start" type="submit" :disabled="busy || !consented">
            {{ t(externalWallet ? 'bots.authorizeStart' : 'bots.autopilot.start') }} <span aria-hidden="true">→</span>
          </button>
        </fieldset>
      </form>

      <div v-else-if="stage === 'running' && displayBot" class="autopilot-running">
        <h2>{{ displayBot.goal?.title ?? displayBot.name }}</h2>
        <p class="autopilot-note">
          {{ t(`bots.status.${runtimeStatus}`) }} · {{ displayBot.assetIn.symbol }} / {{ displayBot.assetOut.symbol }}
        </p>
        <BotGoalProgress v-if="displayBot.goal" :bot="displayBot" :runtime-status="runtimeStatus" :orders="orders" />
        <dl v-if="exactProgress.kind === 'legacy'" class="autopilot-limits autopilot-holdings">
          <div v-for="asset in [displayBot.assetIn, displayBot.assetOut]" :key="asset.address">
            <dt>{{ asset.symbol }}</dt>
            <dd>{{ displayAmount(displayBot.portfolio.holdings[asset.address] ?? '0', asset.decimals) }}</dd>
          </div>
          <div>
            <dt>{{ t('bots.swaps') }}</dt>
            <dd>{{ displayBot.portfolio.trades }}</dd>
          </div>
        </dl>
        <p v-if="exactProgress.kind === 'legacy' || runtimeStatus === 'running'" class="autopilot-note">
          {{ t('bots.autopilot.session') }}
        </p>
        <div class="autopilot-actions">
          <button
            v-if="goalCompleted && exactProgress.kind === 'legacy'"
            type="button"
            class="autopilot-primary"
            data-testid="autopilot-new-goal"
            :disabled="busy"
            @click="emit('begin')"
          >
            {{ t('bots.goals.create') }}
          </button>
          <button
            v-else-if="runtimeStatus === 'running'"
            type="button"
            class="autopilot-primary"
            data-testid="autopilot-pause"
            :disabled="busy"
            @click="emit('pause', displayBot.id)"
          >
            {{ t('bots.pause') }}
          </button>
          <button
            v-else-if="exactProgress.kind === 'legacy' || (exactProgress.kind === 'exact' && !exactProgress.terminal)"
            type="button"
            class="autopilot-primary"
            data-testid="autopilot-resume"
            :disabled="busy || (exactProgress.kind === 'exact' && !exactProgress.canResume)"
            @click="emit('resume', displayBot.id)"
          >
            {{ t('bots.resume') }}
          </button>
          <button
            type="button"
            class="autopilot-secondary"
            v-if="exactProgress.kind === 'legacy'"
            data-testid="autopilot-stop"
            :disabled="busy || displayBot.status === 'stopped'"
            @click="emit('stop', displayBot.id)"
          >
            {{ t('bots.stop') }}
          </button>
        </div>
      </div>
      <details
        v-if="desktopMode && desktopConnected && !companionConnected"
        class="autopilot-details"
        data-testid="autopilot-companion-repair"
      >
        <summary>{{ t('bots.autopilot.companion.connect') }}</summary>
        <p v-if="companionError" class="autopilot-error" role="alert">{{ t(companionError) }}</p>
        <p class="autopilot-note">{{ t('bots.autopilot.companion.setup') }}</p>
        <code>node polkaswap-codex-companion.mjs</code>
        <a
          class="autopilot-link"
          data-testid="autopilot-companion-repair-download"
          href="./.well-known/polkaswap-codex-companion.mjs"
          download
        >
          {{ t('bots.autopilot.companion.download') }}
        </a>
        <label class="autopilot-field">
          <span>{{ t('bots.autopilot.companion.code') }}</span>
          <input
            v-model="pairingCode"
            data-testid="autopilot-companion-repair-code"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            maxlength="32"
          />
        </label>
        <button
          type="button"
          class="autopilot-secondary autopilot-alternative"
          data-testid="autopilot-companion-repair-pair"
          :disabled="companionPairing || !validPairingCode"
          @click="pairCompanion"
        >
          {{ t('bots.autopilot.companion.pair') }}
        </button>
      </details>
    </div>

    <p v-if="!setupForm && displayError" class="autopilot-error" role="alert" data-testid="autopilot-error">
      {{ displayError }}
    </p>
    <p v-if="busy && stage !== 'research' && progress" class="autopilot-note" role="status">{{ progress }}</p>
    <button
      v-if="stage !== 'welcome' && stage !== 'running' && stage !== 'watching'"
      type="button"
      class="autopilot-link autopilot-cancel"
      data-testid="autopilot-cancel"
      @click="emit('cancel')"
    >
      {{ t('bots.goals.cancel') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { codec, fromCodec, toCodec } from '@/features/bot-trading/amounts';
import { assessBotFundingPreflight } from '@/features/bot-trading/funding-preflight';
import { copyBotGoal } from '@/features/bot-trading/goals';
import { useExactGoalProgress } from '../goal-progress-view';
import BotGoalProgress from '@/features/bot-trading/components/BotGoalProgress.vue';
import type { BotFundingPreview } from '@/features/bot-trading/live';
import type { AutopilotWatchRecovery } from '@/features/bot-trading/autopilot-watch-checkpoint';
import type {
  AutopilotQualificationDiagnostics,
  AutopilotQualificationReason,
  AutopilotScreeningReason,
} from '@/features/bot-trading/autopilot-diagnostics';
import type { BotAsset, BotDefinition, BotProvider, BotStatus, BotOrder } from '@/features/bot-trading/types';
import { VAL, XOR } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';

defineOptions({ name: 'BotAutopilot' });

/** Presentation-only onboarding: the parent owns research, balances, authorization, and execution. */
const props = withDefaults(
  defineProps<{
    assets: BotAsset[];
    bots: BotDefinition[];
    orders?: readonly BotOrder[] | null;
    walletConnected: boolean;
    awaitingWallet?: boolean;
    walletAddress: string;
    externalWallet: boolean;
    stage: 'welcome' | 'connect' | 'fund' | 'research' | 'watching' | 'review' | 'running';
    watchNextCheckAt?: number | null;
    diagnosticsCompletedThrough?: number | null;
    canResumeWatch?: boolean;
    watchRecovery?: AutopilotWatchRecovery | null;
    recoveryInput?: {
      assetInAddress: string;
      assetOutAddress: string;
      capital: string;
      feeBudgetXor: string;
      targetReturnPercent: string;
      maxLossPercent: string;
    } | null;
    canRefreshDesktopRequest?: boolean;
    busy: boolean;
    error: string;
    diagnostics?: AutopilotQualificationDiagnostics | null;
    aiLabel: string;
    progress: string;
    reviewBot: BotDefinition | null;
    funding: BotFundingPreview | null;
    setupFunding?: { assetInAddress: string; assetInCodec: string; xorCodec: string } | null;
    setupFundingState?: 'idle' | 'loading' | 'ready' | 'error';
    fundingIdentity?: string;
    activeIds: string[];
    selectedBot: BotDefinition | null;
    desktopSupported?: boolean;
    desktopConnecting?: boolean;
    desktopConnected?: boolean;
    desktopPending?: boolean;
    desktopMode?: boolean;
    desktopLink?: string;
    desktopPrompt?: string;
    desktopConnectionId?: string;
    desktopContext?: string;
    companionConnected?: boolean;
    companionPairing?: boolean;
    companionError?: string;
  }>(),
  {
    awaitingWallet: false,
    watchNextCheckAt: null,
    diagnosticsCompletedThrough: null,
    canResumeWatch: false,
    watchRecovery: null,
    recoveryInput: null,
    canRefreshDesktopRequest: false,
    diagnostics: null,
    desktopSupported: false,
    desktopConnecting: false,
    desktopConnected: false,
    desktopPending: false,
    desktopMode: false,
    desktopLink: '',
    desktopPrompt: '',
    desktopConnectionId: '',
    desktopContext: '',
    companionConnected: false,
    companionPairing: false,
    companionError: '',
    setupFunding: null,
    setupFundingState: 'idle',
    fundingIdentity: '',
  }
);
const emit = defineEmits<{
  begin: [];
  connect: [connection: { provider: BotProvider; apiKey: string; endpoint: string }];
  connectDesktop: [];
  disconnectDesktop: [];
  desktopAcknowledge: [connectionId: string];
  desktopDraft: [json: string];
  companionPair: [code: string];
  companionRetry: [];
  refreshDesktopRequest: [];
  resumeWatch: [];
  wallet: [];
  go: [
    draft: {
      assetInAddress: string;
      assetOutAddress: string;
      capital: string;
      feeBudgetXor: string;
      targetReturnPercent: string;
      maxLossPercent: string;
      title: string;
    },
  ];
  refreshFunding: [];
  readSetupFunding: [assetInAddress: string];
  start: [authorization: { password: string }];
  cancel: [];
  advanced: [];
  pause: [id: string];
  stop: [id: string];
  resume: [id: string];
}>();
const { t } = useTranslation();
const providers: BotProvider[] = ['openai', 'claude', 'jev', 'custom'];
const provider = ref<BotProvider>('openai');
const apiMode = ref(false);
const endpoint = ref('');
const keyInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);
const localError = ref('');
const draftErrorId = useId();
const setupForm = computed(() => ['welcome', 'fund', 'watching'].includes(props.stage));
/** A saved watch remains the owner of its form while the wallet or node is still initializing. */
const watchOwnsForm = computed(() => Boolean(props.watchRecovery || props.canResumeWatch || props.recoveryInput));
/** Stored explanations are historical only; they never become a new check or validation result. */
const savedWatchFailure = computed(() => {
  if (!props.canResumeWatch) return null;
  const watch = props.watchRecovery;
  return watch?.lastFailure && watch.lastFailure.completedThrough > (watch.trainingDiagnostics?.completedThrough ?? 0)
    ? watch.lastFailure
    : null;
});
const shownDiagnostics = computed<AutopilotQualificationDiagnostics | null>(
  () =>
    props.diagnostics ??
    (props.canResumeWatch && !savedWatchFailure.value ? (props.watchRecovery?.trainingDiagnostics ?? null) : null)
);
/** Display a real scheduled boundary, including its date for unused validation windows. */
const watchCheckTime = computed(() => {
  const at = props.watchNextCheckAt;
  return at && Number.isSafeInteger(at)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(at)
    : '';
});
/** Format only a verified completed-hour boundary, never a page check or wall-clock time. */
const completedThroughText = (at: number | null | undefined) =>
  at && Number.isSafeInteger(at) && at > 0 && at % 3_600_000 === 0
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(at)
    : '';
const diagnosticsDataThrough = computed(() =>
  props.diagnostics
    ? completedThroughText(props.diagnosticsCompletedThrough)
    : shownDiagnostics.value
      ? completedThroughText(props.watchRecovery?.trainingDiagnostics?.completedThrough)
      : ''
);
/** An error-only watch uses the same verified data hour as a failed qualification. */
const watchErrorDataThrough = computed(() =>
  props.error && !props.diagnostics ? completedThroughText(props.diagnosticsCompletedThrough) : ''
);
/** Date both inputs to this scenario: the fee quote and the earlier completed-hour pool mark. */
const feePressureTimes = computed(() => {
  const evidence = props.diagnostics?.feePressure;
  if (!evidence) return { time: '', markTime: '' };
  const format = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
  return { time: format.format(evidence.observedAt), markTime: format.format(evidence.markAt) };
});
/** Keep the dated fee estimate consistent in the visible watch status and collapsed explanation. */
const feePressureMessage = computed(() => {
  const evidence = props.diagnostics?.feePressure;
  return evidence
    ? t('bots.autopilot.diagnostics.feePressure', {
        time: feePressureTimes.value.time,
        markTime: feePressureTimes.value.markTime,
        share: evidence.sharePercent,
        limit: evidence.maxLossPercent,
      })
    : '';
});
const displayError = computed(() => props.error || (localError.value ? t(localError.value) : ''));
/** Give a dated watch failure one accurate completed-hour prefix with stable spacing. */
const watchErrorMessage = computed(() =>
  watchErrorDataThrough.value
    ? `${t('bots.autopilot.diagnostics.lastCheckThrough', { time: watchErrorDataThrough.value })}: ${displayError.value}`
    : displayError.value
);
/** Reuse precise translated errors for causal training blocks without expanding the simple form. */
const diagnosticMessages: Record<AutopilotQualificationReason, string> = {
  coverage: 'bots.autopilot.diagnostics.coverage',
  insufficientTrades: 'bots.autopilot.diagnostics.insufficientTrades',
  netLoss: 'bots.autopilot.diagnostics.netLoss',
  drawdown: 'bots.autopilot.diagnostics.drawdown',
  priceImpact: 'historyErrorMessages.liquidityproxy.slippagenottolerated',
  goalTradeCost: 'bots.errors.goalTradeCost',
  feeBudget: 'bots.errors.feeBudget',
};
/** Quote-screening labels never suggest a draft reached backtesting or disclose the quoted values. */
const screeningMessages: Record<AutopilotScreeningReason, string> = {
  quoteUnavailable: 'bots.autopilot.diagnostics.quoteUnavailable',
  priceImpact: 'historyErrorMessages.liquidityproxy.slippagenottolerated',
  feeBudget: 'bots.errors.feeBudget',
  noSmallerExactSample: 'bots.autopilot.diagnostics.noSmallerExactSample',
};
/** Display a lower bound without rounding a failed limit down to an apparent pass. */
const openingExplanation = computed(() => {
  const evidence = props.diagnostics?.stage === 'opening' ? props.diagnostics.opening : undefined;
  if (!evidence) return null;
  const roundedLoss = new FPNumber(evidence.lossPercent, 36).value.toFixed(2, 1);
  const loss = new FPNumber(roundedLoss, 36).gt(new FPNumber(evidence.maxLossPercent, 36))
    ? roundedLoss
    : evidence.lossPercent;
  const utc = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
  return {
    bound: { loss, symbol: evidence.valuationSymbol, limit: evidence.maxLossPercent },
    dates: { opened: utc(evidence.openedAt), firstTrade: utc(evidence.firstTradeAt), zone: 'UTC' },
  };
});
const consented = ref(false);
const addressCopied = ref(false);
const promptCopied = ref(false);
const agentConnectionId = ref('');
const agentDraft = ref('');
const pairingCode = ref('');
const validPairingCode = computed(() => /^[0-9a-fA-F]{32}$/.test(pairingCode.value.trim()));
const contextPage = ref(0);
const contextPageCountId = useId();
/** Bound each native accessibility value while preserving every original UTF-16 unit in order. */
const contextPages = computed(() => {
  const value = props.desktopContext;
  const pages: string[] = [];
  for (let start = 0; start < value.length; ) {
    let end = Math.min(start + 6_000, value.length);
    if (
      end < value.length &&
      value.charCodeAt(end - 1) >= 0xd800 &&
      value.charCodeAt(end - 1) <= 0xdbff &&
      value.charCodeAt(end) >= 0xdc00 &&
      value.charCodeAt(end) <= 0xdfff
    )
      end--;
    pages.push(value.slice(start, end));
    start = end;
  }
  return pages.length ? pages : [''];
});
const submitted = ref(false);
const capital = ref('');
const assetInAddress = ref('');
const assetOutAddress = ref('');
const feeBudgetXor = ref('1');
const targetReturnPercent = ref('5');
const maxLossPercent = ref('5');
const DRAFT_STORAGE_KEY = 'polkaswap-bots-go-draft-v1';
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const DRAFT_FIELDS = [
  'version',
  'savedAt',
  'identity',
  'walletAddress',
  'assetInAddress',
  'assetOutAddress',
  'capital',
  'feeBudgetXor',
  'targetReturnPercent',
  'maxLossPercent',
] as const;
type StoredDraft = {
  version: 1;
  savedAt: number;
  identity: string;
  walletAddress: string;
  assetInAddress: string;
  assetOutAddress: string;
  capital: string;
  feeBudgetXor: string;
  targetReturnPercent: string;
  maxLossPercent: string;
};
let draftIdentity = '';
let draftHydrated = false;
let pendingDraftIdentity = '';
let draftDirty = false;
let draftEditScope: { walletAddress: string; source?: string } | null = null;
let applyingStoredDraft = false;
let recoveryOwnedForm = false;

/** Compare public intent by wallet and chain; connection details still bind every funding/review request. */
function publicDraftIdentity(
  identity: string
): { key: string; ready: boolean; account?: string; source?: string } | null {
  if (!identity || identity.length > 1_024) return null;
  let value: unknown;
  try {
    value = JSON.parse(identity);
  } catch {
    // JSON-looking malformed identities must never become opaque legacy identities.
    return /^(?:\[|[{"\d-]|true\b|false\b|null\b)/.test(identity.trimStart())
      ? null
      : { key: JSON.stringify(['opaque', identity]), ready: true };
  }
  if (
    !Array.isArray(value) ||
    value.length !== 7 ||
    typeof value[0] !== 'boolean' ||
    typeof value[3] !== 'boolean' ||
    [1, 2, 4, 5].some((index) => typeof value[index] !== 'string' || value[index].length > 1_024) ||
    !Number.isSafeInteger(value[6]) ||
    value[6] < 0
  )
    return null;
  // Empty node metadata and runtime zero are normal while a fresh handshake is pending.
  return {
    key: value[1] && value[2] && value[4] ? JSON.stringify(['structured', value[1], value[2], value[4]]) : '',
    ready: value[0] && value[3] && Boolean(value[1] && value[2] && value[4] && value[5]) && value[6] > 0,
    account: value[1],
    source: value[2],
  };
}

/** A delayed wallet or node snapshot must not rebind public inputs to another account. */
function currentDraftIdentity(): { key: string; ready: boolean; source?: string } | null {
  const identity = publicDraftIdentity(props.fundingIdentity);
  if (!identity) return null;
  if (identity.account !== undefined && identity.account !== props.walletAddress)
    return { key: '', ready: false, source: identity.source };
  return {
    key: identity.key ? JSON.stringify([props.walletAddress, identity.key]) : '',
    ready: identity.ready,
    source: identity.source,
  };
}

/** Remove a malformed or superseded public draft without depending on storage availability. */
function forgetStoredDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Private browsing may make tab storage unavailable; the form remains usable.
  }
}

/** Restore exact public inputs; undefined waits for the saved pair's metadata without consuming the draft. */
function readStoredDraft(identity: string): StoredDraft | null | undefined {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > 2_048) throw new Error('draft');
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('draft');
    const entry = value as Record<string, unknown>;
    if (
      Object.keys(entry).length !== DRAFT_FIELDS.length ||
      DRAFT_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(entry, field)) ||
      entry.version !== 1 ||
      !Number.isSafeInteger(entry.savedAt) ||
      (entry.savedAt as number) > Date.now() ||
      (entry.savedAt as number) < Date.now() - DRAFT_LIFETIME_MS ||
      entry.walletAddress !== props.walletAddress
    )
      throw new Error('draft');
    for (const field of ['identity', 'walletAddress', 'assetInAddress', 'assetOutAddress'] as const)
      if (typeof entry[field] !== 'string' || !entry[field] || entry[field].length > 1_024) throw new Error('draft');
    const savedIdentity = publicDraftIdentity(entry.identity as string);
    if (
      !savedIdentity?.key ||
      JSON.stringify([entry.walletAddress, savedIdentity.key]) !== identity ||
      entry.assetInAddress === entry.assetOutAddress
    )
      throw new Error('draft');
    for (const field of ['capital', 'feeBudgetXor', 'targetReturnPercent', 'maxLossPercent'] as const)
      if (typeof entry[field] !== 'string' || entry[field].length > 100 || !/^\d+(?:\.\d+)?$/.test(entry[field]))
        throw new Error('draft');
    const input = props.assets.find((asset) => asset.address === entry.assetInAddress);
    const output = props.assets.find((asset) => asset.address === entry.assetOutAddress);
    if (!input || !output) return undefined;
    const capitalCodec = codec(toCodec(entry.capital, input.decimals));
    const reserveCodec = codec(toCodec(entry.feeBudgetXor, XOR.decimals));
    if (capitalCodec < 2n || !reserveCodec || (input.address === XOR.address && capitalCodec - reserveCodec < 2n))
      throw new Error('draft');
    copyBotGoal({
      title: t('bots.autopilot.maximizeGoal', { symbol: output.symbol }),
      targetReturnPercent: entry.targetReturnPercent,
      maxLossPercent: entry.maxLossPercent,
      durationMs: 86_400_000,
    });
    return entry as StoredDraft;
  } catch {
    forgetStoredDraft();
    return null;
  }
}

/** Reset only public fields and their hydration state without emitting user-edit events. */
function resetPublicDraft(): void {
  applyingStoredDraft = true;
  capital.value = '';
  assetInAddress.value =
    props.assets.find((asset) => asset.address === XOR.address)?.address ?? props.assets[0]?.address ?? '';
  assetOutAddress.value =
    props.assets.find((asset) => asset.address === VAL.address && asset.address !== assetInAddress.value)?.address ??
    props.assets.find((asset) => asset.address !== assetInAddress.value)?.address ??
    '';
  feeBudgetXor.value = '1';
  targetReturnPercent.value = '5';
  maxLossPercent.value = '5';
  applyingStoredDraft = false;
  draftIdentity = '';
  draftHydrated = false;
  pendingDraftIdentity = '';
  draftDirty = false;
  draftEditScope = null;
}

/** A reload restores the visible draft only; no watcher, AI bearer, or authorization is resumed. */
function restoreStoredDraft(): void {
  // A paused watch owns its exact public input while wallet and node identity finish initializing.
  if (watchOwnsForm.value) return;
  if (!props.walletConnected || !props.walletAddress || !props.fundingIdentity) return;
  const current = currentDraftIdentity();
  if (!current) {
    forgetStoredDraft();
    resetPublicDraft();
    return;
  }
  if (
    draftDirty &&
    draftEditScope &&
    (draftEditScope.walletAddress !== props.walletAddress ||
      (draftEditScope.source && draftEditScope.source !== current.source))
  ) {
    forgetStoredDraft();
    resetPublicDraft();
  }
  if (!current.key) return;
  const identity = current.key;
  if (draftHydrated && draftIdentity === identity) {
    if (draftDirty) persistStoredDraft();
    return;
  }
  if (draftHydrated || recoveryOwnedForm || (pendingDraftIdentity && pendingDraftIdentity !== identity)) {
    if (draftHydrated || pendingDraftIdentity) forgetStoredDraft();
    resetPublicDraft();
  }
  recoveryOwnedForm = false;
  // Inputs explicitly entered before the first handshake supersede an untouched saved form.
  if (!draftHydrated && draftDirty) {
    draftIdentity = identity;
    draftHydrated = true;
    pendingDraftIdentity = '';
    forgetStoredDraft();
    persistStoredDraft();
    return;
  }
  draftHydrated = false;
  pendingDraftIdentity = identity;
  if (!current.ready || !props.assets.length) return;
  const stored = readStoredDraft(identity);
  if (stored === undefined) return;
  draftIdentity = identity;
  draftHydrated = true;
  pendingDraftIdentity = '';
  if (!stored) return;
  applyingStoredDraft = true;
  assetInAddress.value = stored.assetInAddress;
  assetOutAddress.value = stored.assetOutAddress;
  capital.value = stored.capital;
  feeBudgetXor.value = stored.feeBudgetXor;
  targetReturnPercent.value = stored.targetReturnPercent;
  maxLossPercent.value = stored.maxLossPercent;
  applyingStoredDraft = false;
}

/** Save a valid, public form draft in this tab; never save connection or signing material. */
function persistStoredDraft(): void {
  if (applyingStoredDraft || watchOwnsForm.value) return;
  const current = currentDraftIdentity();
  if (!draftDirty) draftEditScope = { walletAddress: props.walletAddress, source: current?.source };
  draftDirty = true;
  if (!props.walletConnected || !current?.key) return;
  // An explicit edit supersedes a deferred restore; late asset metadata must not overwrite the newer intent.
  if (!draftHydrated && pendingDraftIdentity === current.key) {
    draftIdentity = current.key;
    draftHydrated = true;
    pendingDraftIdentity = '';
    forgetStoredDraft();
  }
  if (
    !draftHydrated ||
    !current.ready ||
    draftIdentity !== current.key ||
    !props.assets.some((asset) => asset.address === assetInAddress.value) ||
    !props.assets.some((asset) => asset.address === assetOutAddress.value)
  )
    return;
  if (!validDraft.value) {
    forgetStoredDraft();
    draftDirty = false;
    return;
  }
  const draft: StoredDraft = {
    version: 1,
    savedAt: Date.now(),
    identity: props.fundingIdentity,
    walletAddress: props.walletAddress,
    assetInAddress: assetInAddress.value,
    assetOutAddress: assetOutAddress.value,
    capital: capital.value,
    feeBudgetXor: feeBudgetXor.value,
    targetReturnPercent: targetReturnPercent.value,
    maxLossPercent: maxLossPercent.value,
  };
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    draftDirty = false;
  } catch {
    // Storage access is optional; GO still uses the current validated form.
  }
}
const needsEndpoint = computed(() => provider.value === 'jev' || provider.value === 'custom');
const inputAsset = computed(() => props.assets.find((asset) => asset.address === assetInAddress.value));
/** Show the configured reserve before research; this does not claim the wallet is funded. */
const feeReserveNote = computed(() =>
  t(assetInAddress.value === XOR.address ? 'bots.autopilot.feeReserveIncluded' : 'bots.autopilot.feeReserveSeparate', {
    amount: feeBudgetXor.value,
    symbol: XOR.symbol,
  })
);
/** Present a balance hint from a fresh wallet read; final funding approval remains authoritative. */
const fundingPreflight = computed(() => {
  const input = inputAsset.value;
  const snapshot = props.setupFunding;
  if (!input || !snapshot || snapshot.assetInAddress !== input.address || props.setupFundingState !== 'ready')
    return null;
  try {
    return assessBotFundingPreflight({
      inputAsset: input,
      capitalCodec: toCodec(capital.value, input.decimals),
      feeReserveXorCodec: toCodec(feeBudgetXor.value, XOR.decimals),
      availableCodecByAddress: { [input.address]: snapshot.assetInCodec, [XOR.address]: snapshot.xorCodec },
    });
  } catch {
    return null;
  }
});
const outputAsset = computed(() => props.assets.find((asset) => asset.address === assetOutAddress.value));
const tradeAssets = computed(() => props.assets.filter((asset) => asset.address !== assetInAddress.value));
const displayBot = computed(() => props.selectedBot ?? props.bots[0] ?? null);
const goalCompleted = computed(() => {
  const outcome = displayBot.value?.goalState?.outcome;
  return outcome !== undefined && outcome !== 'active';
});
const runtimeStatus = computed<BotStatus>(() => {
  const bot = displayBot.value;
  if (!bot) return 'idle';
  return bot.status === 'running' && !props.activeIds.includes(bot.id) ? 'paused' : bot.status;
});
const exactProgress = useExactGoalProgress(() => ({
  bot: displayBot.value,
  runtimeStatus: runtimeStatus.value,
  orders: props.orders,
}));
const reviewAllocation = computed(() => {
  const bot = props.reviewBot;
  if (!bot) return '—';
  return displayAmount(bot.portfolio.initial[bot.assetIn.address] ?? '0', bot.assetIn.decimals);
});

watch(
  [() => props.assets, watchOwnsForm],
  () => {
    if (watchOwnsForm.value) return;
    if (!assetInAddress.value) {
      applyingStoredDraft = true;
      assetInAddress.value =
        props.assets.find((asset) => asset.address === XOR.address)?.address ?? props.assets[0]?.address ?? '';
      applyingStoredDraft = false;
    }
  },
  { immediate: true }
);
watch(
  () => [
    props.walletConnected,
    props.walletAddress,
    props.fundingIdentity,
    assetInAddress.value,
    setupForm.value,
    props.canResumeWatch,
    props.recoveryInput,
  ],
  () => {
    if (
      setupForm.value &&
      props.walletConnected &&
      props.walletAddress &&
      inputAsset.value &&
      (!props.canResumeWatch || props.recoveryInput)
    )
      emit('readSetupFunding', inputAsset.value.address);
  },
  { immediate: true }
);
watch(
  [tradeAssets, watchOwnsForm],
  ([assets]) => {
    if (watchOwnsForm.value) return;
    if (!assetOutAddress.value || assetOutAddress.value === assetInAddress.value) {
      applyingStoredDraft = true;
      assetOutAddress.value =
        assets.find((asset) => asset.address === VAL.address)?.address ?? assets[0]?.address ?? '';
      applyingStoredDraft = false;
    }
  },
  { immediate: true }
);
watch(
  () => [
    props.walletConnected,
    props.walletAddress,
    props.fundingIdentity,
    props.assets,
    props.canResumeWatch,
    props.recoveryInput,
    props.watchRecovery,
  ],
  restoreStoredDraft,
  { immediate: true }
);
/** A watch checkpoint outlives the ordinary form draft and remains the exact visible recovery plan. */
watch(
  () => props.watchRecovery?.input ?? props.recoveryInput,
  (input) => {
    if (!input) return;
    applyingStoredDraft = true;
    recoveryOwnedForm = true;
    assetInAddress.value = input.assetInAddress;
    assetOutAddress.value = input.assetOutAddress;
    capital.value = input.capital;
    feeBudgetXor.value = input.feeBudgetXor;
    targetReturnPercent.value = input.targetReturnPercent;
    maxLossPercent.value = input.maxLossPercent;
    applyingStoredDraft = false;
  },
  { immediate: true }
);
watch(provider, () => {
  clearSecrets();
  endpoint.value = '';
  localError.value = '';
});
watch(
  () => props.stage,
  () => {
    if (props.stage === 'connect') apiMode.value = false;
    pairingCode.value = '';
  }
);
watch(
  () => props.desktopPrompt,
  () => {
    promptCopied.value = false;
  }
);
watch(
  () => [props.desktopConnectionId, props.desktopConnecting],
  () => {
    agentConnectionId.value = '';
    pairingCode.value = '';
  }
);
watch(
  () => [props.desktopContext, props.desktopPending],
  () => {
    agentDraft.value = '';
  }
);
watch(
  () => [props.desktopContext, props.desktopPending, props.desktopConnectionId, props.desktopConnected, props.stage],
  () => {
    contextPage.value = 0;
  },
  { flush: 'sync' }
);
watch(
  () => [props.stage, props.reviewBot?.id, props.walletAddress, props.externalWallet],
  () => {
    clearSecrets();
    consented.value = false;
    addressCopied.value = false;
    promptCopied.value = false;
    localError.value = '';
  },
  { flush: 'sync' }
);
// Editing a queued goal invalidates its continuation before a late wallet connection can use old amounts.
watch(
  [capital, assetInAddress, assetOutAddress, feeBudgetXor, targetReturnPercent, maxLossPercent],
  () => {
    if (!applyingStoredDraft && (props.awaitingWallet || props.stage === 'watching' || props.canResumeWatch))
      emit('cancel');
  },
  { flush: 'sync' }
);
onBeforeUnmount(clearSecrets);

/** Send a single-use pairing code only through the explicit local connection action. */
function pairCompanion(): void {
  const reconnecting = props.desktopMode && props.desktopConnected && !props.companionConnected;
  if (
    (!props.desktopConnecting && !reconnecting) ||
    (props.busy && !reconnecting) ||
    props.companionPairing ||
    !validPairingCode.value
  )
    return;
  const code = pairingCode.value.trim();
  pairingCode.value = '';
  emit('companionPair', code);
}

/** A partial order must be smaller than the input budget, requiring two base units. */
const capitalBelowTradeMinimum = computed(() => {
  if (!inputAsset.value) return false;
  try {
    const budget = codec(toCodec(capital.value, inputAsset.value.decimals));
    return budget > 0n && budget < 2n;
  } catch {
    return false;
  }
});
/** The protected XOR reserve must leave those two units in spendable capital. */
const xorReserveLeavesTooLittle = computed(() => {
  if (inputAsset.value?.address !== XOR.address) return false;
  try {
    const budget = codec(toCodec(capital.value, XOR.decimals));
    const reserve = codec(toCodec(feeBudgetXor.value, XOR.decimals));
    return budget > 0n && reserve > 0n && budget - reserve < 2n;
  } catch {
    return false;
  }
});

/** Validate exact decimal strings before allowing research; no amount is rounded for convenience. */
const validationError = computed(() => {
  if (!inputAsset.value || !tradeAssets.value.some((asset) => asset.address === assetOutAddress.value))
    return 'bots.goals.errors.pair';
  try {
    if (!codec(toCodec(capital.value, inputAsset.value.decimals))) return 'bots.goals.errors.capital';
  } catch {
    return 'bots.goals.errors.capital';
  }
  try {
    if (!codec(toCodec(feeBudgetXor.value, XOR.decimals))) return 'bots.goals.errors.fee';
  } catch {
    return 'bots.goals.errors.fee';
  }
  if (xorReserveLeavesTooLittle.value) return 'bots.autopilot.errors.xorReserve';
  if (capitalBelowTradeMinimum.value) return 'bots.autopilot.errors.tradeBudget';
  try {
    copyBotGoal({
      title: t('bots.autopilot.maximizeGoal', { symbol: outputAsset.value?.symbol ?? '' }),
      targetReturnPercent: targetReturnPercent.value,
      maxLossPercent: maxLossPercent.value,
      durationMs: 86_400_000,
    });
  } catch {
    return 'bots.goals.errors.percent';
  }
  return '';
});
const validDraft = computed(() => !validationError.value);
watch(
  [capital, assetInAddress, assetOutAddress, feeBudgetXor, targetReturnPercent, maxLossPercent],
  persistStoredDraft,
  {
    flush: 'sync',
  }
);
const draftError = computed(() =>
  (submitted.value || xorReserveLeavesTooLittle.value || capitalBelowTradeMinimum.value) && validationError.value
    ? t(validationError.value)
    : displayError.value
);

/** Secrets live only in their input elements until this explicit action hands them to the parent. */
function clearSecrets(): void {
  if (keyInput.value) keyInput.value.value = '';
  if (passwordInput.value) passwordInput.value.value = '';
}

/** Switching assistants drops any unsubmitted key before removing the credential field. */
function setApiMode(enabled: boolean): void {
  clearSecrets();
  localError.value = '';
  if (enabled && (props.desktopConnecting || props.desktopConnected || props.desktopMode)) emit('disconnectDesktop');
  apiMode.value = enabled;
}

/** Let browser agents use the same validated handshake when their host cannot call WebMCP tools. */
function acknowledgeDesktop(): void {
  const connectionId = agentConnectionId.value.trim();
  if (!props.desktopConnecting || !connectionId || connectionId.length > 128) return;
  emit('desktopAcknowledge', connectionId);
}

/** Forward a bounded research response to the parent; shared validation decides whether to accept it. */
function submitDesktopDraft(): void {
  const json = agentDraft.value.trim();
  if (!props.desktopPending || !props.desktopContext || !json || json.length > 32_768) return;
  emit('desktopDraft', json);
}

/** Connect never starts trading and never persists the provider credential. */
function connect(): void {
  if (props.busy || !apiMode.value) return;
  const apiKey = keyInput.value?.value.trim() ?? '';
  if (!apiKey) return;
  localError.value = '';
  if (needsEndpoint.value) {
    try {
      const url = new URL(endpoint.value.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('endpoint');
    } catch {
      localError.value = 'bots.autopilot.endpointNote';
      return;
    }
  }
  clearSecrets();
  emit('connect', { provider: provider.value, apiKey, endpoint: needsEndpoint.value ? endpoint.value.trim() : '' });
}

/** Retain the entered goal while the parent connects the wallet and AI; GO never authorizes trades. */
function go(): void {
  if (props.busy || props.stage === 'watching' || watchOwnsForm.value) return;
  submitted.value = true;
  if (!validDraft.value) return;
  persistStoredDraft();
  emit('go', {
    assetInAddress: assetInAddress.value,
    assetOutAddress: assetOutAddress.value,
    capital: capital.value,
    feeBudgetXor: feeBudgetXor.value,
    targetReturnPercent: targetReturnPercent.value,
    maxLossPercent: maxLossPercent.value,
    title: t('bots.autopilot.maximizeGoal', { symbol: outputAsset.value?.symbol ?? '' }),
  });
}

/** Authorize only the visible, funded review after an explicit unchecked-by-default consent. */
function start(): void {
  if (props.busy || !props.walletConnected || !props.reviewBot || !props.funding?.sufficient || !consented.value)
    return;
  const password = props.externalWallet ? '' : (passwordInput.value?.value ?? '');
  clearSecrets();
  consented.value = false;
  emit('start', { password });
}

/** Copy only the connected wallet's public SORA address; manual selection remains available. */
async function copyAddress(): Promise<void> {
  addressCopied.value = false;
  try {
    await navigator.clipboard.writeText(props.walletAddress);
    addressCopied.value = true;
  } catch {
    // The visible address remains selectable when clipboard permissions are unavailable.
  }
}

/** Copy the visible public task; the user chooses when to send it through their signed-in app. */
async function copyDesktopPrompt(): Promise<void> {
  promptCopied.value = false;
  const prompt = props.desktopPrompt;
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    if (props.desktopPrompt === prompt) promptCopied.value = true;
  } catch {
    // The read-only task remains available for manual copying.
  }
}

/** Render exact units and refuse malformed persisted values without crashing the workspace. */
function displayAmount(value: string, decimals: number): string {
  try {
    return fromCodec(value, decimals);
  } catch {
    return '—';
  }
}
</script>

<style scoped lang="scss">
.autopilot {
  position: relative;
  box-sizing: border-box;
  width: min(100%, 680px);
  margin-inline: auto;
  padding: 28px 28px 36px;
  color: var(--s-color-base-content-primary);
  text-align: start;
  font-size: 14px;
  /* Glass panel lit by the page's global illumination. */
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8)) 90%, transparent);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 86%, transparent),
    color-mix(in srgb, var(--s-color-utility-surface, #fdf7fb) 58%, transparent)
  );
  box-shadow:
    10px 10px 28px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    -8px -8px 22px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8)),
    inset 0 1px 0 var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}
.autopilot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.autopilot-label {
  font-size: 13px;
  font-weight: 600;
}
.autopilot-stage {
  animation: autopilot-appear 180ms ease-out;
}
h2 {
  font-size: clamp(26px, 4vw, 36px);
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.025em;
  margin: 0 0 24px;
  overflow-wrap: anywhere;
}
fieldset {
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
.autopilot-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin-top: 20px;
  > span {
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
  }
}
.autopilot-field input,
.autopilot-field textarea,
.autopilot-field select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 12px 14px;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-base-background);
  /* Neumorphic recess, built from the theme's own shadow colors. */
  box-shadow:
    inset 3px 3px 7px var(--s-shadow-color-dark, rgba(0, 0, 0, 0.1)),
    inset -3px -3px 7px var(--s-shadow-color-light-dark, rgba(255, 255, 255, 0.8));
  font: inherit;
  transition: border-color 150ms;
}
.autopilot-field select {
  appearance: none;
  -webkit-appearance: none;
  height: 48px;
  padding-inline-end: 36px;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 19px) 50%,
    calc(100% - 14px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
}
.autopilot-field input:focus,
.autopilot-field textarea:focus,
.autopilot-field select:focus {
  border-color: var(--s-color-action-text);
  outline: 1px solid var(--s-color-action-text);
}
.autopilot-budget-row {
  display: grid;
  grid-template-columns: #{'minmax(0, 1fr) minmax(96px, 150px)'};
  align-items: end;
  gap: 16px;
  .autopilot-field {
    margin-top: 0;
  }
}
.autopilot-input-token select {
  height: 76px;
  min-height: 76px;
  font-size: 18px;
}
.autopilot-budget {
  input {
    font-size: 32px;
    font-variant-numeric: tabular-nums;
    min-height: 76px;
    padding: 16px;
  }
}
.autopilot-note {
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  line-height: 1.65;
  margin: 12px 0 0;
}
.autopilot-watch-fee-pressure {
  color: var(--s-color-base-content);
  font-weight: 600;
}
.autopilot-watch-owner {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.autopilot-setup-funding {
  margin-top: 12px;
  padding-inline-start: 12px;
  border-inline-start: 2px solid var(--s-color-base-border-secondary);
  .autopilot-note {
    margin-top: 4px;
  }
  .autopilot-address {
    margin-top: 6px;
  }
}
.autopilot-connected {
  margin-top: 16px;
}
.autopilot-primary,
.autopilot-secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 13px 18px;
  transition:
    background-color 150ms,
    transform 150ms;
}
.autopilot-primary {
  width: 100%;
  box-sizing: border-box;
  text-decoration: none;
  margin-top: 28px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--s-color-on-action, #fff);
  background: linear-gradient(
    120deg,
    var(--s-color-action-fill, #bf065f),
    color-mix(in srgb, var(--s-color-action-fill, #bf065f) 55%, var(--s-color-theme-accent, #f8087b))
  );
  box-shadow:
    0 10px 24px color-mix(in srgb, var(--s-color-theme-accent, #f8087b) 36%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
  &:hover:not(:disabled) {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}
.autopilot-go {
  justify-content: center;
  min-height: 56px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.autopilot-secondary {
  border: 1px solid var(--s-color-base-border-secondary);
  color: var(--s-color-base-content-secondary);
  background: transparent;
}
.autopilot-link {
  min-height: 44px;
  border: 0;
  padding: 8px 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: var(--s-color-base-content-secondary);
  cursor: pointer;
  &:hover {
    color: var(--s-color-action-text);
  }
}
.autopilot-alternative {
  display: block;
  margin: 12px auto 0;
}
.autopilot-field textarea {
  resize: vertical;
  line-height: 1.6;
}
.autopilot-context-pages {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: var(--s-color-base-content-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.autopilot-details {
  margin-top: 24px;
  padding-block: 16px;
  border-block-start: 1px solid var(--s-color-base-border-secondary);
  summary {
    font-size: 12px;
    cursor: pointer;
    min-height: 20px;
  }
}
.autopilot-fields {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  gap: 0 16px;
}
.autopilot-address {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 12px;
  code {
    font-family: inherit;
    font-size: 12px;
    line-height: 1.65;
    overflow-wrap: anywhere;
    user-select: all;
  }
}
.autopilot-research {
  min-height: 220px;
  padding-top: 24px;
  h2 {
    margin: 26px 0 12px;
  }
}
.autopilot-spinner {
  display: block;
  width: 28px;
  height: 28px;
  border: 2px solid var(--s-color-base-border-secondary);
  border-top-color: var(--s-color-action-text);
  border-radius: 50%;
  animation: autopilot-spin 1s linear infinite;
}
.autopilot-review-amount {
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.2;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
  margin: 0 0 12px;
  small {
    font-size: 18px;
    font-weight: 400;
    color: var(--s-color-base-content-secondary);
  }
}
.autopilot-balances {
  padding-block: 16px;
  margin-top: 18px;
  font-size: 12px;
  line-height: 1.6;
  border-block: 1px solid var(--s-color-base-border-secondary);
  > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    overflow-wrap: anywhere;
  }
}
.autopilot-session {
  margin-top: 22px;
}
.autopilot-limits {
  margin: 16px 0 0;
  font-size: 12px;
  > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: 12px;
  }
  dt {
    color: var(--s-color-base-content-secondary);
  }
  dd {
    text-align: end;
    margin: 0;
    overflow-wrap: anywhere;
  }
}
.autopilot-consent {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  font-size: 12px;
  line-height: 1.65;
  input {
    flex: 0 0 auto;
    accent-color: var(--s-color-action-text);
    margin-top: 4px;
    width: 16px;
    height: 16px;
  }
}
.autopilot-error {
  font-size: 12px;
  line-height: 1.6;
  color: var(--s-color-status-error);
  margin-top: 20px;
  overflow-wrap: anywhere;
}
.autopilot-cancel {
  display: block;
  margin: 12px auto 0;
}
.autopilot-running :deep(.goal-progress) {
  padding-inline: 0;
  margin-top: 24px;
}
.autopilot-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  .autopilot-primary {
    margin: 0;
    flex: 1;
  }
}
button:disabled {
  cursor: default;
  opacity: 0.45;
}
@keyframes autopilot-appear {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes autopilot-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 480px) {
  .autopilot {
    padding-top: 12px;
  }
  .autopilot-header {
    margin-bottom: 28px;
  }
  .autopilot-budget-row {
    grid-template-columns: #{'minmax(0, 1fr)'} 112px;
  }
  .autopilot-fields {
    grid-template-columns: #{'minmax(0, 1fr)'};
  }
}
@media (max-width: 520px) {
  .autopilot {
    padding: 20px 0 32px;
    border: 0;
    border-radius: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .autopilot-stage,
  .autopilot-spinner {
    animation: none;
  }
  .autopilot-primary,
  .autopilot-secondary,
  .autopilot-field input,
  .autopilot-field select {
    transition: none;
  }
}
</style>
