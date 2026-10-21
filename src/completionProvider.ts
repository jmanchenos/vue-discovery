import * as utils from '@/utils';
import { getConfig, getVueFiles, getPlugins, getConstants, getVueObjects } from '@/config';
import { Range, SnippetString, languages, CompletionItem, CompletionItemKind, workspace } from 'vscode';
import type { CompletionItemProvider, MarkdownString, TextDocument, Position } from 'vscode';
import { kebabCase, camelCase } from 'lodash';
import type { ComponentMember, MethodParam, PluginEntry } from '@/types';

/** Caracteres de control usados para ordenar las sugerencias de VSCode. */
const SORT_TEXT_FIRST = '\u0000';
const SORT_TEXT_SECOND = '\u0001';

/** Elimina los elementos indefinidos de un array. */
const compact = <T>(items: (T | undefined)[]): T[] => items.filter((item): item is T => item !== undefined);

const vueFilePattern = { scheme: 'file', pattern: '**/src/**/*.vue' };
const cypressFilePattern = { scheme: 'file', pattern: '**/tests/**/*.js' };

/**
 * @description Return insertion text for an object or function with its params
 */
function getInsertObject(obj: ComponentMember): string {
    try {
        if (obj.value?.type === 'ArrowFunctionExpression') {
            const params = obj.value?.raw?.match(/\(?([\w,\s]*)\)?\s?=>/)?.[1] ?? '';
            return `${obj.name}(${params.trim()})`;
        } else {
            return obj.name;
        }
    } catch (err) {
        console.error('Error en getInsertObject: ', err);
        return obj.name;
    }
}

/**
 * @description Creates a completion item for a component
 */
function createComponentCompletionItem(item: utils.DiscoveredFile): CompletionItem | undefined {
    try {
        const filePath = typeof item === 'string' ? item : item.filePath;
        const fileName = utils.retrieveComponentNameFromFile(filePath) ?? '';
        const rawName = (typeof item === 'string' ? undefined : item.componentName) || fileName;
        // El casing se aplica al mostrar el componente para que un cambio de
        // configuracion surta efecto sin tener que volver a descubrir los ficheros.
        const componentName = utils.componentCase(rawName) ?? rawName;
        const snippetCompletion = new CompletionItem(componentName, CompletionItemKind.Constructor);
        snippetCompletion.detail =
            typeof item !== 'string' && item.range
                ? componentName
                : utils.retrieveWithDirectoryInformationFromFile(filePath);
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
        return undefined;
    }
}

/**
 * @description Creates a completion item for a property
 */
function createPropCompletionItem(
    prop: ComponentMember,
    charBefore: string | undefined,
    charAfter: string | undefined
): CompletionItem | undefined {
    try {
        let propIconType = getConfig('propIconType');
        if (propIconType === 'Auto') {
            propIconType =
                workspace.getConfiguration().get('editor.snippetSuggestions') === 'top' ? 'Snippet' : 'Property';
        }
        const { name } = prop;
        const snippetCompletion = new CompletionItem(
            name,
            CompletionItemKind[propIconType as keyof typeof CompletionItemKind]
        );
        const includeSpaceBefore = ![' ', ':'].includes(charBefore ?? '');
        const includeSpaceAfter = ![' '].includes(charAfter ?? '');
        snippetCompletion.insertText = new SnippetString(
            `${includeSpaceBefore ? ' ' : ''}${name}="$0"${includeSpaceAfter ? ' ' : ''}`
        );
        snippetCompletion.documentation = utils.markdownProp(prop);
        snippetCompletion.detail = 'Vue Discovery MTM';
        snippetCompletion.sortText = `${SORT_TEXT_FIRST}0000${name}`;

        return snippetCompletion;
    } catch (error) {
        console.error('Error en createPropCompletionItem:', error);
        return undefined;
    }
}

/**
 * @description Creates a completion item for an event
 */
function createEventCompletionItem(
    event: string,
    charBefore: string | undefined,
    charAfter: string | undefined
): CompletionItem | undefined {
    try {
        const snippetCompletion = new CompletionItem(event, CompletionItemKind.Event);
        const includeSpaceBefore = ![' ', '@'].includes(charBefore ?? '');
        const includeSpaceAfter = ![' '].includes(charAfter ?? '');
        const hasArroba = charBefore === '@';
        snippetCompletion.insertText = new SnippetString(
            `${includeSpaceBefore ? ' ' : ''}${hasArroba ? '' : '@'}${kebabCase(event)}="$0"${
                includeSpaceAfter ? ' ' : ''
            }`
        );
        snippetCompletion.detail = 'Vue Discovery MTM';
        snippetCompletion.sortText = `${SORT_TEXT_SECOND}0001${event}`;
        return snippetCompletion;
    } catch (error) {
        console.error('Error en createEventCompletionItem:', error);
        return undefined;
    }
}

/** Configuracion de como se genera cada tipo de miembro del componente. */
interface ThisItemConfig {
    item: keyof typeof CompletionItemKind;
    label?: (obj: ComponentMember) => string;
    markdown?: (obj: ComponentMember) => string | MarkdownString | undefined;
    insert?: (obj: ComponentMember) => string;
    sortText?: string;
    filterText?: string;
    commitCharacters?: string[];
}

