const utils = require('./utils');
const { getConfig, getVueFiles, getPlugins } = require('./config');
const { Parser } = require('./parser');
const { Range, SnippetString, languages, CompletionItem, CompletionItemKind, workspace } = require('vscode');
const vueParser = require('@vuedoc/parser');
const { kebabCase, camelCase } = require('lodash');
const patternObject = { scheme: 'file', pattern: '**/src/**/*.vue' };

/**
 * Creates a completion item for a components from a tuple {filePath, componentName}
 * @param {Object} item
 */
function createComponentCompletionItem(item) {
    try {
        const fileName = utils.retrieveComponentNameFromFile(item?.filePath);

        const componentName = item.componentName || fileName;
        const snippetCompletion = new CompletionItem(componentName, CompletionItemKind.Constructor);

        snippetCompletion.detail = utils.retrieveWithDirectoryInformationFromFile(item?.filePath);
        snippetCompletion.command = {
            title: 'Import file',
            command: 'VueDiscoveryMTM.importFile',
            arguments: [item?.filePath, fileName],
        };

        // We don't want to insert anything here since this will be done in the importFile command
        snippetCompletion.insertText = '';

        return snippetCompletion;
    } catch (error) {
        console.error(error);
    }
}

/**
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
                workspace.getConfiguration().get('editor.snippetSuggestions') === 'top' ? 'Snippet' : 'Property';
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
        console.error(error);
    }
}

/**
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
        console.error(error);
    }
}

/**
 * @param {Object} obj
 * @param {Range|Null} range
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
                insert: x => `${x.name}(${x.params.map(reg => reg.name).join(',')})`,
                sortText: '\u0000',
            },
            plugin: {
                item: 'Field',
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
        };
        // Establecemos valores por defecto
        const { label, item, markdown, insert, sortText, filterText, commitCharacters } = objConfig[kind];
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
        console.error(error);
    }
}

function getInsertObject(obj) {
    if (obj.value?.type === 'ArrowFunctionExpression') {
        const params = obj.value?.raw?.match(/\(?([\w\,\s]*)\)?\s?=>/)?.[1] ?? [];
        return `${obj.name}(${params.trim()})`;
    } else {
        return obj.name;
    }
}

/**
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
        (params?.trim()?.split(',') || []).forEach((value, index) => {
            if (value) {
                text.appendText(`${index > 0 ? ', ' : ''}`).appendPlaceholder(value);
            }
        });
        text.appendText(');');
        snippetCompletion.insertText = text;
        snippetCompletion.detail = 'Vue Discovery MTM';
        return snippetCompletion;
    } catch (error) {
        console.error(error);
    }
}
const componentsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems() {
            const position = utils.getActiveEditorPosition();
            if (
                utils.isPositionInTemplateSection(position) &&
                !utils.isCursorInsideEntryTagComponent() &&
                !utils.isPositionInQuotationMarks(position)
            ) {
                return getVueFiles()?.map(createComponentCompletionItem);
            }
        },
    },
    ' ',
    '<'
);

const thisCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            const wordRange = document.getWordRangeAtPosition(position, /this\.\$*[\(\)\w]*/);
            if (!wordRange) {
                return;
            }
            const array = [];
            /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
            const text = document.getText(wordRange);
            const range = new Range(
                wordRange.start.line,
                wordRange.start.character + text.search(/(?<=this\.)/),
                wordRange.end.line,
                wordRange.end.character
            );
            /* Fin*/
            if (!text.includes('$')) {
                const vuedocOptions = { filename: document.fileName };
                const { data, computed, props, methods } = await vueParser.parse(vuedocOptions);
                array.push(...(data?.map(x => createThisCompletionItem(x, range)) || []));
                array.push(...(computed?.map(x => createThisCompletionItem(x, range)) || []));
                array.push(...(props?.map(x => createThisCompletionItem(x, range)) || []));
                array.push(...(methods?.map(x => createThisCompletionItem(x, range)) || []));
            }
            array.push(...getPlugins()?.map(x => createThisCompletionItem(x, range) || []));
            return array;
        },
    },
    ' ',
    '.',
    '$'
);
const pluginCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            const wordRange = document.getWordRangeAtPosition(position, /this\.\$\w*\.[\(\)\w]*/);
            if (!wordRange) {
                return;
            }
            /* Ini Necesario para que el $ lo tenga en cuenta a la hora de sustituir la cadena*/
            const text = document.getText(wordRange);
            const range = new Range(
                wordRange.start.line,
                wordRange.start.character + text.search(/(?<=this\.\$\w*\.)/),
                wordRange.end.line,
                wordRange.end.character
            );
            /* Fin*/
            const pluginName = document.getText(wordRange).split('.')?.[1] ?? '';
            const plugin = getPlugins().find(x => x.name === pluginName);
            return Object.entries(plugin.objectValue)
                .map(([key, value]) => {
                    const params = Parser.getParameterNames(value);
                    const syntax = `${key}(${params.join(',')})`;
                    return {
                        name: key,
                        kind: 'method',
                        params: params.map(x => ({ name: x })),
                        description: null,
                        syntax,
                    };
                })
                .map(x => createThisCompletionItem(x, range));
        },
    },
    ' ',
    '.'
);

const objectCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            const wordRange = document.getWordRangeAtPosition(position, /this\.\w*\.[\(\)\w]*/);
            if (!wordRange) {
                return;
            }
            /* Ini Necesario para que los () lo tenga en cuenta a la hora de sustituir la cadena*/
            const text = document.getText(wordRange);
            const range = new Range(
                wordRange.start.line,
                wordRange.start.character + text.search(/(?<=this\.\w*\.)/),
                wordRange.end.line,
                wordRange.end.character
            );
            /* Fin*/
            const objectName = document.getText(wordRange).split('.')?.[1] ?? '';
            const vuedocOptions = { filename: document.fileName };
            const { data } = await vueParser.parse(vuedocOptions);

            let object = data.find(x => x.name === objectName && x.type === 'object');

            return Object.entries(JSON.parse(object.initialValue))
                .map(([key, value]) => {
                    return { name: key, kind: 'object', origen: objectName, value: value };
                })
                .map(x => createThisCompletionItem(x, range));
        },
    },
    ' ',
    '.'
);

const propsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            if (!utils.isCursorInsideEntryTagComponent() || utils.isPositionInQuotationMarks(position)) {
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
        },
    },
    ':',
    ' ',
    '.'
);

const eventsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            if (!utils.isCursorInsideEntryTagComponent() || utils.isPositionInQuotationMarks(position)) {
                return;
            }

            const events = await utils.getEventsForLine(position.line, position.character);

            if (events) {
                const charBefore = utils.getCharBefore(document, position);
                const charAfter = utils.getCharAfter(document, position);

                // se filtran los props por los que ya tiene el componente para no repetirlos
                const text = document.getText(utils.getTagRangeAtPosition(document, position));

                return events
                    .filter(event => !text.includes(`@${kebabCase(event)}="`) && !text.includes(`@${event}="`))
                    .map(event => createEventCompletionItem(event, charBefore, charAfter));
            }
        },
    },
    '@',
    ' ',
    '.'
);

const cypressCompletionItemProvider = languages.registerCompletionItemProvider(
    { scheme: 'file', pattern: '**/tests/**/*.js' },
    {
        async provideCompletionItems(document, position) {
            const regExpCyMethod = /(?<=\W)cy\.\w*(?:\(.*?\))?/gi;
            const range = document.getWordRangeAtPosition(position, regExpCyMethod);
            if (!range) {
                return;
            }
            const cyActions = await utils.getCyActions();
            return cyActions.map(cyAction => createCyCompletionItem(cyAction));
        },
    },
    ' ',
    '.'
);
module.exports = {
    componentsCompletionItemProvider,
    propsCompletionItemProvider,
    eventsCompletionItemProvider,
    thisCompletionItemProvider,
    cypressCompletionItemProvider,
    pluginCompletionItemProvider,
    objectCompletionItemProvider,
};
