import * as utils from '@/utils.mjs';
import { getConfig, getVueFiles, getPlugins, getConstants, getVueObjects } from '@/config.mjs';
import {
  Range,
  SnippetString,
  languages,
  CompletionItem,
  CompletionItemKind,
  workspace,
} from 'vscode';
import { kebabCase, camelCase } from 'lodash';

const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };
const cypressFilePattern = { scheme: 'file', pattern: '**/tests/**/*.js' };

/**
 * @description Return intertion text for an oject or function woth its params
 * @param {Object} obj
 * @returns {String}
 */
function getInsertObject(obj) {
  try {
    if (obj.value?.type === 'ArrowFunctionExpression') {
      const params = obj.value?.raw?.match(/\(?([\w,\s]*)\)?\s?=>/)?.[1] ?? [];
      return `${obj.name}(${params.trim()})`;
    } else {
      return obj.name;
    }
  } catch (err) {
    console.error('Error en getInsertObject: ', err);
  }
}

/**
 * @description Creates a completion item for a component
 * @param {Object} item
 * @returns {CompletionItem}
 */
function createComponentCompletionItem(item) {
  try {
    const fileName = utils.retrieveComponentNameFromFile(item?.filePath);
    const componentName = item?.componentName || fileName;
    const snippetCompletion = new CompletionItem(componentName, CompletionItemKind.Constructor);
    snippetCompletion.detail = item.range
      ? componentName
      : utils.retrieveWithDirectoryInformationFromFile(item?.filePath);
    snippetCompletion.command = {
      title: 'Import file',
      command: 'VueDiscoveryMTM.importFile',
      arguments: [item, fileName],
    };

    // We don't want to insert anything here since this will be done in the importFile command
    snippetCompletion.insertText = '';
    return snippetCompletion;
  } catch (error) {
    console.error('Error en createComponentCompletionItem:', error);
  }
}

/**
 * @description Creates a completion item for a property
 * @param {Object} prop
 * @param {String} charBefore
 * @param {String} charAfter
 * @returns {CompletionItem}
 */
function createPropCompletionItem(prop, charBefore, charAfter) {
  try {
    let propIconType = getConfig('propIconType');
    if (propIconType === 'Auto') {
      propIconType =
        workspace.getConfiguration().get('editor.snippetSuggestions') === 'top'
          ? 'Snippet'
          : 'Property';
    }
    const { name } = prop;
    const snippetCompletion = new CompletionItem(name, CompletionItemKind[`${propIconType}`]);
    const includeSpaceBefore = ![' ', ':'].includes(charBefore);
    const includeSpaceAfter = ![' '].includes(charAfter);
    snippetCompletion.insertText = new SnippetString(
      `${includeSpaceBefore ? ' ' : ''}${name}="$0"${includeSpaceAfter ? ' ' : ''}`
    );
    snippetCompletion.documentation = utils.markdownProp(prop);
    snippetCompletion.detail = 'Vue Discovery MTM';
    snippetCompletion.sortText = '\u00000000' + name;

    return snippetCompletion;
  } catch (error) {
    console.error('Error en createPropCompletionItem:', error);
  }
}

/**
 * @description Creates a completion item for a event
 * @param {String} event
 * @param {String} charBefore
 * @param {String} charAfter
 * @returns {CompletionItem}
 */
function createEventCompletionItem(event, charBefore, charAfter) {
  try {
    const snippetCompletion = new CompletionItem(event, CompletionItemKind.Event);
    const includeSpaceBefore = ![' ', '@'].includes(charBefore);
    const includeSpaceAfter = ![' '].includes(charAfter);
    const hasArroba = charBefore === '@';
    snippetCompletion.insertText = new SnippetString(
      `${includeSpaceBefore ? ' ' : ''}${hasArroba ? '' : '@'}${kebabCase(event)}="$0"${
        includeSpaceAfter ? ' ' : ''
      }`
    );
    snippetCompletion.detail = 'Vue Discovery MTM';
    snippetCompletion.sortText = '\u00000001' + event;
    return snippetCompletion;
  } catch (error) {
    console.error('Error en createEventCompletionItem:', error);
  }
}

/**
 * @description Creates a completion item for a this attribute
 * @param {Object} obj
 * @param {Range} range
 * @returns {CompletionItem}
 */
