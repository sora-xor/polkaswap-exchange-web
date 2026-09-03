<template>
  <main class="for-agents-page" aria-labelledby="for-agents-title">
    <header class="for-agents-page__header">
      <div class="for-agents-page__header-copy">
        <p class="for-agents-page__eyebrow">{{ t('forAgents.eyebrow') }}</p>
        <h1 id="for-agents-title">{{ t('forAgents.title') }}</h1>
        <p class="for-agents-page__lead">{{ t('forAgents.lead') }}</p>
      </div>
      <aside class="for-agents-page__scope" :aria-label="t('forAgents.mcp.title')">
        <span>{{ t('forAgents.mcp.title') }}</span>
        <p>{{ t('forAgents.apiContext') }}</p>
      </aside>
    </header>

    <section class="for-agents-page__playground" aria-labelledby="for-agents-playground">
      <div class="for-agents-page__playground-copy">
        <p class="for-agents-page__kicker">{{ t('forAgents.flowTitle') }}</p>
        <h2 id="for-agents-playground">{{ t('forAgents.primary.playground.title') }}</h2>
        <p>{{ t('forAgents.primary.playground.description') }}</p>
        <pre
          class="for-agents-page__tool-request"
          data-agent-call="polkaswap_plan_swap"
        ><code>{{ planningRequest }}</code></pre>
        <a
          class="for-agents-page__playground-link"
          data-agent-entrypoint="playground"
          href="./agent-playground.html"
          target="_blank"
          rel="noopener"
        >
          <span>{{ t('forAgents.startTitle') }}</span>
          <code>agent-playground.html</code>
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <ul class="for-agents-page__contract" :aria-label="t('forAgents.entrypointsLabel')">
        <li v-for="item in contractItems" :key="item.key">
          <code>{{ item.code }}</code>
          <span>{{ t(`forAgents.contract.${item.key}`) }}</span>
        </li>
      </ul>

      <nav class="for-agents-page__secondary-entrypoints" :aria-label="t('forAgents.entrypointsLabel')">
        <a
          v-for="link in secondaryEntrypoints"
          :key="link.href"
          :data-agent-entrypoint="link.entrypoint"
          :href="link.href"
          target="_blank"
          rel="noopener"
        >
          <span>{{ t(`forAgents.primary.${link.key}.title`) }}</span>
          <small>{{ t(`forAgents.primary.${link.key}.description`) }}</small>
          <code>{{ link.path }}</code>
        </a>
      </nav>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-mcp">
      <header class="for-agents-page__section-heading">
        <h2 id="for-agents-mcp">{{ t('forAgents.mcp.title') }}</h2>
        <p>{{ t('forAgents.mcp.text') }}</p>
      </header>

      <div class="for-agents-page__boundary">
        <article>
          <h3>{{ t('forAgents.signingTitle') }}</h3>
          <p>{{ t('forAgents.signingTextBefore') }}</p>
          <div class="for-agents-page__command">
            <code>yarn agent:mcp --profile-dir /absolute/path/to/a/dedicated/polkaswap-mcp-profile</code>
          </div>
        </article>
      </div>

      <p class="for-agents-page__boundary-note">{{ t('forAgents.mcp.boundary') }}</p>
    </section>

    <section class="for-agents-page__section" aria-labelledby="for-agents-discovery">
      <header class="for-agents-page__section-heading">
        <h2 id="for-agents-discovery">{{ t('forAgents.discoveryTitle') }}</h2>
        <p>{{ t('forAgents.discoveryText') }}</p>
      </header>
      <ul class="for-agents-page__links">
        <li v-for="link in documentationLinks" :key="link.href">
          <a :href="link.href" target="_blank" rel="noopener">
            {{ t(`forAgents.links.${link.key}`) }}
          </a>
          <code>{{ link.path }}</code>
        </li>
      </ul>
    </section>
  </main>
</template>

<script lang="ts" setup>
import { useTranslation } from '@/composables/useTranslation';

defineOptions({
  name: 'ForAgentsPage',
});

const { t } = useTranslation();

