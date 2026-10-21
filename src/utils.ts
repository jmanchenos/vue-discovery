import { window, workspace, MarkdownString, Range, Uri } from 'vscode';
import { Position } from 'vscode';
import type { TextDocument, Uri as UriType } from 'vscode';
import { upperFirst, camelCase, kebabCase, toNumber } from 'lodash';
import fastGlob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import * as config from '@/config';
import { Parser } from '@/parser';
import * as vueParser from '@vuedoc/parser';
import { parseComponent } from 'vue-sfc-parser';
import { parseModule } from 'esprima-next';
import esquery from 'esquery';
import type {
    ComponentMember,
    CypressAction,
    EsprimaNode,
    OffsetRange,
    PathAlias,
    PluginEntry,
    TemplateRef,
    VueFileEntry,
} from '@/types';

const { getConfig } = config;

const REGEX = {
    tagName: /<([^\s></]+)/,
    comments: / \/\*.*?\*\//gs, //la s final indica que el . incluye el caracter de nueva linea
    imports: /import.*?;/g,
    plugins: /\.prototype[^.]*?\.([$\w]*?) = ({.*}|\w+);/gs,
    pluginFiles: /.*index|main.js/,
};

/** Fichero descubierto en el workspace: puede ser una ruta o un componente ya parseado. */
export type DiscoveredFile = string | VueFileEntry;

const vueFiles = config.getVueFiles;
const vueRegisteredFiles = config.getVueRegisteredFiles;
const jsFiles = config.getJsFiles;
const cyFiles = config.getCyFiles;

const getEditor = () => window.activeTextEditor;
const getActiveEditorPosition = (): Position => window.activeTextEditor?.selection.active ?? new Position(0, 0);
const getDocument = (): TextDocument | undefined => getEditor()?.document;
const getDocumentText = (): string | undefined => getDocument()?.getText();
const getIndentBase = (): string => {
    const editor = getEditor();
    return editor?.options.insertSpaces ? ' '.repeat(toNumber(editor.options.tabSize)) : '\t';
};
const getIndent = (): string => getIndentBase().repeat(2);
const getRootPath = (): string => config.getCurrentWorkspaceFolder()?.uri.path.slice(1) ?? '';
const getCharBefore = (document = getDocument(), position = getActiveEditorPosition()): string | undefined =>
    document?.lineAt(position.line)?.text?.charAt(position.character - 1);
const getCharAfter = (document = getDocument(), position = getActiveEditorPosition()): string | undefined =>
    document?.lineAt(position.line)?.text?.charAt(position.character);

/**
 * Localiza los alias de rutas declarados en el tsconfig.json / jsconfig.json del workspace.
 */
const findAliases = (): Record<string, string[]> => {
    const rootPath = getRootPath();
    if (!rootPath) {
        return {};
    }
    for (const configFile of ['tsconfig.json', 'jsconfig.json']) {
        try {
            const configPath = path.join(rootPath, configFile);
            if (!fs.existsSync(configPath)) {
                continue;
            }
            const { compilerOptions } = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
                compilerOptions?: { paths?: Record<string, string[]> };
            };
            if (compilerOptions?.paths) {
                return compilerOptions.paths;
            }
        } catch (err) {
            console.error(`Error en findAliases (${configFile}):`, err);
        }
    }
    return {};
};

/**
 * Devuelve cadena de fin de linea propio para el documento. si forRegExp es true devuelve string
 *  de expresion regular
 */
const getEol = (forRegExp = false): string =>
    (getDocument()?.eol ?? 1)
        .toString()
        .replace('1', forRegExp ? '\\n' : '\n')
        .replace('2', forRegExp ? '\\r|\\n' : '\r\n');

/**
 * Recupera el rango completo (multilinea) que engloba a la posicion actual para el componente
 * y cumple con el match del regExp pasado
 */
const getAlternativeWordRangeAtPosition = (
    document: TextDocument,
    position: Position,
    regExp: RegExp
): Range | undefined => {
    const text = document.getText();
    const posIndex = document.offsetAt(position);
    const match = [...text.matchAll(regExp)].find(match => {
        const start = match.index;
        const end = start + match[0].length;
        return start <= posIndex && posIndex <= end && start !== end;
    });

    // si no hay coincidencias, devolvemos undefined
    if (!match) {
        return undefined;
    }
    // si hay coincidencias, devolvemos el rango de la primera coincidencia
    const startRange = document.positionAt(match.index);
    const endRange = document.positionAt(match.index + match[0].length);
    return new Range(startRange, endRange);
};

/**
 * Convierte un nombre a PascalCase
 */