function createThisCompletionItem(obj, range = null) {
  try {
    const { name, kind } = obj;
    const objConfig = {
      data: {
        item: 'Field',
        markdown: utils.getMarkdownData,
        insert: x => `${x.name}`,
        sortText: '\u0000',
      },
      computed: {
        item: 'Field',
        markdown: utils.getMarkdownComputed,
        insert: x => `${x.name}`,
        sortText: '\u0000',
      },
      prop: {
        item: 'Property',
        label: x => `${camelCase(x.name)} (${x.kind})`,
        markdown: utils.getMarkdownProps,
        insert: x => `${camelCase(x.name)}`,
        sortText: '\u0000',
      },
      method: {
        item: 'Method',
        markdown: utils.getMarkdownMethods,
        insert: x => `${x.name}(${x.params?.map(reg => reg.name).join(',') || ''})`,
        sortText: '\u0000',
      },
      plugin: {
        item: 'Field',
        markdown: utils.getMarkdownPlugins,
        insert: x => `\\${x.name}`,
        sortText: '\u0001',
        commitCharacters: ['.'],
      },
      library: {
        item: 'Field',
        label: x => `${x.name}`,
        markdown: utils.getMarkdownPlugins,
        insert: x => `\\${x.name}`,
        sortText: '\u0001',
        commitCharacters: ['.'],
      },
      object: {
        item: 'Field',
        label: x => `${x.name} (${x.origen})`,
        markdown: utils.getMarkdownObject,
        insert: getInsertObject,
        sortText: '\u0000',
      },
      ref: {
        item: 'Field',
        markdown: utils.getMarkdownRef,
        insert: x => `${x.name}`,
        sortText: '\u0000',
      },
      constant: {
        item: 'Property',
        markdown: utils.getMarkdownConstants,
        insert: x => `${x.name}`,
        sortText: '\u0000',
      },
    };
    // Establecemos valores por defecto
    const { label, item, markdown, insert, sortText, filterText, commitCharacters } =
      objConfig[kind];
    const atribCompletion = new CompletionItem(
      label?.(obj) ?? `${name} (${kind})`,
      CompletionItemKind[`${item ?? 'Field'}`]
    );
    atribCompletion.insertText = new SnippetString(insert?.(obj) ?? name);
    atribCompletion.documentation = markdown?.(obj) ?? '';
    atribCompletion.detail = 'Vue Discovery MTM';
    atribCompletion.sortText = `${sortText ?? '\u0000'}${name}`;
    atribCompletion.filterText = `${filterText ?? atribCompletion.label}()`;
    atribCompletion.commitCharacters = commitCharacters ?? [];
    if (range) {
      atribCompletion.range = { inserting: range, replacing: range };
    }
    return atribCompletion;
  } catch (error) {
    console.error('Error en createThisCompletionItem:', error);
  }
}

/**
 * @description Creates a completion item for a Cypress action
 * @param {Object} cyAction
 * @returns {CompletionItem}
 */
function createCyCompletionItem(cyAction) {
  try {
    const name = cyAction['name'];
    const params = cyAction['params'];
    const snippetCompletion = new CompletionItem(name, CompletionItemKind.Function);
    // generamos el texto a pinta en al seleccionar la action
    const text = new SnippetString(`${name}(`);
    (params?.trim()?.split(',') || [])
      .filter(x => x !== 'subject')
      .forEach((value, index) => {
        if (value) {
          text.appendText(`${index > 0 ? ', ' : ''}`).appendPlaceholder(value);
        }
      });
    text.appendText(');');
    snippetCompletion.insertText = text;
    snippetCompletion.detail = 'Vue Discovery MTM';
    return snippetCompletion;
  } catch (error) {
    console.error('Error en createCyCompletionItem:', error);
  }
}

const componentsCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems() {
      try {
        const position = utils.getActiveEditorPosition();
        if (
          utils.isPositionInTemplateSection(position) &&
          !utils.isCursorInsideEntryTagComponent() &&
          !utils.isPositionInQuotationMarks(position)
        ) {
          return getVueFiles()?.map(createComponentCompletionItem);
        }
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '<'
);

const propsCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        if (
          !utils.isCursorInsideEntryTagComponent() ||
          utils.isPositionInQuotationMarks(position)
        ) {
          return;
        }
        const props = await utils.getPropsForLine(position.line, position.character);

        if (props) {
          const charBefore = utils.getCharBefore(document, position);
          const charAfter = utils.getCharAfter(document, position);

          // se filtran los props por los que ya tiene el componente para no repetirlos
          const text = document.getText(utils.getTagRangeAtPosition(document, position));

          return props
            .filter(prop => !text.includes(`${prop.name}="`))
            .map(prop => createPropCompletionItem(prop, charBefore, charAfter));
        }
      } catch (err) {
        console.error(err);
      }
    },
  },
  ':',
  ' ',
  '.'
);

const eventsCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        if (
          !utils.isCursorInsideEntryTagComponent() ||
          utils.isPositionInQuotationMarks(position)
        ) {
          return;
        }
        const events = await utils.getEventsForLine(position.line, position.character);

        if (events) {
          const charBefore = utils.getCharBefore(document, position);
          const charAfter = utils.getCharAfter(document, position);

          // se filtran los props por los que ya tiene el componente para no repetirlos
          const text = document.getText(utils.getTagRangeAtPosition(document, position));

          return events
            .filter(
              event => !text.includes(`@${kebabCase(event)}="`) && !text.includes(`@${event}="`)
            )
            .map(event => createEventCompletionItem(event, charBefore, charAfter));
        }
      } catch (err) {
        console.error(err);
      }
    },
  },
  '@',
  ' ',
  '.'
);

const refsCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        const wordRange = document.getWordRangeAtPosition(position, /this\.\$refs\.[()\w]*/);
        if (!wordRange) {
          return;
        }
        /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
        const text = document.getText(wordRange);
        const range = new Range(
          wordRange.start.line,
          wordRange.start.character + Math.max(0, text.search(/(?<=this\.\$\w*\.)/)),
          wordRange.end.line,
          wordRange.end.character
        );
        /* Fin*/
        const refs = utils.getRefs(document);
        return refs.map(({ name, tag }) => {
          const obj = { name, kind: 'ref', params: tag, description: null, syntax: '${ref.name}' };
          return createThisCompletionItem(obj, range);
        });
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '.'
);

const thisCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        let wordRange = document.getWordRangeAtPosition(position, /this\.[$()\w]*/);
        if (
          !wordRange &&
          utils.isPositionInTemplateSection(position) &&
          utils.isPositionInQuotationMarks(position)
        ) {
          wordRange = document.getWordRangeAtPosition(position, /(?<=")[$()\w.]*(?=")/);
        }
        if (!wordRange) {
          return;
        }
        const array = [];
        /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
        const text = document.getText(wordRange);
        const range = new Range(
          wordRange.start.line,
          wordRange.start.character + Math.max(0, text.search(/(?<=this\.)/)),
          wordRange.end.line,
          wordRange.end.character
        );
        /* Fin*/
        if (!text.includes('$')) {
          const { data, computed, props, methods } = getVueObjects(document) || {};
          array.push(...(data?.map(x => createThisCompletionItem(x, range)) || []));
          array.push(...(computed?.map(x => createThisCompletionItem(x, range)) || []));
          array.push(...(props?.map(x => createThisCompletionItem(x, range)) || []));
          array.push(...(methods?.map(x => createThisCompletionItem(x, range)) || []));
        }
        array.push(...(getPlugins()?.map(x => createThisCompletionItem(x, range) || []) || []));
        array.push(...(getConstants()?.map(x => createThisCompletionItem(x, range) || []) || []));
        return array;
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '$',
  '.'
);

const pluginCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        let wordRange = document.getWordRangeAtPosition(position, /this\.\$\w*\.[()\w]*/);
        if (
          !wordRange &&
          utils.isPositionInTemplateSection(position) &&
          utils.isPositionInQuotationMarks(position)
        ) {
          wordRange = document.getWordRangeAtPosition(position, /\$\w*\.[()\w]*/);
        }
        if (!wordRange) {
          return;
        }
        /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
        const text = document.getText(wordRange);
        const range = new Range(
          wordRange.start.line,
          // wordRange.start.character + Math.max(0, text.search(/(?<=this\.\$\w*\.)/)),
          wordRange.start.character + Math.max(0, text.search(/(?<=\$\w*\.)/)),
          wordRange.end.line,
          wordRange.end.character
        );
        /* Fin*/
        const pluginName = document.getText(wordRange).split('.')?.at(-2) ?? '';
        const plugin = getPlugins().find(x => x.name === pluginName);
        return plugin?.objectAst?.properties
          ?.map(method => {
            const name = method.key?.name || '';
            const params =
              method.value?.params?.map(p => {
                let nombre, defaultValue;
                switch (p.type) {
                  case 'Identifier':
                    nombre = p.name;
                    defaultValue = null;
                    break;
                  case 'AssignmentPattern':
                    nombre = p.left?.name || '';
                    defaultValue = Object.assign({}, ...(p.right?.properties || []));
                }
                return { name: nombre, defaultValue };
              }) || [];
            const syntax = `${name}(${params.map(p => p.name)?.join(', ')})`;
            return { name, kind: 'method', params, description: null, syntax };
          })
          ?.map(x => createThisCompletionItem(x, range));
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '.'
);

const constantsCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        let wordRange = document.getWordRangeAtPosition(position, /this\.\$\w+\.\w*/);
        if (
          !wordRange &&
          utils.isPositionInTemplateSection(position) &&
          utils.isPositionInQuotationMarks(position)
        ) {
          wordRange = document.getWordRangeAtPosition(position, /\$\w+\.\w*/);
        }
        if (!wordRange) {
          return;
        }
        /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
        const text = document.getText(wordRange);
        const range = new Range(
          wordRange.start.line,
          wordRange.start.character + Math.max(0, text.search(/(?<=\$\w*\.)/)),
          wordRange.end.line,
          wordRange.end.character
        );
        /* Fin*/
        const repoName = document.getText(wordRange).split('.')?.at(-2) ?? '';
        const repo = getConstants().find(x => x.name === repoName);
        const kindObject = {
          ObjectExpression: 'object',
          ArrowFunctionExpression: 'method',
          Literal: 'constant',
          Identifier: 'constant',
        };
        return repo?.objectAst.properties?.map(prop => {
          const obj = {
            name: prop.key.name,
            kind: kindObject[prop.value.type] || 'constant',
            params: null,
            description:
              prop.value.type === 'Identifier'
                ? new RegExp(`export const ${prop.value.name} = '(.+?)';`).exec(
                    repo.objectText
                  )?.[1] || ''
                : prop.value?.value || '',
            syntax: prop.key.name,
          };
          return createThisCompletionItem(obj, range);
        });
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '.'
);

const objectCompletionItemProvider = languages.registerCompletionItemProvider(
  vueFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        let wordRange = document.getWordRangeAtPosition(position, /this\.\w+\.[()\w]*/);
        if (
          !wordRange &&
          utils.isPositionInTemplateSection(position) &&
          utils.isPositionInQuotationMarks(position)
        ) {
          wordRange = document.getWordRangeAtPosition(position, /^\$\w+\.[()\w]*/);
        }
        if (!wordRange) {
          return;
        }
        /* Ini Necesario para que los () lo tenga en cuenta a la hora de sustituir la cadena*/
        const text = document.getText(wordRange);
        const range = new Range(
          wordRange.start.line,
          wordRange.start.character + Math.max(0, text.search(/(?<=\w*\.)/)),
          wordRange.end.line,
          wordRange.end.character
        );
        /* Fin*/
        const objectName = document.getText(wordRange).split('.')?.at(-2) ?? '';
        const { data } = getVueObjects(document) || {};
        let object = data?.find(x => x.name === objectName && x.type === 'object');
        if (!object) {
          return;
        }
        return Object.entries(JSON.parse(object?.initialValue))
          .map(([key, value]) => ({ name: key, kind: 'object', origen: objectName, value: value }))
          .map(x => createThisCompletionItem(x, range));
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '.'
);

const cypressCompletionItemProvider = languages.registerCompletionItemProvider(
  cypressFilePattern,
  {
    async provideCompletionItems(document, position) {
      try {
        const regExpCyMethod = /(?<=\W)cy\.(?:\w+\([\w\W]*\)\n?.)*(\w*(?:\([\w\W]*\)(?:\n?.)?)?)/gi;
        const range = document.getWordRangeAtPosition(position, regExpCyMethod);
        if (!range) {
          return;
        }
        const endsWithCy = document.getText(range).endsWith('cy.');
        const cyActions = utils.getCyActions(endsWithCy);
        return cyActions?.map(cyAction => createCyCompletionItem(cyAction)) || [];
      } catch (err) {
        console.error(err);
      }
    },
  },
  ' ',
  '.'
);

export {
  componentsCompletionItemProvider,
  propsCompletionItemProvider,
  eventsCompletionItemProvider,
  refsCompletionItemProvider,
  thisCompletionItemProvider,
  pluginCompletionItemProvider,
  constantsCompletionItemProvider,
  objectCompletionItemProvider,
  cypressCompletionItemProvider,
};
