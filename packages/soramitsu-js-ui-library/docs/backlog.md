# Soramitsu UI Library – TODO Backlog

> These items were uncovered while auditing the repository. They are tracked here until we create dedicated issues.

## Popover

- Share trigger/popup event logic between `SPopover` and `SModal` to remove duplication in `src/components/Popover/util.ts`.

## Select

- Extend `SelectButtonType` with the pending icon-only variant once the design tokens are ready (`src/components/Select/types.ts`).
- Implement automatic selection of the first option when `mandatory` is set and `modelValue` is `null` (`src/components/Select/SSelectBase.vue`).
- Wire the `syncMenuAndInputWidths` flag in `SSelectBase` so dropdown width can follow the control width.

## Spinner

- Convert `SSpinner` into a functional component to reduce render overhead (`src/components/Spinner/SSpinner.vue`).

## Alert

- Add the inline presentation mode for `SAlert` (`src/components/Alert/SAlert.vue`).

## Icons

- Replace temporary `~icons/*` fallbacks with official Soramitsu icons once they land in the design system, and add the missing info icon for 16px status map (`src/components/icons/index.ts`).

## Table

- Replace the placeholder tooltip integration comment in `STable` once the shared tooltip utility is available (`src/components/Table/STable.vue`).

## Checkbox

- Finish the tasks tracked in `packages/ui/src/components/Checkbox/todo.md` (remains separate for component-specific notes).

## Json Input

- Keep `SJsonInput` opt-in; auto-registering it would pull JSONEditor’s CSS side effects into every bundle and break tree-shaking. Consumers should import it manually when needed.
