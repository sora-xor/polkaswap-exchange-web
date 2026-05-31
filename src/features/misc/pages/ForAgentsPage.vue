<template>
  <main class="for-agents-page" aria-labelledby="for-agents-title">
    <header class="for-agents-page__header">
      <p class="for-agents-page__eyebrow">{{ t('forAgents.eyebrow') }}</p>
      <h1 id="for-agents-title">{{ t('forAgents.title') }}</h1>
      <p class="for-agents-page__lead">{{ t('forAgents.lead') }}</p>
      <p>
        <code>window.PolkaswapAgent</code>
        {{ t('forAgents.apiContext') }}
      </p>
    </header>

    <section class="for-agents-page__quickstart" aria-labelledby="for-agents-start">
      <h2 id="for-agents-start">{{ t('forAgents.startTitle') }}</h2>
      <div class="for-agents-page__primary-links" :aria-label="t('forAgents.entrypointsLabel')">
        <a
          v-for="link in primaryLinks"
          :key="link.href"
          class="for-agents-page__primary-link"
          :data-agent-entrypoint="link.entrypoint"
          :href="link.href"
          target="_blank"
          rel="noopener"
        >
          <span>{{ t(`forAgents.primary.${link.key}.title`) }}</span>
          <small>{{ t(`forAgents.primary.${link.key}.description`) }}</small>
          <code>{{ link.path }}</code>
        </a>
      </div>
      <ul class="for-agents-page__contract">
        <li v-for="item in contractItems" :key="item.key">
          <code>{{ item.code }}</code>
          <span>{{ t(`forAgents.contract.${item.key}`) }}</span>
        </li>
      </ul>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-discovery">
      <h2 id="for-agents-discovery">{{ t('forAgents.discoveryTitle') }}</h2>
      <p>{{ t('forAgents.discoveryText') }}</p>
      <ul class="for-agents-page__links">
        <li v-for="link in documentationLinks" :key="link.href">
          <a :href="link.href" target="_blank" rel="noopener">
            {{ t(`forAgents.links.${link.key}`) }}
          </a>
          <code>{{ link.path }}</code>
        </li>
      </ul>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-polkamarkt">
      <h2 id="for-agents-polkamarkt">{{ t('forAgents.polkamarkt.title') }}</h2>
      <p>{{ t('forAgents.polkamarkt.text') }}</p>
      <div class="for-agents-page__polkamarkt-grid">
        <article v-for="item in polkamarktWorkflow" :key="item.key">
          <span>{{ t(`forAgents.polkamarkt.items.${item.key}.title`) }}</span>
          <p>{{ t(`forAgents.polkamarkt.items.${item.key}.description`) }}</p>
          <code>{{ item.code }}</code>
        </article>
      </div>
      <pre><code>const agent = window.PolkaswapAgent;
await agent.ready({ requireNode: true, requireWallet: true });
window.location.hash = '#/polkamarkt';
await new Promise((resolve) => requestAnimationFrame(resolve));</code></pre>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-flow">
      <h2 id="for-agents-flow">{{ t('forAgents.flowTitle') }}</h2>
      <ol class="for-agents-page__steps">
        <li v-for="step in executionSteps" :key="step.key">
          <span>{{ t(`forAgents.flow.${step.key}`) }}</span>
          <code v-if="step.code">{{ step.code }}</code>
        </li>
      </ol>
      <pre><code>const agent = window.PolkaswapAgent;
await agent.ready({ requireNode: true });
const prepared = await agent.prepareSwap(request);
const hasCriticalWarning = prepared.warnings.some((warning) => warning.severity === 'critical');

if (prepared.canExecute && !hasCriticalWarning) {
  await agent.executeSwap({
    ...request,
    intentId: prepared.intentId,
    clientOrderId: 'agent-run-001',
  });
}</code></pre>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-signing">
      <h2 id="for-agents-signing">{{ t('forAgents.signingTitle') }}</h2>
      <p>
        {{ t('forAgents.signingTextBefore') }}
        <code>intentId</code>
        {{ t('forAgents.signingTextMiddle') }}
        <code>clientOrderId</code>
        {{ t('forAgents.signingTextAfter') }}
      </p>
    </section>
  </main>
</template>

<script lang="ts" setup>
import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  name: 'ForAgentsPage',
});

const { t } = useTranslation();

/** First-hop targets for browser runners and machine-readable discovery. */
const primaryLinks = [
  {
    key: 'manifest',
    entrypoint: 'manifest',
    href: './.well-known/polkaswap-agent.json',
    path: '.well-known/polkaswap-agent.json',
  },
  { key: 'playground', entrypoint: 'playground', href: './agent-playground.html', path: 'agent-playground.html' },
  {
    key: 'reference',
    entrypoint: 'reference',
    href: './.well-known/polkaswap-agent.md',
    path: '.well-known/polkaswap-agent.md',
  },
] as const;

/** Static same-origin agent documentation files emitted with every build. */
const documentationLinks = [
  { key: 'manifest', href: './.well-known/polkaswap-agent.json', path: '.well-known/polkaswap-agent.json' },
  { key: 'reference', href: './.well-known/polkaswap-agent.md', path: '.well-known/polkaswap-agent.md' },
  { key: 'types', href: './.well-known/polkaswap-agent.d.ts', path: '.well-known/polkaswap-agent.d.ts' },
  { key: 'schema', href: './.well-known/polkaswap-agent.schema.json', path: '.well-known/polkaswap-agent.schema.json' },
  { key: 'examples', href: './.well-known/polkaswap-agent.examples.json', path: '.well-known/polkaswap-agent.examples.json' },
  { key: 'errors', href: './.well-known/polkaswap-agent.errors.json', path: '.well-known/polkaswap-agent.errors.json' },
  { key: 'client', href: './.well-known/polkaswap-agent-client.js', path: '.well-known/polkaswap-agent-client.js' },
  { key: 'playground', href: './agent-playground.html', path: 'agent-playground.html' },
] as const;

