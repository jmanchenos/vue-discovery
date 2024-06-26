import { window, workspace, MarkdownString, Range, Uri } from 'vscode';
import fetch from 'node-fetch';
import { AbortController } from 'abort-controller';
import { upperFirst, camelCase, kebabCase, toNumber } from 'lodash';
import { glob } from 'glob';
import path from 'path';
import * as config from './config.js';
import { Parser } from './parser.js';
// @ts-ignore
import * as vueParser from '@vuedoc/parser';
import * as vueCompiler from 'vue-template-compiler';
import fs from 'fs';
import { all } from 'deepmerge';
import { parseModule } from 'esprima-next';
import { query } from 'esquery';
import { outputChannel } from './config.js';

const { getConfig } = config;
/**
 * @typedef {import ('vscode').Position} Position;
 * @typedef {import ('vscode').TextDocument} TextDocument
 */

const REGEX = {
    tagName: /<([^\s></]+)/,
    comments: / \/\*.*?\*\//gs, //la s final indica que el . incluye el caracter de nueva linea
    imports: /import.*?;/g,
    plugins: /\.prototype[^.]*?\.([$\w]*?) = ({.*}|\w+);/gs,
    pluginFiles: /.*index|main.js/,
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
const getRootPath = () => config.getCurrentWorkspaceFolder().uri.path.slice(1);
const getCharBefore = (document = getDocument(), position = getActiveEditorPosition()) =>
    document.lineAt(position.line)?.text?.charAt(position.character - 1);
const getCharAfter = (document = getDocument(), position = getActiveEditorPosition()) =>
    document.lineAt(position.line)?.text?.charAt(position.character);

const findAliases = () => {
    try {
        const { compilerOptions } = require(`${getRootPath()}/jsconfig.json`);
        return compilerOptions.paths;
        // eslint-disable-next-line no-unused-vars
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
            new Promise((resolve, reject) => {
                try {
                    const suffix = element.endsWith('/') ? '*' : '/**/*';
                    glob(`${getRootPath()}${element}${suffix}.${extension}`)
                        .then(files => {
                            resolve(files);
                        })
                        .catch(err => {
                            reject(new Error(err));
                        });
                } catch (error) {
                    reject(new Error(error));
                }
            })
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
        return await getFilesByExtension('js', 'cypressTestsDirectory');
    } catch (err) {
        console.error(err);
    }
};
/**
 * Recupera listado acciones Cypress
 * @param {boolean} noSubject si es true no incluye acciones que tienen subject
 * @returns {Array}
 */
const getCyActions = (noSubject = false) => {
    try {
        let actions = [];
        cyFiles()
            .filter(file => file.includes('/support/'))
            .forEach(file => {
                try {
                    const textFile = fs.readFileSync(file, 'utf8');
                    const ast = parseModule(textFile, { comment: true, range: true, tolerant: true });
                    // @ts-ignore
                    const data = query(ast, 'CallExpression[callee.object.property.name="Commands"]').map(x => [
                        x['arguments'][0].value,
                        x['arguments'][x['arguments'].length - 1].params.map(
                            ({ name, range }) => name || textFile.substring(range[0], range[1])
                        ),
                        file,
                        x.range,
                    ]);
                    if (data.length) {
                        actions.push(...data);
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        if (noSubject) {
            actions = actions.filter(x => !x[1].includes('subject'));
        }
        return [...new Set(actions)]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(x => ({ name: x[0], params: x[1].join(', '), file: x[2], range: x[3] }));
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
        const files = (await getFilesByExtension('js', 'pluginsDirectory')).filter(x => REGEX.pluginFiles.test(x));
        const plugins = [];
        files.forEach(async file => {
            let textFile = fs.readFileSync(file, 'utf8');
            const ast = parseModule(textFile, { comment: true, tolerant: true, range: true });
            const installBlockStatement = query(
                // @ts-ignore
                ast,
                'AssignmentExpression[left.property.name = "install"] BlockStatement,' +
                    '*[key.name="install"]>.value>BlockStatement'
            );
            if (installBlockStatement) {
                const batch = query(installBlockStatement[0], 'AssignmentExpression[left.property.name = /\\$.+/]');
                const data = batch.map(reg => {
                    const name = reg['left'].property.name;
                    const objectAst = reg['right'];
                    const objectText = textFile.slice(objectAst.start, objectAst.end);
                    const range = reg.range;
                    return { name, kind: 'plugin', objectAst, objectText, file, range };
                });
                plugins.push(...data);
            }
        });
        return plugins;
    } catch (error) {
        console.error(error);
    }
};

/**
 * Recuperala lista de objetos de librerias de constantes con datos de su AST y nimbre
 * @param {Array} repos
 * @param {Array}  files
 * @returns {Array}
 */
const getUtilsList = (repos, files) => {
    try {
        let resultado = [];
        files.forEach(file => {
            const textFile = fs.readFileSync(file, 'utf8');
            const ast = parseModule(textFile, { comment: true, tolerant: true, range: true });
            //bucle sobre los repos
            repos.some(repo => {
                let salida = false;
                const name = repo['left'].property.name;
                const alias = repo['right'].name;
                // @ts-ignore
                const data = query(ast, `*[id.name="${alias}"][init]`).map(x => ({
                    name,
                    kind: 'library',
                    objectAst: x['init'],
                    objectText: textFile.slice(x['init'].start, x['init'].end),
                    file,
                    range: x.range,
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
        console.error(error);
    }
};

/**
 * Recupera listado constantes
 * @returns {Promise<Array>}
 */
const getConstantsList = async () => {
    try {
        let constantes = [];
        const mainFile = path.join(config.getCurrentWorkspaceFolder()?.uri.fsPath, 'src/main.js');
        if (mainFile) {
            config.outputChannel.appendLine(`Se está utilizando como fichero main.js el fichero ${mainFile}`);
            let mainText = fs.readFileSync(mainFile, 'utf8');
            const ast = parseModule(mainText, { comment: true, tolerant: true, range: true });
            const repos = query(
                // @ts-ignore
                ast,
                'AssignmentExpression[operator="="][left.object.object.name="Vue"][left.object.property.name="prototype"]'
            );
            if (repos) {
                const utilsFiles = await getFilesByExtension('js', 'utilsDirectory');
                constantes = getUtilsList(repos, utilsFiles);
            }
        }
        return constantes;
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
        const regExp = /<((\w|-)+)(?:[^<])+?(?:<\/\1>|\/>)/g;
        //filtramos toodo lo que encontremos en ese regExp (tab abiertos y cerrados)
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
    // recuperamos toodo el rango que incluye el componente completo aunque esté en varias líneas
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
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w.]*/g));
    return vueFiles()?.some(item => kebabCase(item.componentName) === kebabCase(word));
};
/**
 * Find the Cypress action over which the position of document passed by params is over
 * @param {TextDocument} document
 * @param {Position} position
 * @returns {Object} object with name, range and file of a cypress action
 */
const getCypressActionOverPosition = (document, position) => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\w+/g));
    const cypressActions = getCyActions();
    return cypressActions?.find(item => item.name === word) || null;
};

/**
 * Find the plugin name over which the position of document passed by params is over
 * @param {TextDocument} document
 * @param {Position} position
 * @returns {Object} object with name, range and file of a cypress action
 */
const getPluginOverPosition = (document, position) => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\$\w+/g));
    const plugins = config.getPlugins();
    return plugins?.find(item => item.name === word) || null;
};

/**
 * Find the ref name over which the position of document passed by params is over
 * @param {TextDocument} document
 * @param {Position} position
 * @returns {Object} object with name, and vscode range of a ref
 */
const getRefOverPosition = (document, position) => {
    const word = document.getText(document.getWordRangeAtPosition(position, /\w+/g));
    const refs = getRefs(document);
    return refs?.find(item => item.name === word) || null;
};

/**
 * @param {TextDocument} document
 * @returns {String} */
const getComponenteTagPositionIsOver = (document, position) => {
    if (!isPositionInTemplateSection(position)) {
        return undefined;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w.]*/g));
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
        .then(all)
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
        .catch(err => console.error(`${err.name === 'Abort' ? 'Timeout error' : err.message}`))
        .finally(() => {
            clearTimeout(timeout);
        });
};

const getMarkdownData = obj => {
    const { type, initialValue } = obj;
    let text = initialValue;
    if (type === 'object') {
        text =
            Object.entries(JSON.parse(initialValue)).reduce(
                (prev, x) => prev + '\r\n' + x[0] + ': ' + x[1]['value'],
                '{'
            ) + '}';
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
    return new MarkdownString(`${description ? description + getEol() : ''}`, true).appendCodeblock(
        syntax,
        'javascript'
    );
};

const getMarkdownPlugins = obj => {
    const { objectAst } = obj;
    const keys = objectAst.properties?.map(prop => prop.key.name) || [];
    const text = keys.join(getEol());
    return new MarkdownString('', true).appendText(text);
};

const getMarkdownConstants = obj => {
    const { name, description } = obj;
    return `nombre: ${name},\nvalor: ${description}`;
};

const getMarkdownObject = obj => {
    let text = obj.value?.raw ?? '';
    if (obj?.value?.type !== 'ArrowFunctionExpression') {
        text = `Valor inicial ${getEol()} ${text}`;
    }
    return text;
};

const getMarkdownRef = obj => {
    const { name, params } = obj;
    return `ref: ${name}, componente: ${params}`;
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
const getWorkspaceRootUri = uri => workspace.getWorkspaceFolder(uri).uri;

const getRelativePathForUri = uri => {
    return uri.path.replace(getWorkspaceRootUri(uri).path, '.');
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

/**translate a AST node range to a VSCode range object
 * @param {Array} range
 * @param {String} filePath
 * @returns {Promise<Range>}
 */
const translateRange = async (range, filePath) => {
    try {
        // recuperar objeto Document de vscode a partir del filepath del archivo
        const document = await workspace.openTextDocument(Uri.file(filePath));
        return document ? new Range(document.positionAt(range[0]), document.positionAt(range[1])) : null;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Get the list of refs with ref attribute value and range of element containing that ref attribute
 * @param {TextDocument} document
 * @returns {Array}
 */
const getRefs = document => {
    const text = document.getText();
    const ast = vueCompiler.compile(text).ast;
    //find elements in ast with attribute ref and get his value
    let refs = [];
    const traverseTemplate = ast => {
        ast.children?.forEach(child => {
            const ref = child.attrsMap?.ref;
            if (ref) {
                const range = document.getWordRangeAtPosition(document.positionAt(text.indexOf(`ref="${ref}"`)));
                refs.push({ name: ref, range, tag: child.tag });
            }
            traverseTemplate(child);
        });
    };
    traverseTemplate(ast);
    return refs;
};

const findNodeModulesPath = uri => {
    const rootPath = workspace.getWorkspaceFolder(uri).uri.fsPath;
    const nodeModulesPath = path.join(rootPath, 'node_modules');
    return fs.existsSync(nodeModulesPath) ? nodeModulesPath : null;
};

const findTestUnitScriptPath = uri => {
    const rootPath = getWorkspaceRootUri(uri).fsPath;
    const testUnitScriptPath = path.join(rootPath, getConfig('createTestFileLibrary'));
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
    // executeJSMethodInWorkspace,
};
