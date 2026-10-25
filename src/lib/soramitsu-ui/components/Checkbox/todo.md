# Checkboxes - TODO

- [x] Lightweight checkbox atom, with tri-state support
- [x] Solo dual-state checkbox
- [ ] Group of dual-state checkboxes, controlling model with `Set`

  Reference implementation: https://www.w3.org/TR/wai-aria-practices-1.1/examples/checkbox/checkbox-1/checkbox-1.html

  Draft:

  ```vue
  <script setup>
  const model = reactive(new Set(['foo']));
  </script>

  <template>
    <SCheckboxGroup :value="model">
      <SCheckboxGroupItem value="foo"> Foo </SCheckboxGroupItem>
      <SCheckboxGroupItem value="bar" disabled> Bar </SCheckboxGroupItem>
    </SCheckboxGroup>
  </template>
  ```

  ```html
  <div role="group">
    <div role="checkbox" tabindex="0" aria-checked="true">Foo</div>
    <div role="checkbox" tabindex="0" aria-checked="false" aria-disabled="true">Bar</div>
  </div>
  ```

- [ ] Controlling group of checkboxes with tri-state radio

  Reference implementation: https://www.w3.org/TR/wai-aria-practices-1.1/examples/checkbox/checkbox-2/checkbox-2.html

  Would be nice to:
  - implement `aria-controls` binding seamlessly
  - implement smart last-mixed-state toggling

  Questions:
  - Should mixed-checkbox, that controls other checkboxes, be wrapped into a group?
