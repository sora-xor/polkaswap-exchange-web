import { createApp, defineComponent, h, type SetupContext } from 'vue';
import { onTestFinished } from 'vitest';

interface SetupComponent<Props, State> {
  setup?: (props: Readonly<Props>, context: SetupContext) => State;
}

interface MountSetupResult<State> {
  state: State;
  unmount: () => void;
}

const createSetupContext = (context: Partial<SetupContext> = {}): SetupContext => {
  return {
    attrs: context.attrs ?? {},
    slots: context.slots ?? {},
    emit: context.emit ?? (() => undefined),
    expose: context.expose ?? (() => undefined),
  };
};

/**
 * Executes a component setup function inside a real Vue instance.
 *
 * Some focused unit tests only need returned setup state and handlers. Calling
 * setup directly skips Vue's active component instance, so lifecycle APIs such
 * as onMounted warn even though the component code is valid at runtime.
 */
export function mountSetup<Props extends Record<string, unknown>, State>(
  component: SetupComponent<Props, State>,
  props: Props,
  context: Partial<SetupContext> = {}
): MountSetupResult<State> {
  if (!component.setup) {
    throw new Error('mountSetup requires a component with a setup function.');
  }

  let state: State | undefined;
  const container = document.createElement('div');
  const app = createApp(
    defineComponent({
      name: 'SetupHarness',
      setup() {
        state = component.setup?.(props, createSetupContext(context));

        return () => h('div');
      },
    })
  );
  let isMounted = true;

  app.mount(container);

  const unmount = (): void => {
    if (!isMounted) return;
    isMounted = false;
    app.unmount();
    container.remove();
  };

  onTestFinished(unmount);

  return {
    state: state as State,
    unmount,
  };
}
