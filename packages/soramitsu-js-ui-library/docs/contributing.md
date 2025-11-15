# Contributing

We welcome contributions that enhance the Soramitsu UI library. This guide captures expectations for collaboration, code style, and review.

## Communication

- Discuss major features or breaking changes with maintainers before implementation.
- Use GitHub issues for bugs and feature requests; cross-link related Storybook stories or Figma files.
- Mention relevant stakeholders (design, QA) when changes impact them.

## Coding standards

- Follow the [components.md](components.md) conventions for Vue architecture, naming, and accessibility.
- Adhere to the existing TypeScript config; avoid introducing alternative build systems without discussion.
- Keep files ASCII-encoded unless existing files use extended characters.

## Commit and Changeset messages

- Commits can be descriptive (`fix: align tooltip with trigger`), but releases rely on Changesets for user-facing notes.
- Changeset format: `**type**(scope): message` (e.g. `**fix**(SSelect): avoid double focus trap`).
- Include breaking change notices in the Changeset body and in Storybook docs.

## Documentation updates

- Update this documentation suite whenever behaviour or workflows change.
- Link to source files in doc updates (e.g. `packages/ui/src/components/Table/STable.vue:42`).
- Keep Storybook stories in sync with component APIs.

## Code review etiquette

- Request review from at least one maintainer and one peer familiar with the affected area.
- Provide context: describe motivation, highlight risky areas, attach screenshots or videos for visual tweaks.
- Address review feedback promptly or start a discussion if trade-offs are involved.

## Testing expectations

- Run targeted tests locally; CI runs `yarn test:all`.
- For UI behaviour changes, include or update Cypress specs.
- Capture unusual failure cases in tests rather than comments.

## Accessibility and internationalisation

- Ensure keyboard navigation and focus order remain consistent.
- Provide default English copy only when a string is essential; otherwise expose props/slots for localisation.
- Use semantic HTML elements whenever possible.

## Triaging issues

- Confirm reported bugs by reproducing them in Storybook.
- Label issues with affected components and severity.
- Link to the relevant entry in [backlog.md](backlog.md) if it already tracks the gap.

## Security

- Do not include secrets in commits (API keys, tokens).
- Report security concerns privately to the maintainers before opening public issues.

## Contributor licence

- Contributions are licensed under Apache 2.0, consistent with the repository licence.
- Ensure third-party code complies with compatible licences before inclusion.

Thank you for helping keep the Soramitsu design system robust and accessible. Raise a discussion if any part of this process can be improved—processes evolve alongside the codebase.
