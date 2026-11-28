/** Exercise the published input and keyboard-accessibility packages used by Vite's vendor aliases. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FocusTrap } from 'focus-trap';
import { createFocusTrap } from '../../../vendor/focus-trap/dist/focus-trap.esm.js';
import { Mask, MaskInput } from 'maska';
import { isFocusable, tabbable } from 'tabbable';

vi.unmock('focus-trap');
vi.unmock('tabbable');

const traps: FocusTrap[] = [];
const masks: MaskInput[] = [];

/** Mount a dialog with a separate trigger, using actual DOM focus behavior. */
function mountDialog() {
  document.body.innerHTML = `
    <button id="trigger">Open wallet</button>
    <section id="dialog" role="dialog">
      <input id="account" aria-label="Account name">
      <button id="save">Save</button>
    </section>
  `;
  const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
  const dialog = document.querySelector<HTMLElement>('#dialog')!;
  const account = document.querySelector<HTMLInputElement>('#account')!;
  const save = document.querySelector<HTMLButtonElement>('#save')!;
  trigger.focus();
  const trap = createFocusTrap(dialog, {
    delayInitialFocus: false,
    // JSDOM does not perform layout; retain all other real focusability checks.
    tabbableOptions: { displayCheck: 'none' },
  });
  traps.push(trap);
  return { trigger, account, save, trap };
}

afterEach(() => {
  for (const trap of traps.splice(0)) trap.deactivate({ returnFocus: false });
  for (const mask of masks.splice(0)) mask.destroy();
  document.body.replaceChildren();
});

describe('published vendor interactions', () => {
  it('excludes disabled, inert, hidden and collapsed controls from keyboard navigation', () => {
    document.body.innerHTML = `
      <button id="available">Available</button>
      <button disabled>Disabled</button>
      <section inert><button>Inert descendant</button></section>
      <input type="hidden">
      <button style="visibility: hidden">Hidden</button>
      <button style="visibility: collapse">Collapsed</button>
      <button id="programmatic" tabindex="-1">Programmatic focus</button>
    `;

    expect(tabbable(document.body, { displayCheck: 'none' }).map((element) => element.id)).toEqual(['available']);
    expect(isFocusable(document.querySelector('#programmatic')!, { displayCheck: 'none' })).toBe(true);
  });

  it('focuses a dialog and keeps forward and backward keyboard navigation inside it', () => {
    const { account, save, trap } = mountDialog();
    trap.activate();
    expect(document.activeElement).toBe(account);

    account.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(save);

    save.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(account);
  });

  it('allows focus outside while paused and restores the trigger after deactivation', async () => {
    const { trigger, account, trap } = mountDialog();
    trap.activate();
    trap.pause();
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    trap.unpause();
    expect(document.activeElement).toBe(account);
    trap.deactivate();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the keyboard trap on Escape and returns focus to its trigger', async () => {
    const { trigger, account, trap } = mountDialog();
    trap.activate();
    account.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(trap.active).toBe(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('masks typing and deletion, emits usable values, and removes its input listener on destruction', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const onMaska = vi.fn();
    const mask = new MaskInput(input, { mask: '###-##', onMaska });
    masks.push(mask);

    input.value = '12x345';
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    expect(input.value).toBe('123-45');
    expect(onMaska).toHaveBeenLastCalledWith({ masked: '123-45', unmasked: '12345', completed: true });

    input.value = '123-4';
    input.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
    expect(input.value).toBe('123-4');
    expect(onMaska).toHaveBeenLastCalledWith({ masked: '123-4', unmasked: '1234', completed: false });

    mask.destroy();
    onMaska.mockClear();
    input.value = 'unmasked';
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    expect(input.value).toBe('unmasked');
    expect(onMaska).not.toHaveBeenCalled();
  });

  it('preserves large numeric input as strings and supports custom token normalization', () => {
    const numericMask = new Mask({ mask: '#'.repeat(22) });
    expect(numericMask.masked('9007199254740993123456')).toBe('9007199254740993123456');

    const codeMask = new Mask({
      mask: 'XX-###',
      tokens: { X: { pattern: /[a-z]/i, transform: (character) => character.toUpperCase() } },
    });
    expect(codeMask.masked('ab123')).toBe('AB-123');
    expect(codeMask.unmasked('AB-123')).toBe('AB123');
  });
});