const pascalCase = (str: string): string => upperFirst(camelCase(str));

const propCase = (prop: string): string | undefined => {
    try {
        const casing = getConfig('propCase');
        return casing === 'kebab' ? kebabCase(prop) : camelCase(prop);
    } catch (error) {
        console.error('Error en propCase:', error);
        return undefined;
    }
};

const componentCase = (fileName: string): string | undefined => {
    try {
        const casing = getConfig('componentCase');
        return casing === 'kebab' ? kebabCase(fileName) : pascalCase(fileName);
    } catch (error) {
        console.error('Error en componentCase:', error);
        return undefined;
    }
};

const addTrailingComma = (component: string): string => (!getConfig('addTrailingComma') ? component : `${component},`);

/**
 * Recupera los ficheros con la extension indicada dentro de los directorios de configuracion.
 */
const getFilesByExtension = async (
    extension: string,
    configAtrib:
        | 'rootDirectory'
        | 'registeredDirectory'
        | 'cypressTestsDirectory'
        | 'pluginsDirectory'
        | 'utilsDirectory' = 'rootDirectory'
): Promise<DiscoveredFile[]> => {
    const listaRoot = (getConfig(configAtrib)?.split(';') ?? []).filter(x => !!x);

    const resultados = await Promise.all(
        listaRoot.map(async (element): Promise<DiscoveredFile[]> => {
            if (extension === 'vue' && element.endsWith('.js')) {
                const filePath = `${element.startsWith('/') ? getRootPath() : ''}${element}`;
                const textFile = fs.readFileSync(filePath, 'utf8');
                const ast = parseModule(textFile, { comment: true, tolerant: true, range: true });
                return esquery
                    .query(ast as unknown as EsprimaNode, 'VariableDeclarator[id.name=/_sfc_main.*/]')
                    .map(x => {
                        const varName = `_sfc_render${x.id?.name?.substring(9) ?? ''}`;
                        const varValue = x.init;
                        const dataSlots = esquery.query(
                            ast as unknown as EsprimaNode,
                            `FunctionDeclaration[id.name=${varName}]`
                        )[0];
                        const startIndex = dataSlots.range?.[0] ?? 0;
                        const endIndex = dataSlots.range?.[1] ?? 0;
                        const functionBodyString = textFile.substring(startIndex, endIndex);
                        const slotNames: string[] = [];
                        const regex = /renderSlot\(_ctx\.\$slots,\s*"([^"]*)"/g;
                        let match: RegExpExecArray | null;
                        while ((match = regex.exec(functionBodyString)) !== null) {
                            // El nombre del slot estará en el grupo de captura 1
                            slotNames.push(match[1]);
                        }
                        return {
                            filePath,
                            componentName: varValue?.properties?.[0]?.value?.value ?? '',
                            range: varValue?.range as OffsetRange,
                            slotNames,
                        } satisfies VueFileEntry;
                    });
            }
            const suffix = element.endsWith('/') ? '*' : '/**/*';
            const expression = `${element.startsWith('/') ? getRootPath() : ''}${element}${suffix}.${extension}`;
            return (await fastGlob(expression)) as DiscoveredFile[];
        })
    );

    return resultados.flat();
};

/**
 * Recupera listado ficheros Javascript para test de Cypress
 */
const getCyFiles = async (): Promise<string[]> => {
    try {
        return (await getFilesByExtension('js', 'cypressTestsDirectory')) as string[];
    } catch (err) {
        console.error('Error en getCyFiles:', err);
        return [];
    }
};

/**
 * Recupera listado acciones Cypress
 * @param noSubject si es true no incluye acciones que tienen subject
 */