/** Wallet-independent MCP request; decimal strings preserve token precision. */
const planningRequest = `{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "polkaswap_plan_swap",
    "arguments": {
      "assetIn": { "symbol": "XOR" },
      "assetOut": { "symbol": "VAL" },
      "amount": "1",
      "side": "input",
      "slippageTolerance": "0.5",
      "dexId": "best"
    }
  }
}`;

/** Secondary same-origin entrypoints for machine-readable discovery. */
const secondaryEntrypoints = [
  {
    key: 'manifest',
    entrypoint: 'manifest',
    href: './.well-known/polkaswap-agent.json',
    path: '.well-known/polkaswap-agent.json',
  },
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
  {
    key: 'examples',
    href: './.well-known/polkaswap-agent.examples.json',
    path: '.well-known/polkaswap-agent.examples.json',
  },
  { key: 'errors', href: './.well-known/polkaswap-agent.errors.json', path: '.well-known/polkaswap-agent.errors.json' },
  { key: 'client', href: './.well-known/polkaswap-agent-client.js', path: '.well-known/polkaswap-agent-client.js' },
  { key: 'mcpTools', href: './.well-known/polkaswap-mcp-tools.json', path: '.well-known/polkaswap-mcp-tools.json' },
] as const;

/** Autonomy and signing boundaries shared by WebMCP and the local bridge. */
const contractItems = [
  { key: 'samePage', code: 'top-level' },
  { key: 'noCustody', code: 'no-wallet' },
  { key: 'prepareFirst', code: 'unsigned' },
  { key: 'idempotent', code: 'no-approval' },
] as const;
</script>

<style lang="scss" scoped>
$content-width: 1120px;
$copy-width: 720px;
$link-grid-min: 240px;

