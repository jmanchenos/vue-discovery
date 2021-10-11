import { window, workspace, MarkdownString, Range } from 'vscode';
import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import { upperFirst, camelCase, kebabCase, toNumber } from 'lodash';
import { glob } from 'glob';
import path from 'path';
import config, { getConfig } from './config';
import { Parser } from './parser';
import * as vueParser from '@vuedoc/parser';
import fs from 'fs';
import * as merge from 'deepmerge';

/**
 * @typedef {import ('vscode').Position} Position;
 * @typedef {import ('vscode').TextDocument} TextDocument
 */

const REGEX = {
    tagName: /<([^\s></]+)/,
    cyActions: /(?<=Cypress.Commands.add\(')\w+(?='\s*,.*?(?:\((.*)\)|(\w+))\s*[\{|\=\>])/g,
    comments: / \/\*.*?\*\//gs, //la s final indica que el . incluye el caracter de nueva linea
    imports: /import.*?;/g,
    plugins: /vueLocal\.prototype[^\.]*?\.([\$\w]*?) = ({.*});/gs,
    pluginFiles: /.*index.js/,
};
const vueFiles = config.getVueFiles;
const vueRegisteredFiles = config.getVueRegisteredFiles;
const jsFiles = config.getJsFiles;
const cyFiles = config.getCyFiles;

const getEditor = () => window.activeTextEditor;
const getActiveEditorPosition = () => window.activeTextEditor.selection.active;
const getDocument = () => getEditor().document;
const getDocumentText = () => getDocument().getText();
const getIndentBase = () => {
    const editor = getEditor();
    return editor.options.insertSpaces ? ' '.repeat(toNumber(editor.options.tabSize)) : '\t';
};
const getIndent = () => getIndentBase().repeat(2);
const getRootPath = () => workspace.workspaceFolders[0].uri.path.slice(1);
const getCharBefore = (document = getDocument(), position = getActiveEditorPosition()) =>
    document.lineAt(position.line)?.text?.charAt(position.character - 1);
const getCharAfter = (document = getDocument(), position = getActiveEditorPosition()) =>
    document.lineAt(position.line)?.text?.charAt(position.character);

const findAliases = () => {
    try {
        const { compilerOptions } = require(`${getRootPath()}/jsconfig.json`);
        return compilerOptions.paths;
    } catch (err) {
        return [];
    }
};
/**
 * Devuelve cadena de fin de linea propio para el documento. si forRegExp es true devuelve string
 *  de expresion regular
 * @param {Boolean} forRegExp
 * @returns {String} return String
 */
const getEol = (forRegExp = false) =>
    getDocument()
        .eol.toString()
        .replace('1', forRegExp ? '\\n' : '\n')
        .replace('2', forRegExp ? '\\r|\\n' : '\r\n');

/** Recupera el rango completo (multilinea) que engloba a la posicion actual para el componente y cumple con el match del regExp pasado*/
const getAlternativeWordRangeAtPosition = (document, position, regExp) => {
    const text = document.getText();
    const matchList = text.match(regExp) || [];
    const matched = matchList.filter(x => {
        const posStart = document.positionAt(text.indexOf(x));
        const posEnd = document.positionAt(text.indexOf(x) + x.length);
        return posStart.isBeforeOrEqual(position) && posEnd.isAfterOrEqual(position);
    })?.[0];
    if (!matched) {
        return undefined;
    } else {
        const positionStart = document.positionAt(text.indexOf(matched));
        const positionEnd = document.positionAt(text.indexOf(matched) + matched.length);
        return new Range(positionStart, positionEnd);
    }
};

/**
 * @param {String} str  string attribute to convert to PascalCase
 * @returns {String}
 *  */
const pascalCase = str => {
    return upperFirst(camelCase(str));
};
const propCase = prop => {
    try {
        const casing = getConfig('propCase');
        return casing === 'kebab' ? kebabCase(prop) : camelCase(prop);
    } catch (error) {
        console.error(error);
    }
};
const componentCase = fileName => {
    try {
        const casing = getConfig('componentCase');
        return casing === 'kebab' ? kebabCase(fileName) : pascalCase(fileName);
    } catch (error) {
        console.error(error);
    }
};

const addTrailingComma = component => (!getConfig('addTrailingComma') ? component : `${component},`);

/**
 * @param {String} extension  extension of the file
 * @param {String} configAtrib  atribute of config that contains list of path on which search files
 * @returns {Promise<Array>} list of files
 *  */
const getFilesByExtension = async (extension, configAtrib = 'rootDirectory') => {
    const listaRoot = (getConfig(configAtrib)?.split(';') || []).filter(x => !!x);
    let fileList = [];
    const listaPromesas = listaRoot.map(
        element =>
            new Promise((resolve, reject) =>
                glob(`${getRootPath()}${element}/**/*.${extension}`, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                })
            )
    );

    await Promise.all(listaPromesas).then(result => result.forEach(x => fileList.push(...x)));
    return fileList;
};

/**
 * Recupera listado ficheros Javascript para test de Cypress
 * @returns {Promise<Array>}
 */
const getCyFiles = async () => {
    try {
        return getFilesByExtension('js', 'cypressTestsDirectory');
    } catch (err) {
        console.error(err);
    }
};
/**
 * Recupera listado acciones Cypress
 * @returns {Promise<Array>}
 */
const getCyActions = async () => {
    try {
        const actions = [];
        cyFiles().forEach(file => {
            const data = fs.readFileSync(file, 'utf8')?.matchAll(REGEX.cyActions);
            if (data) {
                actions.push(...data);
            }
        });
        return actions.map(x => {
            return { name: x[0], params: x[1]?.replace(/=|\s|'|"/g, '') };
        });
    } catch (error) {
        console.error(error);
    }
};

/**
 * Recupera listado plugins
 * @returns {Promise<Array>}
 */
const getPluginsList = async () => {
    try {
        let files = await getFilesByExtension('js', 'pluginsDirectory');
        files = files.filter(x => REGEX.pluginFiles.test(x));
        const plugins = [];

        files.forEach(async file => {
            let textFile = fs.readFileSync(file, 'utf8')?.replace(REGEX.comments, '').replace(REGEX.imports, '');
            const data = Array.from(textFile.matchAll(REGEX.plugins)).map(reg => {
                return { name: reg[1], kind: 'plugin', objectValue: Parser.parseObjectJS(reg[2]) };
            });
            plugins.push(...data);
        });
        return plugins;
    } catch (error) {
        console.error(error);
    }
};

/**
 * Retrieve the component name from a path
 * eg src/components/Table.vue returns Table
 * @param {String} file
 */
const retrieveComponentNameFromFile = file => {
    try {
        const parts = file.split('/');
        return parts[parts.length - 1].split('.')[0];
    } catch (err) {
        console.error(err);
    }
};

/**
 *  @param {String} name name of the component
 * @returns {boolean} return true if component is registered in Vue */
const isComponentRegistered = name =>
    vueRegisteredFiles()?.some(item => pascalCase(item.componentName) === pascalCase(name));

/**
 * Retrieve the component name with directory
 * eg src/components/Table.vue returns components/Table.vue
 * @param {String} file
 */
const retrieveWithDirectoryInformationFromFile = file => {
    try {
        const parts = file.split('/');
        return parts.slice(parts.length - 2, parts.length).join('/');
    } catch (err) {
        console.error(err);
    }
};

/**
 * Devuelve el nombre del tag del componente sobre el que esta posicionad el cursor
 * @returns {String}  nombre del tag del componente
 **/
const getComponentAtCursor = () => {
    try {
        const position = getActiveEditorPosition();
        if (!position) {
            return undefined;
        }
        const document = getDocument();
        const regExp = /<((\w|-)+)(?:[^<])+?(?:<\/\1>|\/>){1}/g;
        //filtramos todo lo que encontremos en ese regExp (tab abiertos y cerrados)
        let text = document.getText().substring(0, document.offsetAt(position));
        while (text !== text.replace(regExp, '')) {
            text = text.replace(regExp, '');
        }
        // recuperamos primer caracter < anterior y s tag asociado
        const arr = text.split('<');
        const arrText = arr?.[arr.length - 1];
        return arrText?.split(/\s|>/)?.[0] || '';
    } catch (error) {
        console.error(error);
    }
};

/** Return if position is over the template section of Vue file
 * @param {Position} position
 * @returns {Boolean} true if position is over
 */
const isPositionInTemplateSection = position => {
    try {
        const regexp = /(?<=<template>)(.|\n|\r)+(?=<\/template>)/g;

        const document = getDocument();
        const text = getDocumentText();
        const offset = document.offsetAt(position);
        let result;
        if ((result = regexp.exec(text)) !== null) {
            const posStart = result.index;
            const posEnd = regexp.lastIndex;
            return posStart <= offset && offset <= posEnd;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error);
    }
};

const getTagRangeAtPosition = (document, position, selector = `(\\w|-)*`) => {
    const eol = getEol(true);
    const stringRegExp = `<(${selector})(?:.|${eol})*?(?:<\\/\\1>|\\/>){1}`;
    const regExp = new RegExp(stringRegExp, 'g');
    // recuperamos todo el rango que incluye el componente completo aunque esté en varias líneas
    return getAlternativeWordRangeAtPosition(document, position, regExp);
};

const hasScriptTagInActiveTextEditor = () => {
    try {
        const text = window.activeTextEditor.document.getText();
        const scriptTagMatch = /<script/.exec(text);
        return scriptTagMatch && scriptTagMatch.index > -1;
    } catch (error) {
        console.error(error);
    }
};

/**
 * Find if the position of document passed by params is over a component tag
 * @param {TextDocument} document
 * @returns {boolean} true if position over a component tag
 */
const isPositionOverAComponentTag = (document, position) => {
    if (!isPositionInTemplateSection(position)) {
        return false;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w\.]*/g));
    return vueFiles()?.some(item => kebabCase(item.componentName) === kebabCase(word));
};

/**
 * @param {TextDocument} document
 * @returns {String} */
const getComponenteTagPositionIsOver = (document, position) => {
    if (!isPositionInTemplateSection(position)) {
        return undefined;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w\.]*/g));
    // retornamos el nombre del componente para asegurarno sde que o cojemos ne el modo correcto
    // (kebab -case o PascalCase)
    return vueFiles()?.find(item => kebabCase(item.componentName) === kebabCase(word))?.componentName;
};
/**
 * Find if the position is on the entry tag which name is passed by param
 * @param {String} selector name of the tag
 * @param {Position} position position on the document
 * @returns {boolean} true if position over the selected entry tag
 **/