const getCyActions = (noSubject = false): CypressAction[] => {
    try {
        type RawAction = [string, string[], string, OffsetRange];
        let actions: RawAction[] = [];
        cyFiles()
            .filter(file => file.includes('/support/'))
            .forEach(file => {
                try {
                    const textFile = fs.readFileSync(file, 'utf8');
                    const ast = parseModule(textFile, { comment: true, range: true, tolerant: true });
                    const data = esquery
                        .query(ast as unknown as EsprimaNode, 'CallExpression[callee.object.property.name="Commands"]')
                        .map(x => {
                            const args = (x['arguments'] ?? []) as EsprimaNode[];
                            const params = (args[args.length - 1]?.params ?? []).map(
                                ({ name, range }: EsprimaNode) =>
                                    name || textFile.substring(range?.[0] ?? 0, range?.[1] ?? 0)
                            );
                            return [args[0]?.value as string, params, file, x.range as OffsetRange] as RawAction;
                        });
                    if (data.length) {
                        actions.push(...data);
                    }
                } catch (error) {
                    console.error('Error en forEach de getCyActions:', error);
                }
            });
        if (noSubject) {
            actions = actions.filter(x => !x[1].includes('subject'));
        }
        // Eliminamos duplicados
        const uniqueActions = new Map<string, RawAction>();
        for (const action of actions) {
            uniqueActions.set(`${action[0]}|${action[1].join(',')}|${action[2]}`, action);
        }
        return [...uniqueActions.values()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(x => ({
                name: x[0],
                params: x[1].join(', '),
                file: x[2],
                range: x[3],
            }));
    } catch (error) {
        console.error('Error en getCyActios:', error);
        return [];
    }
};

/**
 * Recupera listado plugins
 */
const getPluginsList = async (): Promise<PluginEntry[]> => {
    try {
        const files = ((await getFilesByExtension('js', 'pluginsDirectory')) as string[]).filter(x =>
            REGEX.pluginFiles.test(x)
        );
        const plugins: PluginEntry[] = [];
        files.forEach(file => {
            const textFile = fs.readFileSync(file, 'utf8');
            const ast = parseModule(textFile, { comment: true, tolerant: true, range: true });
            const installBlockStatement = esquery.query(
                ast as unknown as EsprimaNode,
                'AssignmentExpression[left.property.name = "install"] BlockStatement,' +
                    '*[key.name="install"]>.value>BlockStatement'
            );
            if (installBlockStatement.length) {
                const batch = esquery.query(
                    installBlockStatement[0],
                    'AssignmentExpression[left.property.name = /\\$.+/]'
                );
                const data = batch.map(reg => {
                    const name = reg['left']?.property?.name;
                    const objectAst = reg['right'];
                    const objectText = textFile.slice(objectAst.start, objectAst.end);
                    const range = reg.range as OffsetRange;
                    return { name, kind: 'plugin', objectAst, objectText, file, range } satisfies PluginEntry;
                });
                plugins.push(...data);
            }
        });
        return plugins;
    } catch (error) {
        console.error('Error en getPluginsList:', error);
        return [];
    }
};

/**
 * Recupera la lista de objetos de librerias de constantes con datos de su AST y nombre
 */
const getUtilsList = (repos: EsprimaNode[], files: string[]): PluginEntry[] => {
    try {
        const resultado: PluginEntry[] = [];
        files.forEach(file => {
            const textFile = fs.readFileSync(file, 'utf8');
            const ast = parseModule(textFile, { comment: true, tolerant: true, range: true });
            //bucle sobre los repos
            repos.some(repo => {
                let salida = false;
                const name = repo['left']?.property?.name;
                const alias = repo['right']?.name;
                const data = esquery.query(ast as unknown as EsprimaNode, `*[id.name="${alias}"][init]`).map(x => ({
                    name,
                    kind: 'library' as const,
                    objectAst: x['init'],
                    objectText: textFile.slice(x['init'].start, x['init'].end),
                    file,
                    range: x.range as OffsetRange,
                }));
                if (data.length) {
                    resultado.push(data[0]);
                    salida = true;
                }
                return salida;
            });
        });
        return resultado;
    } catch (error) {
        console.error('Error en getUtilsList:', error);
        return [];
    }
};

/**
 * Recupera listado constantes
 */
const getConstantsList = async (): Promise<PluginEntry[]> => {
    try {
        let constantes: PluginEntry[] = [];
        const mainFile = path.join(config.getCurrentWorkspaceFolder()?.uri.fsPath ?? '', 'src/main.js');
        if (mainFile) {
            config.outputChannel.appendLine(`Se está utilizando como fichero main.js el fichero ${mainFile}`);
            const mainText = fs.readFileSync(mainFile, 'utf8');
            const ast = parseModule(mainText, { comment: true, tolerant: true, range: true });
            const repos = esquery.query(
                ast as unknown as EsprimaNode,
                'AssignmentExpression[operator="="][left.object.object.name="Vue"][left.object.property.name="prototype"]'
            );
            if (repos.length) {
                const utilsFiles = (await getFilesByExtension('js', 'utilsDirectory')) as string[];
                constantes = getUtilsList(repos, utilsFiles);
            }
        }
        return constantes;
    } catch (error) {
        console.error('Error en getConstantsList:', error);
        return [];
    }
};

/**
 * Retrieve the component name from a path
 * eg src/components/Table.vue returns Table
 */
const retrieveComponentNameFromFile = (filePath: string): string | undefined => {
    try {
        return filePath.split(/[/\\]/).at(-1)?.split('.')[0];
    } catch (err) {
        console.error('Error en retrieveComponentNameFromFile:', err);
        return undefined;
    }
};

/**
 *  @param name name of the component
 *  @returns true if component is registered in Vue
 */
const isComponentRegistered = (name: string): boolean =>
    vueRegisteredFiles()?.some(item => pascalCase(item?.componentName) === pascalCase(name));

/**
 * Retrieve the component name with directory
 * eg src/components/Table.vue returns components/Table.vue
 */
const retrieveWithDirectoryInformationFromFile = (file: string): string | undefined => {
    try {
        const parts = file.split('/');
        return parts.slice(parts.length - 2, parts.length).join('/');
    } catch (err) {
        console.error('Error en retrieveWithDirectoryInformationFromFile:', err);
        return undefined;
    }
};

/**
 * Devuelve el nombre del tag del componente sobre el que esta posicionado el cursor
 */
const getComponentAtCursor = (): string | undefined => {
    try {
        const position = getActiveEditorPosition();
        if (!position) {
            return undefined;
        }
        const document = getDocument();
        if (!document) {
            return undefined;
        }
        const regExp = /<((\w|-)+)(?:[^<])+?(?:<\/\1>|\/>)/g;
        //filtramos todo lo que encontremos en ese regExp (tab abiertos y cerrados)
        let text = document.getText().substring(0, document?.offsetAt(position));
        while (text !== text.replace(regExp, '')) {
            text = text.replace(regExp, '');
        }
        // recuperamos primer caracter < anterior y su tag asociado
        const arr = text.split('<');
        const arrText = arr?.[arr.length - 1];
        return arrText?.split(/\s|>/)?.[0] || '';
    } catch (error) {
        console.error('Error en getComponentAtCursor:', error);
        return undefined;
    }
};

/**
 * Return if position is over the template section of Vue file
 */
const isPositionInTemplateSection = (position: Position): boolean => {
    try {
        const regexp = /(?<=<template>)(.|\n|\r)+(?=<\/template>)/g;

        const document = getDocument();
        const text = getDocumentText() ?? '';
        const offset = document?.offsetAt(position) ?? 0;
        let result: RegExpExecArray | null;
        if ((result = regexp.exec(text)) !== null) {
            const posStart = result.index;
            const posEnd = regexp.lastIndex;
            return posStart <= offset && offset <= posEnd;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error en isPositionInTemplateSection:', error);
        return false;
    }
};

const getTagRangeAtPosition = (
    document: TextDocument,
    position: Position,
    selector = `(\\w|-)*`
): Range | undefined => {
    const eol = getEol(true);
    const stringRegExp = `<(${selector})(?:.|${eol})*?(?:<\\/\\1>|\\/>){1}`;
    const regExp = new RegExp(stringRegExp, 'g');
    // recuperamos todo el rango que incluye el componente completo aunque esté en varias líneas
    return getAlternativeWordRangeAtPosition(document, position, regExp);
};

const hasScriptTagInActiveTextEditor = (): boolean => {
    try {
        const text = window.activeTextEditor?.document.getText() ?? '';
        const scriptTagMatch = /<script/.exec(text);
        return !!scriptTagMatch && scriptTagMatch.index > -1;
    } catch (error) {
        console.error('Error en hasScriptTagInActiveTextEditor:', error);
        return false;
    }
};

/**
 * Find if the position of document passed by params is over a component tag
 */
const isPositionOverAComponentTag = (document: TextDocument, position: Position): boolean => {
    if (!isPositionInTemplateSection(position)) {
        return false;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w.]*/g));
    return vueFiles()?.some(item => kebabCase(item?.componentName) === kebabCase(word)) ?? false;
};

