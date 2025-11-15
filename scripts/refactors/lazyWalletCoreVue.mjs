#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';

const traverse = traverseModule.default ?? traverseModule;
const generate = generateModule.default ?? generateModule;

const rawArgs = process.argv.slice(2);

let targetSource = '@wallet/core';
let loaderModule = '@/utils/walletCore';
const files = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--source') {
    targetSource = rawArgs[++i] ?? targetSource;
    continue;
  }

  if (arg === '--loader') {
    loaderModule = rawArgs[++i] ?? loaderModule;
    continue;
  }

  files.push(arg);
}

if (files.length === 0) {
  console.error('Usage: lazyWalletCoreVue.mjs [--source <module>] [--loader <path>] <files...>');
  process.exit(1);
}

const parserOptions = {
  sourceType: 'module',
  plugins: ['typescript', 'decorators-legacy', 'classProperties', 'topLevelAwait'],
};

for (const file of files) {
  const absPath = resolve(file);
  const source = readFileSync(absPath, 'utf8');

  const { descriptor } = parseSfc(source);
  const scriptBlock = descriptor.scriptSetup ?? descriptor.script;

  if (!scriptBlock) {
    continue;
  }

  const scriptContent = scriptBlock.content;
  const ast = parse(scriptContent, parserOptions);
  const runtimeSpecifiers = [];
  let touched = false;

  traverse(ast, {
    ImportDeclaration(path) {
      const { node } = path;

      if (node.source.value !== targetSource || node.importKind === 'type') {
        return;
      }

      const typeSpecifiers = [];

      for (const specifier of [...node.specifiers]) {
        const importKind = specifier.importKind ?? node.importKind ?? 'value';

        if (importKind === 'type') {
          typeSpecifiers.push(specifier);
          continue;
        }

        if (t.isImportSpecifier(specifier)) {
          const importedName = t.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value;
          runtimeSpecifiers.push({
            imported: importedName,
            local: specifier.local.name,
            isNamespace: false,
          });
        } else if (t.isImportNamespaceSpecifier(specifier)) {
          runtimeSpecifiers.push({
            imported: null,
            local: specifier.local.name,
            isNamespace: true,
          });
        } else if (t.isImportDefaultSpecifier(specifier)) {
          runtimeSpecifiers.push({
            imported: 'default',
            local: specifier.local.name,
            isNamespace: false,
          });
        }

        touched = true;
      }

      if (typeSpecifiers.length > 0) {
        const typeImport = t.importDeclaration(
          typeSpecifiers.map((spec) => {
            const cloned = t.importSpecifier(spec.local, spec.imported ?? spec.local);
            cloned.importKind = 'type';
            return cloned;
          }),
          t.stringLiteral(targetSource)
        );
        typeImport.importKind = 'type';
        path.insertBefore(typeImport);
      }

      path.remove();
    },
  });

  if (runtimeSpecifiers.length === 0) {
    if (!touched) {
      continue;
    }
  }

  let loaderImportPath = null;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === loaderModule) {
        loaderImportPath = path;
      }
    },
  });

  if (loaderImportPath) {
    const existing = new Set(
      loaderImportPath.node.specifiers
        .filter((spec) => !spec.importKind || spec.importKind === 'value')
        .map((spec) => spec.local.name)
    );
    if (!existing.has('loadWalletCore')) {
      loaderImportPath.node.specifiers.push(
        t.importSpecifier(t.identifier('loadWalletCore'), t.identifier('loadWalletCore'))
      );
    }
  } else {
    const loadImport = t.importDeclaration(
      [t.importSpecifier(t.identifier('loadWalletCore'), t.identifier('loadWalletCore'))],
      t.stringLiteral(loaderModule)
    );

    const body = ast.program.body;
    let insertIndex = 0;
    while (insertIndex < body.length && t.isImportDeclaration(body[insertIndex])) {
      insertIndex += 1;
    }
    body.splice(insertIndex, 0, loadImport);
  }

  if (runtimeSpecifiers.length > 0) {
    const objectProperties = runtimeSpecifiers.map(({ imported, local, isNamespace }) => {
      if (isNamespace) {
        return t.restElement(t.identifier(local));
      }

      if (!imported || imported === local) {
        return t.objectProperty(t.identifier(imported ?? local), t.identifier(local), false, true);
      }

      return t.objectProperty(t.identifier(imported), t.identifier(local));
    });

    const destructuringDeclaration = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern(objectProperties),
        t.awaitExpression(t.callExpression(t.identifier('loadWalletCore'), []))
      ),
    ]);

    const body = ast.program.body;
    let lastImportIndex = -1;
    for (let i = 0; i < body.length; i += 1) {
      if (t.isImportDeclaration(body[i])) {
        lastImportIndex = i;
      }
    }

    const hasExistingDestructure = body.some(
      (node) =>
        t.isVariableDeclaration(node) &&
        node.declarations.some(
          (decl) =>
            t.isAwaitExpression(decl.init) &&
            t.isCallExpression(decl.init.argument) &&
            t.isIdentifier(decl.init.argument.callee, { name: 'loadWalletCore' })
        )
    );

    if (!hasExistingDestructure) {
      body.splice(lastImportIndex + 1, 0, destructuringDeclaration);
    } else {
      const existingDecl = body.find(
        (node) =>
          t.isVariableDeclaration(node) &&
          node.declarations.some(
            (decl) =>
              t.isAwaitExpression(decl.init) &&
              t.isCallExpression(decl.init.argument) &&
              t.isIdentifier(decl.init.argument.callee, { name: 'loadWalletCore' })
          )
      );

      if (existingDecl) {
        const declarator = existingDecl.declarations.find(
          (decl) =>
            t.isAwaitExpression(decl.init) &&
            t.isCallExpression(decl.init.argument) &&
            t.isIdentifier(decl.init.argument.callee, { name: 'loadWalletCore' }) &&
            t.isObjectPattern(decl.id)
        );

        if (declarator && t.isObjectPattern(declarator.id)) {
          for (const prop of objectProperties) {
            const keyName = t.isRestElement(prop)
              ? prop.argument.name
              : t.isIdentifier(prop.key)
                ? prop.key.name
                : null;
            const exists = declarator.id.properties.some((existingProp) => {
              if (t.isRestElement(existingProp)) {
                return existingProp.argument.name === keyName;
              }
              if (t.isIdentifier(existingProp.key)) {
                return existingProp.key.name === keyName;
              }
              return false;
            });
            if (!exists) {
              declarator.id.properties.push(prop);
            }
          }
        }
      }
    }
  }

  let output = generate(ast, { decoratorsBeforeExport: true }).code;
  output = output
    .replace(/';(?=(import|const|let|var))/g, "';\n")
    .replace(/";(?=(import|const|let|var))/g, '";\n')
    .replace(/';const {/g, "';\nconst {")
    .replace(/";const {/g, '";\nconst {')
    .replace(/';import { loadWalletCore/g, "';\nimport { loadWalletCore")
    .replace(/";import { loadWalletCore/g, '";\nimport { loadWalletCore');

  const openTagEnd = source.indexOf('>', scriptBlock.loc.start.offset) + 1;
  const closeTagStart = source.lastIndexOf('</script>', scriptBlock.loc.end.offset);

  const before = source.slice(0, openTagEnd);
  const after = source.slice(closeTagStart);
  const updated = `${before}\n${output.trim()}\n${after}`;

  writeFileSync(absPath, `${updated}\n`);
}
