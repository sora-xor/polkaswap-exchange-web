# Storybook Guide

Storybook is the living documentation for Soramitsu UI components. It doubles as a playground for designers, engineers, and QA.

## Running Storybook

```sh
yarn sb:serve
```

- Serves `packages/ui/.storybook` on http://localhost:6006.
- Automatically rebuilds when Vue components or stories change.
- Uses the local build of `@soramitsu-ui/vite-plugin-svg`; ensure `yarn build:vite-plugin-svg` succeeds beforehand (scripts trigger it automatically).

To produce a static build:

```sh
yarn --cwd packages/ui sb:build
```

Static exports are written to `packages/ui/storybook-static` and can be deployed to static hosting or served in CI previews.

## Project configuration

Storybook configuration resides in `packages/ui/.storybook`:

- `main.ts` — story entry globs, addons (actions, controls, docs, accessibility), builder configuration.
- `preview.ts` — global decorators, theming, testing utilities, and parameter defaults.
- `manager.ts` (optional) — UI theming for the Storybook chrome.

Adjust these files when adding addons, tweaking Vite settings, or altering the story hierarchy.

## Authoring stories

Story files live under `packages/ui/stories` and follow the `.stories.ts` convention.

Guidelines:

- Export a `default` metadata object with `title`, `component`, and `argTypes` for controls.
- Use CSF 3 syntax (functions returning template objects) to maximise compatibility with Storybook Docs.
- Provide meaningful default args that mirror real-world usage.
- Showcase edge cases (empty states, long labels, loading) alongside primary variants.
- Leverage `play` functions for interactive demos or accessibility assertions.

Example skeleton:

```ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { SButton } from '@soramitsu-ui/ui'

const meta: Meta = {
  title: 'Components/Button',
  component: SButton,
  args: {
    appearance: 'primary',
    disabled: false,
  },
}
export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    label: 'Submit',
  },
}
```

## Controls and documentation

- Use `argTypes` to expose props and events via Storybook Controls.
- Document slots using `parameters.docs.source` or MDX docs pages if additional explanation is required.
- Provide annotations for keyboard shortcuts and ARIA usage.

## Accessibility testing

- Enable the `@storybook/addon-a11y` panel to audit each story.
- For complex components (modals, popovers), add `play` functions that run `axe` checks:

  ```ts
  import { within, userEvent } from '@storybook/testing-library'
  import { expect } from '@storybook/jest'

  export const WithA11y: Story = {
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const trigger = await canvas.findByRole('button')
      await userEvent.click(trigger)
      await expect(await axe(canvasElement)).toHaveNoViolations()
    },
  }
  ```

## Story naming conventions

- Group stories by domain: `Components/Button`, `Feedback/Alert`, `Navigation/Tabs`.
- Use `Docs` stories to provide long-form explanations or migration notes.
- Keep story IDs stable; renaming titles will break deep links shared with designers or QA.

## Integrating design resources

- Embed Figma links in docs panels for design parity.
- Use `parameters.backgrounds` to demonstrate behaviour on brand colours or dark mode.
- Provide `parameters.design` (via addon) when referencing specific mockups.

## Continuous integration

- `yarn --cwd packages/ui sb:test` runs Storybook test runner via Playwright. Add bespoke assertions for mission-critical stories.
- Consider adding visual regression tooling (Chromatic, Percy) by wiring it into the build output (`storybook-static`). Document steps here once adopted.

## Troubleshooting

| Symptom                                | Fix                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Storybook fails with SVG import errors | Rebuild the SVG plugin (`yarn build:vite-plugin-svg`) or reinstall dependencies.                     |
| Stories render blank                   | Inspect console for missing theme CSS. Ensure `@soramitsu-ui/ui/styles` is imported in `preview.ts`. |
| Controls panel missing props           | Export prop typings or ensure `defineProps` includes default values for Storybook to infer.          |

Keep this guide updated as Storybook evolves (new addons, frameworks, or CI integrations).