const isPositionInEntryTag = (selector, position) => {
    const document = getDocument();
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
    const startPosition = document.positionAt(document.offsetAt(range.start) + start + `<${selector}`.length);
    const endPosition = document.positionAt(document.offsetAt(range.start) + end);
    return startPosition.isBefore(position) && endPosition.isAfterOrEqual(position);
};

const isCursorInsideEntryTagComponent = () => {
    const componentName = getComponentAtCursor();
    return componentName ? isPositionInEntryTag(componentName, getEditor().selection.active) : false;
};

const retrieveParsersMixin = (fileList, file, parsers) => {
    const { mixins } = new Parser(fs.readFileSync(file, 'utf8')).parse();
    if (mixins instanceof Array) {
        mixins.forEach(mixin => {
            const _file = fileList?.find(f => f.includes(mixin));
            if (_file) {
                parsers.push(vueParser.parse({ filename: _file, features: ['props'] }));
                retrieveParsersMixin(fileList, _file, parsers);
            }
        });
    }
};

/**
 * Recupera los propertes para la linea y caracter dado
 * @param {Number} line
 * @param {Number} character
 * @returns {Promise<Array>}
 */
const getPropsForLine = async (line, character = null) => {
    try {
        const component = getComponentNameForLine(line, character);
        if (component) {
            const file = vueFiles()?.find(item => item.componentName === component)?.filePath;
            if (file) {
                return await retrievePropsFromFile(file);
            }
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Retrieves the props from a file
 * @param {String} file
 * @returns {Promise<Array>} array of props
 */
const retrievePropsFromFile = async file => {
    const parsers = [];
    parsers.push(vueParser.parse({ filename: file, features: ['props'] }));
    retrieveParsersMixin(jsFiles(), file, parsers);
    return Promise.all(parsers)
        .then(merge.all)
        .then(result => result?.['props'] || [])
        .catch(error => console.error(error));
};

/**
 * Retrieves the required props from a fire
 * @param {String} file
 * @returns {Promise<Array>}
 */
const retrieveRequirePropsFromFile = async file => {
    try {
        const props = await retrievePropsFromFile(file);
        return props.filter(prop => prop.required).map(prop => prop.name);
    } catch (error) {
        console.error(error);
    }
};

/**
 * Retrieves the events from a file
 * @param {String} file
 */
const retrieveEventsFromFile = file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const { mixins, events } = new Parser(content).parse();
        let mixinEvents = [];
        if (mixins) {
            mixinEvents = mixins.reduce((accumulator, mixin) => {
                const _file = jsFiles()?.find(f => f.includes(mixin));
                return !_file ? accumulator : [...accumulator, ...retrieveEventsFromFile(_file)];
            }, []);
        }
        return [...mixinEvents, ...events];
    } catch (error) {
        console.error(error);
    }
};

/**
 * Recupera la lista de events para la linea y caracter de entrada
 * @param {Number} line
 * @param {Number} character
 * @returns {Promise<Array>}
 */
const getEventsForLine = async (line, character = null) => {
    try {
        const component = getComponentNameForLine(line, character);
        if (component) {
            const file = vueFiles()?.find(item => item.componentName === component)?.filePath;
            if (file) {
                return retrieveEventsFromFile(file);
            }
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Retrieves if component template includes slots
 * @param {String} file
 * @returns {Promise<Boolean>}
 */
const retrieveHasSlots = async file => {
    try {
        const options = { filename: file };
        await vueParser.parseOptions(options);
        const regexp = /<slot name="(\w|-)+".*(\/>|>.*<\/slot>)/;
        return regexp.test(options?.source?.template || '');
    } catch (error) {
        console.error(error);
    }
};

/**
 * Return info of a prop in markdown mode
 * @param {Object} prop
 * @returns {MarkdownString} value
 */
const markdownProp = (prop, isHover = false) => {
    try {
        const desc = prop.description || '';
        // Controlamos si type tiene mas de un tipo y auqe puede ser un array
        const type = prop.type instanceof Array ? `[${prop.type}]` : prop.type;
        let text = `${prop.name}:
    {
      type: ${type},
      required: ${prop.required},
      default: ${prop.default},
    }`.replace(/.*: undefined,\n/g, '');
        if (isHover) {
            text = text.replace(/\s{2,}/g, ' ').replace(/\n/g, '');
        }
        if (isHover) {
            return new MarkdownString('', true).appendCodeblock(text, 'javascript');
        } else {
            return new MarkdownString('', true).appendText(desc).appendCodeblock(text, 'javascript');
        }
    } catch (error) {
        console.error(error);
    }
};

const fetchWithTimeout = (url, options = {}, ms = 3000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, ms);
    return fetch(url, {
        signal: controller.signal,
        ...options,
    })
        .then(response => response)
        .catch(err => console.log(`${err.name === 'Abort' ? 'Timeout error' : err.message}`))
        .finally(() => {
            clearTimeout(timeout);
        });
};

const getMarkdownData = obj => {
    const { type, initialValue } = obj;
    let text = initialValue;
    if (type === 'object') {
        try {
            text =
                Object.entries(JSON.parse(initialValue)).reduce(
                    (prev, x) => prev + '\r\n' + x[0] + ': ' + x[1]['value'],
                    '{'
                ) + '}';
        } catch (err) {}
    }
    return new MarkdownString('`valor inicial', true).appendCodeblock(`${type} : ${text} `, 'javascript');
};

const getMarkdownComputed = obj => {
    return new MarkdownString('', true).appendCodeblock(`type: ${obj.type}`, 'javascript');
};

const getMarkdownProps = obj => {
    const { name, required, type, default: def } = obj;
    return new MarkdownString('', true).appendCodeblock(
        ` ${name}: {
        \t type: ${type},
        \t required: ${required}${def ? ',\r\n\t default: ' + def + '\r\n}' : '\r\n}'}
    `,
        'javascript'
    );
};

const getMarkdownMethods = obj => {
    const { description, syntax } = obj;
    return new MarkdownString(`${description ? description + '\r\n' : ''}`, true).appendCodeblock(syntax, 'javascript');
};

const getMarkdownPlugins = obj => {
    const { objectValue } = obj;
    const text = Object.keys(objectValue).reduce((prev, key) => `${prev}\r\n${key}`, '');
    return new MarkdownString('', true).appendText(text);
};

const getMarkdownObject = obj => {
    let text = obj.value?.raw ?? '';
    if (obj?.value?.type !== 'ArrowFunctionExpression') {
        text = `Valor inicial \r\n ${text}`;
    }
    return text;
};

const getAlias = fileWithoutRootPath => {
    try {
        const aliases = findAliases();
        const aliasKey = Object.keys(aliases)?.find(key =>
            fileWithoutRootPath.startsWith(aliases[key][0].replace('*', ''))
        );
        return aliasKey ? { value: aliasKey.replace('*', ''), path: aliases[aliasKey][0].replace('*', '') } : null;
    } catch (error) {
        console.error(error);
    }
};

const getRelativePath = fileWithoutRootPath => {
    try {
        const openFileWithoutRootPath = getDocument().uri.fsPath.replace(`${getRootPath()}/`, '');
        const importPath = path.relative(path.dirname(openFileWithoutRootPath), path.dirname(fileWithoutRootPath));
        let result = `./${importPath}`;
        if (importPath === '') {
            result = '.';
        } else if (importPath.startsWith('..')) {
            result = importPath;
        }
        return result;
    } catch (error) {
        console.error(error);
    }
};

const matchTagName = markup => {
    const match = markup.match(REGEX.tagName);
    //TODO modificar
    return match ? match[1] : false;
};

const getComponentNameForLine = (line, character = null) => {
    try {
        let component = false;
        let lineToCheck = line;
        do {
            let lineContent = getDocument().lineAt(lineToCheck)?.text;
            if (lineToCheck === line && character) {
                lineContent = lineContent.substring(0, character);
            }
            component = matchTagName(lineContent);
            if (lineContent.includes('>') && lineContent.includes('<') && line !== lineToCheck) {
                return false;
            }
            if ((lineContent.includes('>') || lineContent.includes('</')) && component === false) {
                return false;
            }
            lineToCheck--;
        } while (component === false);
        return componentCase(component.toString());
    } catch (error) {
        console.error(error);
    }
};

/**
 * Find if the position is in a word between quotation marks
 * @param {Position} position
 * @returns {Boolean} true if the position is in quotation marks
 */
const isPositionInQuotationMarks = position => {
    const document = getDocument();
    const range = document.getWordRangeAtPosition(position, /"[^=<>]*"/);
    return range ? position.isAfter(range.start) && position.isBefore(range.end) : false;
};

/**
 * Retrieves the name of the component
 * @param {String} file
 * @returns {Promise<String>} component name
 */
const retrieveComponentName = async file => {
    try {
        const vuedocOptions = { filename: file, features: ['name'] };
        const { name } = await vueParser.parse(vuedocOptions);
        if (!name) {
            return '';
        } else {
            const casing = getConfig('componentCase');
            return casing === 'pascal' ? pascalCase(name) : kebabCase(name);
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Provides tuple object with fileName and component name
 * @param {string} filePath
 * @returns {Promise<Object>}  object with 2 properties: fileName and componentName
 */
const getComponentTuple = async filePath => {
    const componentName = await retrieveComponentName(filePath);
    return { filePath, componentName };
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
    fetchWithTimeout,
    getFilesByExtension,
    getCyFiles,
    getPluginsList,
    getComponentTuple,
};