/**
 * Find the Cypress action over which the position of document passed by params is over
 */
const getCypressActionOverPosition = (document: TextDocument, position: Position): CypressAction | null => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\w+/g));
    const cypressActions = getCyActions();
    return cypressActions?.find(item => item.name === word) || null;
};

/**
 * Find the plugin name over which the position of document passed by params is over
 */
const getPluginOverPosition = (document: TextDocument, position: Position): PluginEntry | null => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\$\w+/g));
    const plugins = config.getPlugins();
    return plugins?.find(item => item.name === word) || null;
};

/**
 * Find the ref name over which the position of document passed by params is over
 */
const getRefOverPosition = (document: TextDocument, position: Position): TemplateRef | null => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\w+/g));
    const refs = getRefs(document);
    return refs?.find(item => item.name === word) || null;
};

/**
 * @returns el nombre del componente sobre el que esta el cursor
 */
const getComponenteTagPositionIsOver = (document: TextDocument, position: Position): string | undefined => {
    if (!isPositionInTemplateSection(position)) {
        return undefined;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w.]*/g));
    // retornamos el nombre del componente para asegurarnos de que cogemos en el modo correcto
    // (kebab-case o PascalCase)
    return vueFiles()?.find(item => kebabCase(item?.componentName) === kebabCase(word))?.componentName;
};

