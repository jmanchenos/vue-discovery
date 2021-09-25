const utils = require('./utils');
const { getConfig, outputChannel, getVueFiles } = require('./config');
const { SnippetString, languages, CompletionItem, CompletionItemKind, workspace } = require('vscode');
const vueParser = require('@vuedoc/parser');
const { kebabCase } = require('lodash');
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
        outputChannel.appendLine(error);
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
        outputChannel.appendLine(error);
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
        outputChannel.appendLine(error);
    }
}

/**
 * @param {Object} obj
 * @returns {CompletionItem}
 */
function createThisCompletionItem(obj) {
    try {
        const { name, kind } = obj;
        const objConfig = {
            data: {
                item: 'Field',
                markdown: utils.getMarkdownData,
                insert: x => `${x.name}`,
            },
            computed: {
                item: 'Function',
                markdown: utils.getMarkdownComputed,
                insert: x => `${x.name}`,
            },
            prop: {
                item: 'Property',
                markdown: utils.getMarkdownProps,
                insert: x => `${x.name}`,
            },
            method: {
                item: 'Method',
                markdown: utils.getMarkdownMethods,
                insert: x => `${x.name}(${x.params.map(reg => reg.name).join(',')})`,
            },
        };

        const configData = objConfig[kind];
        const atribCompletion = new CompletionItem(`${name} (${kind})`, CompletionItemKind[`${configData['item']}`]);
        atribCompletion.insertText = new SnippetString(configData['insert'](obj));
        atribCompletion.documentation = configData['markdown'](obj);
        atribCompletion.detail = 'Vue Discovery MTM';
        atribCompletion.sortText = '\u00000000' + name;
        return atribCompletion;
    } catch (error) {
        outputChannel.appendLine(error);
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
        outputChannel.appendLine(error);
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
            const range = document.getWordRangeAtPosition(position, /this\.\w*/);
            if (!range) {
                return;
            }
            const vuedocOptions = { filename: document.fileName };
            const { data, computed, props, methods } = await vueParser.parse(vuedocOptions);
            const array = data?.map(x => createThisCompletionItem(x)) || [];
            array.push(...(computed?.map(x => createThisCompletionItem(x)) || []));
            array.push(...(props?.map(x => createThisCompletionItem(x)) || []));
            array.push(...(methods?.map(x => createThisCompletionItem(x)) || []));
            return array;
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
};
