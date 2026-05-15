const VUE_COMPAT_AUTO_IMPORTS = [
  'computed',
  'getCurrentInstance',
  'h',
  'inject',
  'markRaw',
  'nextTick',
  'onBeforeUnmount',
  'onMounted',
  'onScopeDispose',
  'onUnmounted',
  'provide',
  'reactive',
  'readonly',
  'ref',
  'shallowReactive',
  'shallowRef',
  'toRef',
  'toRefs',
  'unref',
  'useAttrs',
  'useSlots',
  'watch',
  'watchEffect',
];

const VUEUSE_COMPAT_AUTO_IMPORTS = [
  'eagerComputed',
  'templateRef',
  'unrefElement',
  'useFocus',
  'useResizeObserver',
  'useToggle',
  'watchOnce',
  'whenever',
];

const collectNamedImports = (code, moduleName) => {
  const names = new Set();
  const matcher = new RegExp(
    String.raw`import\s*\{([^}]*)\}\s*from\s*['"]${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
    'g'
  );

  for (const match of code.matchAll(matcher)) {
    const specifiers = match[1].split(',');
    for (const specifier of specifiers) {
      const localName = specifier
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (localName) {
        names.add(localName);
      }
    }
  }

  return names;
};

const hasLocalBinding = (code, identifier) => {
  const patterns = [
    new RegExp(String.raw`\b(?:const|let|var|function|class)\s+${identifier}\b`),
    new RegExp(String.raw`\bcatch\s*\(\s*${identifier}\s*\)`),
    new RegExp(String.raw`\bfor\s*\(\s*(?:const|let|var)\s+${identifier}\b`),
  ];

  return patterns.some((pattern) => pattern.test(code));
};

const injectCompatImports = (source) => {
  const vueImports = collectNamedImports(source, 'vue');
  const vueUseImports = collectNamedImports(source, '@vueuse/core');
  const injectVue = VUE_COMPAT_AUTO_IMPORTS.filter((identifier) => {
    return (
      new RegExp(String.raw`\b${identifier}\b`).test(source) &&
      !vueImports.has(identifier) &&
      !hasLocalBinding(source, identifier)
    );
  });
  const injectVueUse = VUEUSE_COMPAT_AUTO_IMPORTS.filter((identifier) => {
    return (
      new RegExp(String.raw`\b${identifier}\b`).test(source) &&
      !vueUseImports.has(identifier) &&
      !hasLocalBinding(source, identifier)
    );
  });

  if (!injectVue.length && !injectVueUse.length) {
    return null;
  }

  const banner = [
    injectVue.length ? `import { ${injectVue.join(', ')} } from 'vue';` : '',
    injectVueUse.length ? `import { ${injectVueUse.join(', ')} } from '@vueuse/core';` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `${banner}\n${source}`;
};

/**
 * Adds missing Vue/VueUse imports to vendored Vue 2-era sources while the
 * vendored UI libraries are being inlined and migrated to explicit imports.
 */
export const compatAutoImportPlugin = ({ soramitsuUiRootPath, soraneoWalletSrcPath }) => ({
  name: 'compat-auto-imports',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('?')) {
      return null;
    }

    const isVendoredSource = id.startsWith(soramitsuUiRootPath) || id.startsWith(soraneoWalletSrcPath);

    if (!isVendoredSource) {
      return null;
    }

    if (id.endsWith('.vue')) {
      const match = code.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/);
      if (!match) return null;

      const [fullMatch, attrs, scriptContent] = match;
      const nextScriptContent = injectCompatImports(scriptContent);
      if (!nextScriptContent) return null;

      return code.replace(fullMatch, `<script${attrs}>\n${nextScriptContent}\n</script>`);
    }

    if (/\.([cm]?js|ts|tsx)$/.test(id)) {
      const nextCode = injectCompatImports(code);
      if (!nextCode) return null;

      return {
        code: nextCode,
        map: null,
      };
    }

    return null;
  },
});