/**
 * Find if the position is on the entry tag which name is passed by param
 */
const isPositionInEntryTag = (selector: string, position: Position): boolean => {
    const document = getDocument();
    if (!document) {
        return false;
    }
    const range = getTagRangeAtPosition(document, position, selector);
    if (!range) {
        return false;
    }
    const text = document.getText(range);
    const start = text.indexOf(`<${selector}`);
    const end = text.indexOf(`>`, start);
    if (start === -1 || end === -1) {
        return false;
    }
    const startPosition = document.positionAt(document?.offsetAt(range.start) + start + `<${selector}`.length);
    const endPosition = document.positionAt(document?.offsetAt(range.start) + end);
    return startPosition.isBefore(position) && endPosition.isAfterOrEqual(position);
};

const isCursorInsideEntryTagComponent = (): boolean => {
    const componentName = getComponentAtCursor();
    return componentName ? isPositionInEntryTag(componentName, getActiveEditorPosition()) : false;
};

/**
 * Recupera los props de un componente y los de sus mixins.
 *
 * Se recorren primero los mixins (del mas profundo al mas superficial) y despues
 * los props propios del componente, de forma que el orden reflects la precedencia
 * de los mixins en Vue.
 */
const collectPropsFromFile = async (
    item: VueFileEntry,
    props: ComponentMember[],
    visited: Set<string>
): Promise<void> => {
    const content = getFileContent(item);
    if (!content || visited.has(item.filePath)) {
        return;
    }
    visited.add(item.filePath);

    try {
        const parser = new Parser(content);
        const { mixins } = parser.parse();

        // Primero los mixins
        for (const mixin of mixins ?? []) {
            const _file = jsFiles().find(f => f.includes(mixin) && f !== item.filePath);
            if (_file) {
                await collectPropsFromFile({ filePath: _file, componentName: '' }, props, visited);
            }
        }

        // Despues los props propios del componente
        for (const prop of parser.parseProps()) {
            props.push({
                name: prop.name,
                kind: 'prop',
                type: prop.type,
                required: prop.required,
                default: prop.default,
                description: prop.description,
            });
        }
    } catch (error) {
        console.error('Error en collectPropsFromFile:', error);
    }
};

/**
 * Recupera los props para la linea y caracter dado
 */
const getPropsForLine = async (line: number, character: number | null = null): Promise<ComponentMember[]> => {
    try {
        const component = getComponentNameForLine(line, character);
        if (component) {
            const item = vueFiles()?.find(item => kebabCase(item?.componentName ?? '') === kebabCase(component));
            if (item) {
                return await retrievePropsFromFile(item);
            }
        }
    } catch (error) {
        console.error('Error en getPropsForLine:', error);
    }
    return [];
};

/**
 * Retrieves the props from a file, including the ones inherited from its mixins.
 */
const retrievePropsFromFile = async (item: VueFileEntry): Promise<ComponentMember[]> => {
    const props: ComponentMember[] = [];
    try {
        await collectPropsFromFile(item, props, new Set<string>());
    } catch (error) {
        console.error('Error en retirvePropsFromFile:', error);
    }
    return props;
};

/**
 * Retrieves the required props from a file
 */
const retrieveRequirePropsFromFile = async (item: VueFileEntry): Promise<string[]> => {
    try {
        const props = await retrievePropsFromFile(item);
        return props.filter(prop => prop.required).map(prop => prop.name);
    } catch (error) {
        console.error('Error en retrieveRequirePropsFromFile:', error);
        return [];
    }
};

/**
 * Retrieves the events from a file
 */
const retrieveEventsFromFile = (file: string): string[] => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const { mixins, events } = new Parser(content).parse();
        let mixinEvents: string[] = [];
        if (mixins) {
            mixinEvents = mixins.reduce((accumulator: string[], mixin) => {
                const _file = jsFiles()?.find(f => f.includes(mixin));
                return !_file ? accumulator : [...accumulator, ...retrieveEventsFromFile(_file)];
            }, []);
        }
        return [...mixinEvents, ...events];
    } catch (error) {
        console.error('Error en retrieveEventsFromFile', error);
        return [];
    }
};

