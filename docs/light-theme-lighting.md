# Light theme lighting

The light theme is lit like a small studio. One key light sits above and to the left of the page, so every
highlight is offset up and left and every shadow falls down and right. Shadows are tinted with a warm plum ink
instead of black, and the brand pink bounces off primary actions onto the surface beneath them. Noir keeps its
own palette and is not affected by anything described here.

## Where it lives

- `src/styles/soramitsu-variables.scss` defines the lighting rig and the shadow recipes.
  - `--lm-ink`, `--lm-key`, `--lm-bounce` and `--lm-fill` are bare RGB triplets, so a recipe picks its own alpha:
    `rgb(var(--lm-ink) / 0.2)`. They are light-theme only.
  - The recipes feed the existing `--s-shadow-*` tokens. Components already use these tokens, so every page
    picked up the new depth without a per-page edit. Naming is historical:

    | Token                        | Look                     | Used for                                    |
    | ---------------------------- | ------------------------ | ------------------------------------------- |
    | `--s-shadow-element-pressed` | raised, resting          | buttons, pills, small cards                 |
    | `--s-shadow-element`         | sunken                   | input wells, icon sockets, pressed controls |
    | `--s-shadow-dialog`          | raised, large            | page cards, dialogs, chart tooltips         |
    | `--s-shadow-secondary`       | raised, light            | chart and route panels beside a form        |
    | `--s-shadow-surface`         | raised, tight            | the selected tab in a track                 |
    | `--neu-tabs-shadow`          | sunken track             | the track behind neumorphic tabs            |
    | `--s-shadow-color-*`         | light and shadow colours | components that compose their own shadows   |
    | `--lm-glow-accent*`          | brand colour bounce      | primary actions (see below)                 |

- `src/styles/light-lighting.scss` holds what tokens cannot reach: the page ground, the engraved lines of the
  header and sidebar, the ledge of the status bar, the glow on the selected navigation item and the glow on
  primary actions. Every selector starts with `:root:not([data-theme='dark'])`.

## Rules that keep it working

- **Use the tokens.** A new raised surface uses `var(--s-shadow-element-pressed)`, a well uses
  `var(--s-shadow-element)`, a card or dialog uses `var(--s-shadow-dialog)`. Do not hard-code white glows such as
  `1px 1px 5px #fff`: they ignore the light direction and look wrong beside the rest of the page.
- **No painted outlines on controls.** Edges are defined by a soft contact shadow, not a border. Token inputs and
  selectors keep the bevel look described in [UI and UX refinements](ui-ux-improvements.md).
- **The ground only gets darker than `--s-color-utility-body`.** Pills and wells fill themselves with that colour
  and rely on shadows to separate from the ground. A lighter ground would show them as flat patches. The one
  lighter area, the key-light pool, stays inside the sidebar column, and the sidebar's icon sockets are
  transparent unless selected.
- **Keep text legible on the darkest ground.** The ground darkens toward the lower right and picks up a little
  pink and lavender. Secondary and tertiary text must stay at 4.5:1 on the darkest corner, which is why the
  Light tertiary text colour is `#716269`. Change an overlay strength and the unit test will tell you.
- **The mobile drawer keeps its scrim.** Below 528px `.app-menu.visible` paints a translucent scrim and the inner
  panel paints the body colour, so the sidebar is only made transparent from 528px up.
- **Dark must redeclare every token that light derives from the rig.** If a light value mentions `--lm-*`,
  `$legacy-dark-overrides` needs the same property, otherwise Noir would inherit a light recipe. This includes
  tokens that an unscoped rule consumes: `--neu-tabs-shadow` had no value before, so Noir drew no track behind
  tabs, and the light recipe leaked into it until `$legacy-dark-overrides` declared it `none`.
- **Primary actions need `!important`.** Several features pin a white glow with `!important` on their own primary
  buttons (the swap form, the header menu button), so the glow rules in `light-lighting.scss` are `!important`
  and have higher specificity than those. Disabled buttons are excluded, and they keep `box-shadow: none`.

## Checking a change

1. Build into a scratch directory (`npx vite build --outDir <scratch>/dist`) and serve it; do not overwrite
   `dist/`.
2. Screenshot Swap, Pool, Bridge, Explore, Burn, Bots and Store in light at 1440x900 and 390x844, with a dialog
   open, and compare with a build from before the change. Noir should be pixel-identical.
3. Judge small controls at 2x, in rest, hover, focus and pressed states.
4. Run `node ./scripts/testing/run-vitest-unit.mjs tests/unit/styles` for the contrast, scoping and light
   direction checks in `tests/unit/styles/lightLighting.spec.ts`.
5. The committed route screenshots in `tests/e2e/ui/route-rendering.spec.ts-snapshots/` are light-theme baselines.
   Regenerate them after an intentional change to the rig.
