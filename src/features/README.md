`src/features` contains feature-first boundaries.

Each feature owns:
- `index.ts` public API
- `routes.ts` route entrypoints
- page containers
- local components
- feature stores/composables/services/types

Legacy dependencies must stay explicit and temporary.