/**
 * Recupera la lista de events para la linea y caracter de entrada
 */
const getEventsForLine = async (line: number, character: number | null = null): Promise<string[]> => {
    try {
        const component = getComponentNameForLine(line, character);
        if (component) {
            const file = vueFiles()?.find(
                item => kebabCase(item?.componentName ?? '') === kebabCase(component)
            )?.filePath;
            if (file) {
                return retrieveEventsFromFile(file);
            }
        }
    } catch (error) {
        console.error('Error en geteventsForLine:', error);
    }
    return [];
};

/**
 * Retrieves if component template includes slots
 */
const retrieveHasSlots = async (item: VueFileEntry): Promise<boolean> => {
    try {
        if (item?.slotNames?.length) {
            return !!item.slotNames.length;
        } else {
            const content = getFileContent(item);
            if (!content) {
                return false;
            }
            const { slots = [] } = await vueParser.parse({ filecontent: content, features: ['slots'] });
            return !!slots.length;
        }
    } catch (error) {
        console.error('Error en retrieveHasSlots:', error);
        return false;
    }
};

/**
 *  Recupera el contenido del fichero
 */
const getFileContent = (item: VueFileEntry): string | undefined => {
    try {
        const fileContent = fs.readFileSync(item.filePath, 'utf8');
        return item.range ? fileContent.substring(item.range[0], item.range[1]) : fileContent;
    } catch (error) {
        console.error('Error en getFileContent:', error);
        return undefined;
    }
};

/**
 * Return info of a prop in markdown mode
 */
const markdownProp = (prop: ComponentMember, isHover = false): MarkdownString | undefined => {
    try {
        const desc = prop.description || '';
        // Controlamos si type tiene mas de un tipo y aunque puede ser un array
        const type = prop.type instanceof Array ? `[${prop.type.join(', ')}]` : prop.type;
        const required = prop.required ? '(required) ' : '';
        const text = `${required}${prop.name}: ${type}`;

        if (isHover) {
            // En el hover se muestra el resumen en texto plano (sin escapado de markdown)
            const markdown = new MarkdownString('', true);
            markdown.value = text;
            return markdown;
        }

        let details = text;
        if (prop.default !== undefined && prop.default !== null) {
            details += `\n    default: ${prop.default}`;
        }
        return new MarkdownString('', true).appendText(desc).appendCodeblock(details, 'javascript');
    } catch (error) {
        console.error('Error en markdownProp:', error);
        return undefined;
    }
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, ms = 3000): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, ms);
    try {
        return await fetch(url, {
            signal: controller.signal,
            ...options,
        });
    } catch (error) {
        throw new Error(String(error));
    } finally {
        clearTimeout(timeout);
    }
};

const getMarkdownData = (obj: ComponentMember): MarkdownString => {
    const { type, initialValue } = obj;
    let text = initialValue;
    if (type === 'object') {
        const initialObject = JSON.parse(initialValue ?? '{}') as Record<string, { value: string }>;
        text =
            Object.entries(initialObject).reduce((prev, x) => prev + '\r\n' + x[0] + ': ' + x[1]['value'], '{') + '}';
    }
    return new MarkdownString('`valor inicial', true).appendCodeblock(`${type} : ${text} `, 'javascript');
};

const getMarkdownComputed = (obj: ComponentMember): MarkdownString => {
    return new MarkdownString('', true).appendCodeblock(`type: ${obj.type}`, 'javascript');
};

const getMarkdownProps = (obj: ComponentMember): MarkdownString => {
    const { name, required, type, default: def } = obj;
    return new MarkdownString('', true).appendCodeblock(
        ` ${name}: {
        	 type: ${type},
        	 required: ${required}${def ? ',\r\n\t default: ' + def + '\r\n}' : '\r\n}'}
    `,
        'javascript'
    );
};

const getMarkdownMethods = (obj: ComponentMember): MarkdownString => {
    const { description, syntax } = obj;
    return new MarkdownString(`${description ? description + getEol() : ''}`, true)?.appendCodeblock(
        syntax?.[0] ?? '',
        'javascript'
    );
};

const getMarkdownPlugins = (obj: PluginEntry): MarkdownString => {
    const { objectAst } = obj;
    const keys = objectAst.properties?.map(prop => prop.key?.name).filter(Boolean) || [];
    const text = keys.join(getEol());
    return new MarkdownString('', true).appendText(text);
};

const getMarkdownConstants = (obj: PluginEntry): string => {
    const { name, description } = obj;
    return `nombre: ${name},\nvalor: ${description}`;
};

