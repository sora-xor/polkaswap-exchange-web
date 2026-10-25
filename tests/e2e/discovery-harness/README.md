# Discovery browser harness

Run from the repository root:

```sh
yarn playwright test --config tests/e2e/discovery-harness/playwright.config.ts --workers=1
```

This isolated Vite server mounts the production `BotDiscovery.vue` view on port 41879. The harness replaces AI, historical market, and wallet controller boundaries with inert fixtures, while checkpoint reads and writes use real browser IndexedDB. The browser tests cover research pause and reconnection, finalist review and consent, and live campaign pause, new unlock, and explicit close. They make no paid AI requests or swaps.
