# Soramitsu UI Library Documentation

This directory gathers the practical knowledge required to work with the Soramitsu UI monorepo. Use it as a handbook whether you are onboarding, building an application with the published packages, or contributing new components to the design system.

## Quick start checklist

- Review [getting-started.md](getting-started.md) for prerequisites, environment setup, and the fastest way to spin up Storybook locally.
- Skim [project-structure.md](project-structure.md) to understand how the monorepo is organised and where to place new work.
- If you are consuming the library, jump to [components.md](components.md) for usage patterns and integration recipes.
- If you are contributing, read [development-workflow.md](development-workflow.md) and [testing-and-quality.md](testing-and-quality.md) to align with the tooling and quality bars.
- Customising themes or tokens? See [theming.md](theming.md) for the token architecture and Sass utilities.

## Document map

- [getting-started.md](getting-started.md) — installation, environment, and workshop-ready commands.
- [project-structure.md](project-structure.md) — packages, folders, and how code flows between them.
- [components.md](components.md) — consuming Soramitsu components, patterns, and API conventions.
- [theming.md](theming.md) — tokens, typography presets, and runtime theming strategies.
- [development-workflow.md](development-workflow.md) — day-to-day development loops, linting, and recommended toolchain integrations.
- [testing-and-quality.md](testing-and-quality.md) — unit, visual, and integration testing plus accessibility checks.
- [storybook.md](storybook.md) — Storybook configuration, authoring guidelines, and how to embed stories in downstream docs.
- [release-management.md](release-management.md) — versioning, changesets, and publishing coordination.
- [contributing.md](contributing.md) — collaboration standards, review expectations, and branch hygiene.
- [troubleshooting.md](troubleshooting.md) — common issues, diagnostics, and escalation paths.
- [scripts-reference.md](scripts-reference.md) — root-level and package-level scripts with when-to-use guidance.
- [glossary.md](glossary.md) — shared vocabulary for design system discussions.
- [backlog.md](backlog.md) — outstanding technical debt and follow-up tasks retained from the initial audit.

## Core principles

- **Design-system first.** Tokens, typography, and components are designed to stay in sync with Soramitsu’s design language. When in doubt, start from `@soramitsu-ui/theme` and align component styles with token contracts.
- **Composable Vue 3 architecture.** Components rely on composition API patterns, provide/inject contracts, and a-la-carte imports to keep bundles lean.
- **Story-driven development.** Storybook acts as the home for manual QA, visual review, and long-tail usage examples. Stories accompany every component change.
- **Automation as guardrails.** Lint, type-checks, Vitest, and Cypress component tests all run in CI via `yarn test:all`. Keeping them green locally shortens review cycles.

## Audience guide

| Persona                        | Focus areas                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Application consumers          | [getting-started.md](getting-started.md), [components.md](components.md), [theming.md](theming.md)                                   |
| Component contributors         | [development-workflow.md](development-workflow.md), [components.md](components.md), [testing-and-quality.md](testing-and-quality.md) |
| Release managers               | [release-management.md](release-management.md), [scripts-reference.md](scripts-reference.md)                                         |
| QA and accessibility reviewers | [storybook.md](storybook.md), [testing-and-quality.md](testing-and-quality.md)                                                       |

## Keeping this documentation healthy

- Update the relevant guide whenever you add a notable script, workflow, or architectural rule.
- Link to source files (`path/to/file.ts:Line`) when documenting opinions so readers can verify context quickly.
- Prefer short, task-oriented sections rather than prose-heavy essays; readers should find answers in under a minute.
- Raise a pull request for documentation gaps discovered during review and add them to [backlog.md](backlog.md) if they require separate follow-up.

Questions or suggestions? Open a discussion in the repository or tag the design system maintainers in your pull request. This documentation is meant to evolve with the codebase.