const getMarkdownObject = (obj: ComponentMember): string => {
    let text = obj.value?.raw ?? '';
    if (obj?.value?.type !== 'ArrowFunctionExpression') {
        text = `Valor inicial ${getEol()} ${text}`;
    }
    return text;
};

const getMarkdownRef = (obj: ComponentMember): string => {
    const { name, params } = obj;
    return `ref: ${name}, componente: ${params}`;
};

const getAlias = (fileWithoutRootPath: string): PathAlias | null => {
    try {
        const aliases = findAliases();
        const aliasKey = Object.keys(aliases)?.find(key =>
            fileWithoutRootPath.startsWith((aliases[key]?.[0] ?? '').replace('*', ''))
        );
        return aliasKey
            ? { value: aliasKey.replace('*', ''), path: (aliases[aliasKey]?.[0] ?? '').replace('*', '') }
            : null;
    } catch (error) {
        console.error('Error en getAlias:', error);
        return null;
    }
};

const getRelativePath = (fileWithoutRootPath: string): string | undefined => {
    try {
        const document = getDocument();
        if (!document) {
            return undefined;
        }
        const openFileWithoutRootPath = document.uri.fsPath.replace(`${getRootPath()}/`, '');
        const importPath = path.relative(path.dirname(openFileWithoutRootPath), path.dirname(fileWithoutRootPath));
        let result = `./${importPath}`;
        if (importPath === '') {
            result = '.';
        } else if (importPath.startsWith('..')) {
            result = importPath;
        }
        return result;
    } catch (error) {
        console.error('Error en getRelativePath:', error);
        return undefined;
    }
};

const getWorkspaceRootUri = (uri: UriType): UriType => workspace.getWorkspaceFolder(uri)!.uri;

const getRelativePathForUri = (uri: UriType): string => {
    return uri.path.replace(getWorkspaceRootUri(uri).path, '.');
};

/**
 * Devuelve los nombres de los atributos declarados en el texto de un tag.
 */
const getTagAttributeNames = (tagText: string): string[] =>
    [...tagText.matchAll(/[:\s]([a-zA-Z_][\w-]*)\s*=/g)].map(match => match[1]);

/**
 * Indica si el tag ya declara el atributo indicado.
 * La comparacion se hace en kebab-case para que `defaultValue` y `default-value`
 * se consideren el mismo atributo.
 */
const hasTagAttribute = (tagText: string, name: string): boolean =>
    getTagAttributeNames(tagText).some(attribute => kebabCase(attribute) === kebabCase(name));

const matchTagName = (markup: string): string | false => {
    const match = markup.match(REGEX.tagName);
    return match ? match[1] : false;
};

const getComponentNameForLine = (line: number, character: number | null = null): string | undefined => {
    try {
        let component: string | false = false;
        let lineToCheck = line;
        const document = getDocument();
        if (!document) {
            return undefined;
        }
        do {
            let lineContent = document.lineAt(lineToCheck)?.text;
            if (lineToCheck === line && character) {
                lineContent = lineContent.substring(0, character);
            }
            component = matchTagName(lineContent);
            if (lineContent.includes('>') && lineContent.includes('<') && line !== lineToCheck) {
                return undefined;
            }
            if ((lineContent.includes('>') || lineContent.includes('</')) && component === false) {
                return undefined;
            }
            lineToCheck--;
        } while (component === false);
        return componentCase(component.toString());
    } catch (error) {
        console.error('Error en getComponentNameForLine:', error);
        return undefined;
    }
};

/**
 * Find if the position is in a word between quotation marks
 */
const isPositionInQuotationMarks = (position: Position): boolean => {
    const document = getDocument();
    if (!document) {
        return false;
    }
    const range = document.getWordRangeAtPosition(position, /"[^=<>]*"/);
    return range ? position.isAfter(range.start) && position.isBefore(range.end) : false;
};

/**
 * Retrieves the name of the component
 */
const retrieveComponentName = async (file: DiscoveredFile): Promise<string> => {
    try {
        let name: string | undefined;
        if (typeof file === 'string') {
            const vuedocOptions = { filename: file, features: ['name'] };
            try {
                const parsedComponent = await vueParser.parse(vuedocOptions);
                name = parsedComponent?.name;
            } catch (error) {
                console.error('Error vueParser.parse de retrieveComponentName:', error);
            }
        } else {
            name = file.componentName;
        }
        return name ?? '';
    } catch (error) {
        console.error('Error en retrieveComponentName:', error);
        return '';
    }
};

/**
 * Provides tuple object with fileName and component name
 */