/** Stable API contract checks a runner should apply before trading. */
const contractItems = [
  { key: 'samePage', code: 'same-page' },
  { key: 'noCustody', code: 'no-custody' },
  { key: 'prepareFirst', code: 'prepare-first' },
  { key: 'idempotent', code: 'idempotent' },
] as const;

/** Route-driven Polkamarkt workflow notes for same-page browser agents. */
const polkamarktWorkflow = [
  { key: 'route', code: '#/polkamarkt' },
  { key: 'markets', code: 'markets + marketSnapshots' },
  { key: 'trade', code: 'Buy / Sell / Flip / LP / Claim' },
  { key: 'create', code: 'createCondition -> createMarket' },
  { key: 'positions', code: 'My Markets / LP' },
] as const;

/** High-level browser automation sequence for signer-aware agents. */
const executionSteps = [
  { key: 'open', code: '' },
  { key: 'ready', code: 'polkaswap-agent-ready' },
  { key: 'wallet', code: 'refreshWallets' },
  { key: 'resolve', code: 'resolveAsset' },
  { key: 'prepare', code: 'prepare*' },
  { key: 'execute', code: 'execute*' },
  { key: 'recover', code: 'recoverTransaction' },
] as const;
</script>

<style lang="scss" scoped>
$content-width: 920px;
$link-grid-min: 260px;
$primary-link-min: 220px;

.for-agents-page {
  box-sizing: border-box;
  width: min(100%, $content-width);
  margin: 0 auto;
  padding: $inner-spacing-big $inner-spacing-medium $inner-spacing-big * 2;
  color: var(--s-color-base-content-primary);

  &__header,
  &__section {
    max-width: 760px;
  }

  &__header {
    margin-bottom: $inner-spacing-big;
  }

  &__quickstart {
    max-width: 100%;
    margin-bottom: $inner-spacing-big;
    padding: $inner-spacing-medium;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 8px;
    background: var(--s-color-utility-surface);
  }

  &__eyebrow {
    margin: 0 0 $inner-spacing-mini;
    color: var(--s-color-status-info);
    font-size: var(--s-font-size-mini);
    font-weight: 700;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: $inner-spacing-small;
    font-size: 36px;
    line-height: 1.15;
  }

  h2 {
    margin-bottom: $inner-spacing-mini;
    font-size: 22px;
    line-height: 1.25;
  }

  p,
  li {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    line-height: 1.6;
  }

  &__lead {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
  }

  &__section {
    margin-top: $inner-spacing-big;
  }

  &__primary-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax($primary-link-min, 1fr));
    gap: $inner-spacing-small;
    margin-top: $inner-spacing-small;
  }

  &__primary-link {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: $inner-spacing-small;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 8px;
    color: var(--s-color-base-content-primary);
    text-decoration: none;

    &:hover,
    &:focus {
      border-color: var(--s-color-status-info);
    }

    span {
      font-weight: 700;
    }

    small {
      color: var(--s-color-base-content-secondary);
      line-height: 1.4;
    }
  }

  &__contract {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax($primary-link-min, 1fr));
    gap: $inner-spacing-mini;
    margin: $inner-spacing-small 0 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: flex-start;
      gap: $inner-spacing-mini;
      margin: 0;
      padding: $inner-spacing-mini 0 0;
      border-top: 1px solid var(--s-color-base-border-secondary);
    }

    span {
      min-width: 0;
    }
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax($link-grid-min, 1fr));
    gap: $inner-spacing-mini;
    padding: 0;
    list-style: none;
  }

  &__links li,
  &__steps li,
  &__polkamarkt-grid article {
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 8px;
    background: var(--s-color-utility-surface);
  }

  &__links li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: $inner-spacing-small;
  }

  &__links a {
    color: var(--s-color-base-content-primary);
    font-weight: 600;
    text-decoration: none;

    &:hover,
    &:focus {
      color: var(--s-color-status-info);
    }
  }

  &__steps {
    display: grid;
    gap: $inner-spacing-mini;
    margin: $inner-spacing-small 0;
    padding-left: 20px;
  }

  &__steps li {
    padding: $inner-spacing-mini $inner-spacing-small;
  }

  &__polkamarkt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax($primary-link-min, 1fr));
    gap: $inner-spacing-mini;
    margin-top: $inner-spacing-small;

    article {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      padding: $inner-spacing-small;
    }

    span {
      color: var(--s-color-base-content-primary);
      font-weight: 700;
    }

    p {
      margin: 0;
    }
  }

  code {
    color: var(--s-color-status-info);
    font-family: var(--s-font-family-mono, monospace);
    font-size: var(--s-font-size-mini);
    overflow-wrap: anywhere;
  }

  pre {
    box-sizing: border-box;
    max-width: 100%;
    margin: $inner-spacing-medium 0 0;
    padding: $inner-spacing-small;
    overflow-x: auto;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 8px;
    background: var(--s-color-utility-surface);
  }
}

@include large-mobile(true) {
  .for-agents-page {
    padding: $inner-spacing-medium $inner-spacing-small $inner-spacing-big;

    h1 {
      font-size: 28px;
    }
  }
}
</style>