.for-agents-page {
  box-sizing: border-box;
  width: min(100%, $content-width);
  margin: 0 auto;
  padding: $inner-spacing-big $inner-spacing-medium $inner-spacing-big * 2;
  color: var(--s-color-base-content-primary);

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 760px;
    margin-bottom: $inner-spacing-small;
    font-size: clamp(38px, 6vw, 68px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  h2 {
    margin-bottom: $inner-spacing-mini;
    font-size: clamp(26px, 3vw, 38px);
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  h3 {
    margin-bottom: $inner-spacing-mini;
    font-size: var(--s-font-size-large);
    line-height: 1.25;
  }

  p,
  li {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    line-height: 1.6;
  }

  code {
    color: var(--s-color-status-info);
    font-family: var(--s-font-family-mono, monospace);
    font-size: var(--s-font-size-mini);
    overflow-wrap: anywhere;
  }

  &__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    gap: $inner-spacing-big;
    align-items: end;
    padding: $inner-spacing-medium 0 $inner-spacing-big;
    border-bottom: 1px solid var(--s-color-base-border-secondary);
  }

  &__header-copy {
    min-width: 0;
  }

  &__eyebrow,
  &__kicker {
    margin: 0 0 $inner-spacing-mini;
    color: var(--s-color-status-info);
    font-size: var(--s-font-size-mini);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__lead {
    max-width: $copy-width;
    margin-bottom: 0;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
  }

  &__scope {
    padding-left: $inner-spacing-medium;
    border-left: 3px solid var(--s-color-status-info);

    span {
      display: block;
      margin-bottom: $inner-spacing-mini;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-mini);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    p {
      margin-bottom: 0;
    }
  }

  &__playground {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
    gap: $inner-spacing-big;
    margin-top: $inner-spacing-big;
    padding: $inner-spacing-big 0;
    border-bottom: 1px solid var(--s-color-base-border-secondary);

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      width: 72px;
      height: 4px;
      background: var(--s-color-status-info);
      content: '';
    }
  }

  &__playground-copy > p:not(.for-agents-page__kicker) {
    max-width: 600px;
  }

  &__tool-request {
    max-width: 100%;
    margin: $inner-spacing-medium 0 0;
    padding: $inner-spacing-small 0 $inner-spacing-small $inner-spacing-medium;
    border-left: 2px solid var(--s-color-base-border-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &__playground-link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: $inner-spacing-small;
    align-items: center;
    width: min(100%, 560px);
    box-sizing: border-box;
    margin-top: $inner-spacing-medium;
    padding: $inner-spacing-small $inner-spacing-medium;
    border: 1px solid var(--s-color-status-info);
    border-radius: 8px;
    background: var(--s-color-status-info);
    color: #fff;
    text-decoration: none;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;

    > span:first-child {
      font-weight: 700;
    }

    > span:last-child {
      font-size: var(--s-font-size-large);
      transition: transform 160ms ease;
    }

    code {
      min-width: 0;
      color: inherit;
      opacity: 0.78;
      text-align: right;
    }

    &:hover,
    &:focus-visible {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
      transform: translateY(-2px);

      > span:last-child {
        transform: translate(2px, -2px);
      }
    }
  }

  &__contract {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      gap: $inner-spacing-small;
      padding: $inner-spacing-small 0;
      border-top: 1px solid var(--s-color-base-border-secondary);
    }

    li:last-child {
      border-bottom: 1px solid var(--s-color-base-border-secondary);
    }
  }

  &__secondary-entrypoints {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $inner-spacing-medium;

    a {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px $inner-spacing-small;
      padding-top: $inner-spacing-small;
      border-top: 1px solid var(--s-color-base-border-secondary);
      color: var(--s-color-base-content-primary);
      text-decoration: none;
    }

    span {
      font-weight: 700;
    }

    small {
      grid-column: 1;
      color: var(--s-color-base-content-secondary);
      line-height: 1.45;
    }

    code {
      grid-row: 1 / span 2;
      grid-column: 2;
      align-self: start;
      text-align: right;
    }

    a:hover span,
    a:focus-visible span {
      color: var(--s-color-status-info);
    }
  }

  &__section {
    margin-top: $inner-spacing-big * 2;
  }

  &__section-heading {
    max-width: $copy-width;
    margin-bottom: $inner-spacing-big;
  }

  &__boundary {
    display: grid;
    grid-template-columns: 1fr;
    border-top: 1px solid var(--s-color-base-border-secondary);
    border-bottom: 1px solid var(--s-color-base-border-secondary);

    article {
      display: grid;
      grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
      gap: $inner-spacing-mini $inner-spacing-big;
      min-width: 0;
      padding: $inner-spacing-medium 0;
    }

    h3 {
      grid-row: 1 / span 2;
    }

    p {
      margin-bottom: 0;
    }
  }

  &__command {
    display: grid;
    gap: $inner-spacing-mini;
    margin-top: $inner-spacing-small;
    padding-top: $inner-spacing-small;
    border-top: 1px solid var(--s-color-base-border-secondary);

    span {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      font-weight: 600;
    }
  }

  &__boundary-note {
    max-width: $copy-width;
    margin: $inner-spacing-medium 0 0;
    padding-left: $inner-spacing-small;
    border-left: 3px solid var(--s-color-status-info);
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax($link-grid-min, 1fr));
    gap: 0 $inner-spacing-medium;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      padding: $inner-spacing-small 0;
      border-top: 1px solid var(--s-color-base-border-secondary);
    }

    a {
      color: var(--s-color-base-content-primary);
      font-weight: 700;
      text-decoration: none;

      &:hover,
      &:focus-visible {
        color: var(--s-color-status-info);
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .for-agents-page__playground-link,
  .for-agents-page__playground-link > span:last-child {
    transition: none;
  }
}

@include large-mobile(true) {
  .for-agents-page {
    padding: $inner-spacing-medium $inner-spacing-small $inner-spacing-big;

    &__header,
    &__playground,
    &__boundary {
      grid-template-columns: 1fr;
    }

    &__header {
      gap: $inner-spacing-medium;
    }

    &__scope {
      padding: $inner-spacing-small 0 0;
      border-top: 1px solid var(--s-color-base-border-secondary);
      border-left: 0;
    }

    &__playground {
      gap: $inner-spacing-medium;
    }

    &__playground-link {
      grid-template-columns: 1fr auto;

      code {
        display: none;
      }
    }

    &__secondary-entrypoints {
      grid-template-columns: 1fr;

      a {
        grid-template-columns: 1fr;
      }

      code {
        grid-row: auto;
        grid-column: auto;
        text-align: left;
      }
    }

    &__boundary article {
      grid-template-columns: 1fr;
      padding: $inner-spacing-medium 0;
    }

    &__boundary h3 {
      grid-row: auto;
    }
  }
}
</style>