const getComponentTuple = async (fileEntry: DiscoveredFile): Promise<VueFileEntry> => {
    let name = '';
    try {
        name = await retrieveComponentName(fileEntry);
    } catch (error) {
        console.error('Error en getComponentTuple:', error);
    }
    if (typeof fileEntry === 'string') {
        return {
            filePath: fileEntry,
            componentName: name || (retrieveComponentNameFromFile(fileEntry) ?? ''),
        };
    } else {
        return { ...fileEntry, componentName: name || fileEntry.componentName };
    }
};

/**
 * Traduce un rango del AST a un objeto Range de VSCode
 */
const translateRange = async (range: OffsetRange, filePath: string): Promise<Range | null> => {
    try {
        // recuperar objeto Document de vscode a partir del filepath del archivo
        const document = await workspace.openTextDocument(Uri.file(filePath));
        return document ? new Range(document.positionAt(range[0]), document.positionAt(range[1])) : null;
    } catch (err) {
        console.error('Error en translateRange:', err);
        return null;
    }
};

/**
 * Get the list of refs with ref attribute value and range of element containing that ref attribute
 */
const getRefs = (document: TextDocument): TemplateRef[] => {
    const text = document.getText();
    let template: { content: string; start: number } | null = null;
    try {
        template = parseComponent(text).template;
    } catch (error) {
        console.error('Error en getRefs:', error);
        return [];
    }

    if (!template) {
        return []; // Devuelve un array vacío si no hay template
    }

    const refs: TemplateRef[] = [];
    const regex = /\bref\s*=\s*(["'])([^"']+)\1/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(template.content)) !== null) {
        const ref = match[2];
        // Offset absoluto del valor del ref dentro del documento completo
        const valueOffset = template.start + match.index + match[0].lastIndexOf(ref);
        // Nombre del elemento que contiene el atributo ref
        const tagStart = text.lastIndexOf('<', template.start + match.index);
        const tag = /^[\w.-]+/.exec(text.slice(tagStart + 1))?.[0] ?? '';
        refs.push({
            name: ref,
            range: document.getWordRangeAtPosition(document.positionAt(valueOffset)),
            tag,
        });
    }

    return refs;
};

const findNodeModulesPath = (uri: UriType): string | null => {
    const rootPath = workspace.getWorkspaceFolder(uri)?.uri.fsPath;
    if (!rootPath) {
        return null;
    }
    const nodeModulesPath = path.join(rootPath, 'node_modules');
    return fs.existsSync(nodeModulesPath) ? nodeModulesPath : null;
};

const findTestUnitScriptPath = (uri: UriType): string | null => {
    const rootPath = getWorkspaceRootUri(uri).fsPath;
    const testUnitScriptPath = path.join(rootPath, getConfig('createTestFileLibrary') ?? '');
    return fs.existsSync(testUnitScriptPath) ? testUnitScriptPath : null;
};

export {
    getRootPath,
    getAlias,
    getRelativePath,
    getDocument,
    getDocumentText,
    pascalCase,
    retrieveComponentName,
    retrievePropsFromFile,
    markdownProp,
    isComponentRegistered,
    isCursorInsideEntryTagComponent,
    isPositionInQuotationMarks,
    getPropsForLine,
    getEventsForLine,
    getTagRangeAtPosition,
    getTagAttributeNames,
    hasTagAttribute,
    getCyActions,
    getEditor,
    getIndentBase,
    getIndent,
    addTrailingComma,
    getEol,
    retrieveComponentNameFromFile,
    retrieveWithDirectoryInformationFromFile,
    getMarkdownData,
    getMarkdownComputed,
    getMarkdownMethods,
    getMarkdownProps,
    getMarkdownPlugins,
    getMarkdownObject,
    getMarkdownRef,
    getMarkdownConstants,
    retrieveRequirePropsFromFile,
    retrieveHasSlots,
    propCase,
    componentCase,
    getCharBefore,
    getCharAfter,
    hasScriptTagInActiveTextEditor,
    getActiveEditorPosition,
    isPositionInTemplateSection,
    isPositionOverAComponentTag,
    getComponenteTagPositionIsOver,
    getCypressActionOverPosition,
    getPluginOverPosition,
    getRefOverPosition,
    fetchWithTimeout,
    getFilesByExtension,
    getCyFiles,
    getPluginsList,
    getConstantsList,
    getComponentTuple,
    translateRange,
    getRefs,
    findNodeModulesPath,
    findTestUnitScriptPath,
    getRelativePathForUri,
    getWorkspaceRootUri,
};
