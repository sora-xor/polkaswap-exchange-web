'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.main = main;
var _fs = _interopRequireDefault(require('fs'));
var _types = require('@polkadot/types');
var definitions = _interopRequireWildcard(require('@polkadot/types/cjs/interfaces/definitions'));
var _getStorage = require('@polkadot/types/cjs/metadata/decorate/storage/getStorage');
var _StorageKey = require('@polkadot/types/cjs/primitive/StorageKey');
var _staticSubstrate = _interopRequireDefault(require('@polkadot/types-support/cjs/metadata/static-substrate'));
var _util = require('@polkadot/util');
var _utilCrypto = require('@polkadot/util-crypto');
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

const headerFn = (runtimeDesc) =>
  `\n\n(NOTE: These were generated from a static/snapshot view of a recent ${runtimeDesc}. Some items may not be available in older nodes, or in any customized implementations.)`;

/** @internal */
function docsVecToMarkdown(docLines) {
  let indent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const md = docLines
    .map((docLine) => docLine.toString().trimStart().replace(/^r"/g, '').trimStart())
    .reduce(
      (md, docLine) =>
        // generate paragraphs
        !docLine.length
          ? `${md}\n\n` // empty line
          : /^[*-]/.test(docLine.trimStart()) && !md.endsWith('\n\n')
            ? `${md}\n\n${docLine}` // line calling for a preceding linebreak
            : `${md} ${docLine.replace(/^#{1,3} /, '#### ')} `,
      ''
    )
    .replace(/#### <weight>/g, '<weight>')
    .replace(/<weight>(.|\n)*?<\/weight>/g, '')
    .replace(/#### Weight:/g, 'Weight:');

  // prefix each line with indentation
  return (
    md &&
    md
      .split('\n\n')
      .map((line) => `${' '.repeat(indent)}${line}`)
      .join('\n\n')
  );
}
function renderPage(page) {
  let md = `---\ntitle: ${page.title}\n---\n\n`;
  if (page.description) {
    md += `${page.description}\n\n`;
  }

  // index
  page.sections.forEach((section) => {
    md += `- **[${(0, _util.stringCamelCase)(section.name)}](#${(0, _util.stringCamelCase)(section.name).toLowerCase()})**\n\n`;
  });

  // contents
  page.sections.forEach((section) => {
    md += '\n___\n\n\n';
    md += section.link ? `<h2 id="#${section.link}">${section.name}</h2>\n` : `## ${section.name}\n`;
    if (section.description) {
      md += `\n_${section.description}_\n`;
    }
    section.items.forEach((item) => {
      md += ' \n';
      md += item.link ? `<h3 id="#${item.link}">${item.name}</h3>` : `### ${item.name}`;
      Object.keys(item)
        .filter((key) => !['link', 'name'].includes(key))
        .forEach((bullet) => {
          md += `\n- **${bullet}**: ${
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            item[bullet] instanceof _types.Vec ? docsVecToMarkdown(item[bullet], 2).toString() : item[bullet]
          }`;
        });
      md += '\n';
    });
  });
  return md;
}
function sortByName(a, b) {
  // case insensitive (all-uppercase) sorting
  return a.name.toString().toUpperCase().localeCompare(b.name.toString().toUpperCase());
}
function getSiName(lookup, type) {
  const typeDef = lookup.getTypeDef(type);
  return typeDef.lookupName || typeDef.type;
}

/** @internal */
function addRpc(_runtimeDesc, rpcMethods) {
  return renderPage({
    description:
      'The following sections contain known RPC methods that may be available on specific nodes (depending on configuration and available pallets) and allow you to interact with the actual node, query, and submit.',
    sections: Object.keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .sort()
      .reduce((all, _sectionName) => {
        const section = definitions[_sectionName];
        Object.keys(section.rpc || {})
          .sort()
          .forEach((methodName) => {
            const method = (section.rpc || {})[methodName];
            const sectionName = method.aliasSection || _sectionName;
            const jsonrpc = method.endpoint || `${sectionName}_${methodName}`;
            if (rpcMethods) {
              // if we are passing the rpcMethods params and we cannot find this method, skip it
              if (jsonrpc !== 'rpc_methods' && !rpcMethods.includes(jsonrpc)) {
                return;
              }
            }
            const topName = method.aliasSection ? `${_sectionName}/${method.aliasSection}` : _sectionName;
            let container = all.find((_ref) => {
              let { name } = _ref;
              return name === topName;
            });
            if (!container) {
              container = {
                items: [],
                name: topName,
              };
              all.push(container);
            }
            const args = method.params
              .map((_ref2) => {
                let { isOptional, name, type } = _ref2;
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                return name + (isOptional ? '?' : '') + ': `' + type + '`';
              })
              .join(', ');
            const type = '`' + method.type + '`';
            const item = {
              interface: '`' + `api.rpc.${sectionName}.${methodName}` + '`',
              jsonrpc: '`' + jsonrpc + '`',
              // link: jsonrpc,
              name: `${methodName}(${args}): ${type}`,
              ...(method.description && {
                summary: method.description,
              }),
            };
            if (method.deprecated) {
              item.deprecated = method.deprecated;
            }
            container.items.push(item);
          });
        return all;
      }, [])
      .sort(sortByName),
    title: 'JSON-RPC',
  });
}

/** @internal */
function addRuntime(_runtimeDesc, apis) {
  return renderPage({
    description:
      'The following section contains known runtime calls that may be available on specific runtimes (depending on configuration and available pallets). These call directly into the WASM runtime for queries and operations.',
    sections: Object.keys(definitions)
      .filter((key) => Object.keys(definitions[key].runtime || {}).length !== 0)
      .sort()
      .reduce((all, _sectionName) => {
        Object.entries(definitions[_sectionName].runtime || {}).forEach((_ref3) => {
          let [apiName, versions] = _ref3;
          versions
            .sort((a, b) => b.version - a.version)
            .forEach((_ref4, index) => {
              let { methods, version } = _ref4;
              if (apis) {
                // if we are passing the api hashes and we cannot find this one, skip it
                const apiHash = (0, _utilCrypto.blake2AsHex)(apiName, 64);
                const api = apis.find((_ref5) => {
                  let [hash] = _ref5;
                  return hash === apiHash;
                });
                if (!api || api[1] !== version) {
                  return;
                }
              } else if (index) {
                // we only want the highest version
                return;
              }
              const container = {
                items: [],
                name: apiName,
              };
              all.push(container);
              Object.entries(methods)
                .sort((_ref6, _ref7) => {
                  let [a] = _ref6;
                  let [b] = _ref7;
                  return a.localeCompare(b);
                })
                .forEach((_ref8) => {
                  let [methodName, { description, params, type }] = _ref8;
                  const args = params
                    .map((_ref9) => {
                      let { name, type } = _ref9;
                      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                      return name + ': `' + type + '`';
                    })
                    .join(', ');
                  container.items.push({
                    interface:
                      '`' +
                      `api.call.${(0, _util.stringCamelCase)(apiName)}.${(0, _util.stringCamelCase)(methodName)}` +
                      '`',
                    name: `${(0, _util.stringCamelCase)(methodName)}(${args}): ${'`' + type + '`'}`,
                    runtime: '`' + `${apiName}_${methodName}` + '`',
                    summary: description,
                  });
                });
            });
        });
        return all;
      }, [])
      .sort(sortByName),
    title: 'Runtime',
  });
}

/** @internal */
function addConstants(runtimeDesc, _ref10) {
  let { lookup, pallets } = _ref10;
  return renderPage({
    description: `The following sections contain the module constants, also known as parameter types. These can only be changed as part of a runtime upgrade. On the api, these are exposed via \`api.consts.<module>.<method>\`. ${headerFn(runtimeDesc)}`,
    sections: pallets
      .sort(sortByName)
      .filter((_ref11) => {
        let { constants } = _ref11;
        return !constants.isEmpty;
      })
      .map((_ref12) => {
        let { constants, name } = _ref12;
        const sectionName = (0, _util.stringLowerFirst)(name);
        return {
          items: constants.sort(sortByName).map((_ref13) => {
            let { docs, name, type } = _ref13;
            const methodName = (0, _util.stringCamelCase)(name);
            return {
              interface: '`' + `api.consts.${sectionName}.${methodName}` + '`',
              name: `${methodName}: ` + '`' + getSiName(lookup, type) + '`',
              ...(docs.length && {
                summary: docs,
              }),
            };
          }),
          name: sectionName,
        };
      }),
    title: 'Constants',
  });
}

/** @internal */
function addStorage(runtimeDesc, _ref14) {
  let { lookup, pallets, registry } = _ref14;
  const { substrate } = (0, _getStorage.getStorage)(registry);
  const moduleSections = pallets
    .sort(sortByName)
    .filter((moduleMetadata) => !moduleMetadata.storage.isNone)
    .map((moduleMetadata) => {
      const sectionName = (0, _util.stringLowerFirst)(moduleMetadata.name);
      return {
        items: moduleMetadata.storage
          .unwrap()
          .items.sort(sortByName)
          .map((func) => {
            let arg = '';
            if (func.type.isMap) {
              const { hashers, key } = func.type.asMap;
              arg =
                '`' +
                (hashers.length === 1
                  ? getSiName(lookup, key)
                  : lookup
                      .getSiType(key)
                      .def.asTuple.map((t) => getSiName(lookup, t))
                      .join(', ')) +
                '`';
            }
            const methodName = (0, _util.stringLowerFirst)(func.name);
            const outputType = (0, _StorageKey.unwrapStorageType)(registry, func.type, func.modifier.isOptional);
            return {
              interface: '`' + `api.query.${sectionName}.${methodName}` + '`',
              name: `${methodName}(${arg}): ` + '`' + outputType + '`',
              ...(func.docs.length && {
                summary: func.docs,
              }),
            };
          }),
        name: sectionName,
      };
    });
  return renderPage({
    description: `The following sections contain Storage methods are part of the ${runtimeDesc}. On the api, these are exposed via \`api.query.<module>.<method>\`. ${headerFn(runtimeDesc)}`,
    sections: moduleSections
      .concat([
        {
          description:
            'These are well-known keys that are always available to the runtime implementation of any Substrate-based network.',
          items: Object.entries(substrate).map((_ref15) => {
            let [name, { meta }] = _ref15;
            const arg = meta.type.isMap ? '`' + getSiName(lookup, meta.type.asMap.key) + '`' : '';
            const methodName = (0, _util.stringLowerFirst)(name);
            const outputType = (0, _StorageKey.unwrapStorageType)(registry, meta.type, meta.modifier.isOptional);
            return {
              interface: '`' + `api.query.substrate.${methodName}` + '`',
              name: `${methodName}(${arg}): ` + '`' + outputType + '`',
              summary: meta.docs,
            };
          }),
          name: 'substrate',
        },
      ])
      .sort(sortByName),
    title: 'Storage',
  });
}

/** @internal */
function addExtrinsics(runtimeDesc, _ref16) {
  let { lookup, pallets } = _ref16;
  return renderPage({
    description: `The following sections contain Extrinsics methods are part of the ${runtimeDesc}. On the api, these are exposed via \`api.tx.<module>.<method>\`. ${headerFn(runtimeDesc)}`,
    sections: pallets
      .sort(sortByName)
      .filter((_ref17) => {
        let { calls } = _ref17;
        return calls.isSome;
      })
      .map((_ref18) => {
        let { calls, name } = _ref18;
        const sectionName = (0, _util.stringCamelCase)(name);
        return {
          items: lookup
            .getSiType(calls.unwrap().type)
            .def.asVariant.variants.sort(sortByName)
            .map((_ref19, index) => {
              let { docs, fields, name } = _ref19;
              const methodName = (0, _util.stringCamelCase)(name);
              const args = fields
                .map((_ref20) => {
                  let { name, type } = _ref20;
                  return `${name.isSome ? name.toString() : `param${index}`}: ` + '`' + getSiName(lookup, type) + '`';
                })
                .join(', ');
              return {
                interface: '`' + `api.tx.${sectionName}.${methodName}` + '`',
                name: `${methodName}(${args})`,
                ...(docs.length && {
                  summary: docs,
                }),
              };
            }),
          name: sectionName,
        };
      }),
    title: 'Extrinsics',
  });
}

/** @internal */
function addEvents(runtimeDesc, _ref21) {
  let { lookup, pallets } = _ref21;
  return renderPage({
    description: `Events are emitted for certain operations on the runtime. The following sections describe the events that are part of the ${runtimeDesc}. ${headerFn(runtimeDesc)}`,
    sections: pallets
      .sort(sortByName)
      .filter((_ref22) => {
        let { events } = _ref22;
        return events.isSome;
      })
      .map((meta) => ({
        items: lookup
          .getSiType(meta.events.unwrap().type)
          .def.asVariant.variants.sort(sortByName)
          .map((_ref23) => {
            let { docs, fields, name } = _ref23;
            const methodName = name.toString();
            const args = fields
              .map((_ref24) => {
                let { type } = _ref24;
                return '`' + getSiName(lookup, type) + '`';
              })
              .join(', ');
            return {
              interface: '`' + `api.events.${(0, _util.stringCamelCase)(meta.name)}.${methodName}.is` + '`',
              name: `${methodName}(${args})`,
              ...(docs.length && {
                summary: docs,
              }),
            };
          }),
        name: (0, _util.stringCamelCase)(meta.name),
      })),
    title: 'Events',
  });
}

/** @internal */
function addErrors(runtimeDesc, _ref25) {
  let { lookup, pallets } = _ref25;
  return renderPage({
    description: `This page lists the errors that can be encountered in the different modules. ${headerFn(runtimeDesc)}`,
    sections: pallets
      .sort(sortByName)
      .filter((_ref26) => {
        let { errors } = _ref26;
        return errors.isSome;
      })
      .map((moduleMetadata) => ({
        items: lookup
          .getSiType(moduleMetadata.errors.unwrap().type)
          .def.asVariant.variants.sort(sortByName)
          .map((error) => ({
            interface:
              '`' + `api.errors.${(0, _util.stringCamelCase)(moduleMetadata.name)}.${error.name.toString()}.is` + '`',
            name: error.name.toString(),
            ...(error.docs.length && {
              summary: error.docs,
            }),
          })),
        name: (0, _util.stringLowerFirst)(moduleMetadata.name),
      })),
    title: 'Errors',
  });
}

/** @internal */
function writeFile(name) {
  const writeStream = _fs.default.createWriteStream(name, {
    encoding: 'utf8',
    flags: 'w',
  });
  writeStream.on('finish', () => {
    console.log(`Completed writing ${name}`);
  });
  for (var _len = arguments.length, chunks = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    chunks[_key - 1] = arguments[_key];
  }
  chunks.forEach((chunk) => {
    writeStream.write(chunk);
  });
  writeStream.end();
}
function main() {
  const registry = new _types.TypeRegistry();
  const metadata = new _types.Metadata(registry, _staticSubstrate.default);
  registry.setMetadata(metadata);
  const latest = metadata.asLatest;

  // TODO Make can make this a variable passed in via args if we want to generate
  // for different chain types
  const chainName = 'Substrate';
  const runtimeDesc = `default ${chainName} runtime`;
  const docRoot = `docs/${chainName.toLowerCase()}`;

  // TODO Pass the result from `rpc_methods` (done via util/wsMeta.ts -> getRpcMethodsViaWs)
  // into here if we want to have a per-chain overview
  writeFile(`${docRoot}/rpc.md`, addRpc(runtimeDesc));

  // TODO Pass the result from `state_getRuntimeVersion` (done via util/wsMeta.ts -> getRuntimeVersionViaWs)
  // into here if we want to have a per-chain overview
  writeFile(`${docRoot}/runtime.md`, addRuntime(runtimeDesc));
  writeFile(`${docRoot}/constants.md`, addConstants(runtimeDesc, latest));
  writeFile(`${docRoot}/storage.md`, addStorage(runtimeDesc, latest));
  writeFile(`${docRoot}/extrinsics.md`, addExtrinsics(runtimeDesc, latest));
  writeFile(`${docRoot}/events.md`, addEvents(runtimeDesc, latest));
  writeFile(`${docRoot}/errors.md`, addErrors(runtimeDesc, latest));
}