const thisItemConfigs: Record<string, ThisItemConfig> = {
    data: {
        item: 'Field',
        markdown: obj => utils.getMarkdownData(obj),
        insert: x => `${x.name}`,
        sortText: SORT_TEXT_FIRST,
    },
    computed: {
        item: 'Field',
        markdown: obj => utils.getMarkdownComputed(obj),
        insert: x => `${x.name}`,
        sortText: SORT_TEXT_FIRST,
    },
    prop: {
        item: 'Property',
        label: x => `${camelCase(x.name)} (${x.kind})`,
        markdown: obj => utils.getMarkdownProps(obj),
        insert: x => `${camelCase(x.name)}`,
        sortText: SORT_TEXT_FIRST,
    },
    method: {
        item: 'Method',
        markdown: obj => utils.getMarkdownMethods(obj),
        insert: x => `${x.name}(${x.params?.map(reg => reg.name).join(',') || ''})`,
        sortText: SORT_TEXT_FIRST,
    },
    plugin: {
        item: 'Field',
        markdown: obj => utils.getMarkdownPlugins(obj as unknown as PluginEntry),
        insert: x => `\\${x.name}`,
        sortText: SORT_TEXT_SECOND,
        commitCharacters: ['.'],
    },
    library: {
        item: 'Field',
        label: x => `${x.name}`,
        markdown: obj => utils.getMarkdownPlugins(obj as unknown as PluginEntry),
        insert: x => `\\${x.name}`,
        sortText: SORT_TEXT_SECOND,
        commitCharacters: ['.'],
    },
    object: {
        item: 'Field',
        label: x => `${x.name} (${x.origen})`,
        markdown: obj => utils.getMarkdownObject(obj),
        insert: x => getInsertObject(x),
        sortText: SORT_TEXT_FIRST,
    },
    ref: {
        item: 'Field',
        markdown: obj => utils.getMarkdownRef(obj),
        insert: x => `${x.name}`,
        sortText: SORT_TEXT_FIRST,
    },
    constant: {
        item: 'Property',
        markdown: obj => utils.getMarkdownConstants(obj as unknown as PluginEntry),
        insert: x => `${x.name}`,
        sortText: SORT_TEXT_FIRST,
    },
};

/**
 * @description Creates a completion item for a this attribute
 */
function createThisCompletionItem(obj: ComponentMember, range: Range | null = null): CompletionItem | undefined {
    try {
        const { name, kind } = obj;
        const objConfig = thisItemConfigs[kind];
        if (!objConfig) {
            return undefined;
        }
        const { label, item, markdown, insert, sortText, filterText, commitCharacters } = objConfig;
        // Establecemos valores por defecto
        const atribCompletion = new CompletionItem(label?.(obj) ?? `${name} (${kind})`, CompletionItemKind[item]);
        atribCompletion.insertText = new SnippetString(insert?.(obj) ?? name);
        atribCompletion.documentation = markdown?.(obj) ?? '';
        atribCompletion.detail = 'Vue Discovery MTM';
        atribCompletion.sortText = `${sortText ?? SORT_TEXT_FIRST}${name}`;
        atribCompletion.filterText = `${filterText ?? atribCompletion.label}()`;
        atribCompletion.commitCharacters = commitCharacters ?? [];
        if (range) {
            atribCompletion.range = { inserting: range, replacing: range };
        }
        return atribCompletion;
    } catch (error) {
        console.error('Error en createThisCompletionItem:', error);
        return undefined;
    }
}

/**
 * @description Creates a completion item for a Cypress action
 */
function createCyCompletionItem(cyAction: { name: string; params?: string }): CompletionItem | undefined {
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
        return undefined;
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
                    return compact(getVueFiles()?.map(createComponentCompletionItem) ?? []);
                }
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '<'
);

const propsCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
            try {
                if (!utils.isCursorInsideEntryTagComponent() || utils.isPositionInQuotationMarks(position)) {
                    return undefined;
                }
                const props = await utils.getPropsForLine(position.line, position.character);

                if (props.length) {
                    const charBefore = utils.getCharBefore(document, position);
                    const charAfter = utils.getCharAfter(document, position);

                    // se filtran los props por los que ya tiene el componente para no repetirlos
                    const tagRange = utils.getTagRangeAtPosition(document, position);
                    const text = tagRange ? document.getText(tagRange) : '';

                    return compact(
                        props
                            .filter(prop => !utils.hasTagAttribute(text, prop.name))
                            .map(prop => createPropCompletionItem(prop, charBefore, charAfter))
                    );
                }
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ':',
    ' ',
    '.'
);

const eventsCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
            try {
                if (!utils.isCursorInsideEntryTagComponent() || utils.isPositionInQuotationMarks(position)) {
                    return undefined;
                }
                const events = await utils.getEventsForLine(position.line, position.character);

                if (events.length) {
                    const charBefore = utils.getCharBefore(document, position);
                    const charAfter = utils.getCharAfter(document, position);

                    // se filtran los eventos por los que ya tiene el componente para no repetirlos
                    const tagRange = utils.getTagRangeAtPosition(document, position);
                    const text = tagRange ? document.getText(tagRange) : '';

                    return compact(
                        events
                            .filter(event => !utils.hasTagAttribute(text, kebabCase(event)))
                            .map(event => createEventCompletionItem(event, charBefore, charAfter))
                    );
                }
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    '@',
    ' ',
    '.'
);

const refsCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
            try {
                const wordRange = document.getWordRangeAtPosition(position, /this\.\$refs\.[()\w]*/);
                if (!wordRange) {
                    return undefined;
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
                return compact(
                    refs.map(({ name, tag }) => {
                        const obj: ComponentMember = {
                            name,
                            kind: 'ref',
                            params: [{ name: tag }],
                            description: undefined,
                            syntax: ['${ref.name}'],
                        };
                        return createThisCompletionItem(obj, range);
                    })
                );
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '.'
);

const thisCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
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
                    return undefined;
                }
                const array: (CompletionItem | undefined)[] = [];
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
                    const { data, computed, props, methods } = getVueObjects(document) ?? {
                        data: [],
                        computed: [],
                        props: [],
                        methods: [],
                    };
                    array.push(...(data?.map(x => createThisCompletionItem(x, range)) || []));
                    array.push(...(computed?.map(x => createThisCompletionItem(x, range)) || []));
                    array.push(...(props?.map(x => createThisCompletionItem(x, range)) || []));
                    array.push(...(methods?.map(x => createThisCompletionItem(x, range)) || []));
                }
                array.push(...(getPlugins()?.map(x => createThisCompletionItem(x, range)) || []));
                array.push(...(getConstants()?.map(x => createThisCompletionItem(x, range)) || []));
                return compact(array);
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '$',
    '.'
);

const pluginCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
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
                    return undefined;
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
                const pluginName = document.getText(wordRange).split('.')?.at(-2) ?? '';
                const plugin = getPlugins().find(x => x.name === pluginName);
                return compact(
                    plugin?.objectAst?.properties
                        ?.map(method => {
                            const name = method.key?.name || '';
                            const params: MethodParam[] =
                                method.value?.params?.map(
                                    (p: {
                                        type: string;
                                        name?: string;
                                        left?: { name?: string };
                                        right?: { properties?: unknown[] };
                                    }) => {
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
                                    }
                                ) || [];
                            const syntax = `${name}(${params.map(p => p.name)?.join(', ')})`;
                            return { name, kind: 'method', params, description: undefined, syntax: [syntax] };
                        })
                        ?.map(x => createThisCompletionItem(x, range)) ?? []
                );
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '.'
);

const constantsCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
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
                    return undefined;
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
                const kindObject: Record<string, string> = {
                    ObjectExpression: 'object',
                    ArrowFunctionExpression: 'method',
                    Literal: 'constant',
                    Identifier: 'constant',
                };
                return compact(
                    repo?.objectAst.properties?.map(prop => {
                        const obj: ComponentMember = {
                            name: prop.key?.name ?? '',
                            kind: kindObject[prop.value?.type] || 'constant',
                            params: [],
                            description:
                                prop.value?.type === 'Identifier'
                                    ? new RegExp(`export const ${prop.value.name} = '(.+?)';`).exec(
                                          repo.objectText
                                      )?.[1] || ''
                                    : prop.value?.value || '',
                            syntax: [prop.key?.name ?? ''],
                        };
                        return createThisCompletionItem(obj, range);
                    }) ?? []
                );
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '.'
);

const objectCompletionItemProvider = languages.registerCompletionItemProvider(
    vueFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
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
                    return undefined;
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
                const { data } = getVueObjects(document) ?? { data: [] };
                const object = data?.find(x => x.name === objectName && x.kind === 'object');
                if (!object) {
                    return undefined;
                }
                return compact(
                    Object.entries(JSON.parse(object?.initialValue ?? '{}'))
                        .map(([key, value]) => ({
                            name: key,
                            kind: 'object',
                            origen: objectName,
                            value: value as { raw?: string; type?: string },
                        }))
                        .map(x => createThisCompletionItem(x, range))
                );
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
    ' ',
    '.'
);

const cypressCompletionItemProvider = languages.registerCompletionItemProvider(
    cypressFilePattern,
    {
        async provideCompletionItems(document: TextDocument, position: Position) {
            try {
                const regExpCyMethod = /(?<=\W)cy\.(?:\w+\([\w\W]*\)\n?.)*(\w*(?:\([\w\W]*\)(?:\n?.)?)?)/gi;
                const range = document.getWordRangeAtPosition(position, regExpCyMethod);
                if (!range) {
                    return undefined;
                }
                const endsWithCy = document.getText(range).endsWith('cy.');
                const cyActions = utils.getCyActions(endsWithCy);
                return compact(cyActions?.map(cyAction => createCyCompletionItem(cyAction)) ?? []);
            } catch (err) {
                console.error(err);
            }
            return undefined;
        },
    } satisfies CompletionItemProvider,
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
