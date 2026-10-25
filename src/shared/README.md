`src/shared` contains reusable, feature-agnostic code.

Allowed contents:
- dumb UI primitives
- pure helpers
- formatting and math/security helpers
- cross-feature types

`src/shared` must not import from `@/app` or `@/features`.
