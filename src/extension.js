import vscode, { MarkdownString } from 'vscode';
import glob from 'glob';
import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import * as vueParser from '@vuedoc/parser';
import merge from 'deepmerge';
// @ts-ignore
import { toNumber, kebabCase, camelCase, upperFirst } from 'lodash';

const {
    CompletionItemKind,
    CompletionItem,
    SnippetString,
    window,
    workspace,
    Location,
    Uri,
    Position,
    languages,
    commands,
} = vscode;
const configOverride = {};
const outputChannel = window.createOutputChannel('Vue Discovery - MTM');
const patternObject = { scheme: 'file', pattern: '**/src/**/*.vue' };

let jsFiles = [];
let vueFiles = [];
let vueRegisteredFiles = [];

/**
 * @param {String} str  string attribute to convert to PascalCase
 * @returns {String}
 *  */
function pascalCase(str) {
    return upperFirst(camelCase(str));
}
/**
 * @param {String} extension  extension of the file
 * @param {String} configAtrib  atribute of config that contains list of path on which search files
 * @returns {Promise<Array>} list of files
 *  */
async function getFilesByExtension(extension, configAtrib = 'rootDirectory') {
    const listaRoot = (config(configAtrib)?.split(';') || []).filter(x => !!x);
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
}

/**
 * Recupera objet con lista de ficheros vue registrdos y sin registrar
 * @returns {Promise<Object>}
 */
async function getVueFiles() {
    try {
        const rootFiles = await getFilesByExtension('vue');
        const registeredFiles = await getFilesByExtension('vue', 'registeredDirectory');
        const setVueFiles = new Set([...rootFiles, ...registeredFiles]);
        return { vueFiles: [...setVueFiles], vueRegisteredFiles: registeredFiles };
    } catch (err) {
        outputChannel.append(err);
    }
}

/**
 * Recupera listado ficheros Javascript
 * @returns {Promise<Array>}
 */
async function getJsFiles() {
    try {
        return getFilesByExtension('js');
    } catch (err) {
        outputChannel.append(err);
    }
}

function getEol() {
    return getDocument()
        .eol.toString()
        .replace('1', '\\n')
        .replace('2', '\\r|\\n');
}

/**
 * Retrieve the component name from a path
 * eg src/components/Table.vue returns Table
 * @param {String} file
 */
function retrieveComponentNameFromFile(file) {
    try {
        const parts = file.split('/');

        return parts[parts.length - 1].split('.')[0];
    } catch (err) {
        outputChannel.append(err);
    }
}

/**
 * Retrieve the component name with directory
 * eg src/components/Table.vue returns components/Table.vue
 * @param {String} file
 */
function retrieveWithDirectoryInformationFromFile(file) {
    try {
        const parts = file.split('/');

        return parts.slice(parts.length - 2, parts.length).join('/');
    } catch (err) {
        outputChannel.append(err);
    }
}

/**
 * Creates a completion item for a components from a tuple {filePath, componentName}
 * @param {Object} item
 */
function createComponentCompletionItem(item) {
    try {
        const fileName = retrieveComponentNameFromFile(item?.filePath);

        const componentName = item.componentName || fileName;
        const snippetCompletion = new CompletionItem(componentName, CompletionItemKind.Constructor);

        snippetCompletion.detail = retrieveWithDirectoryInformationFromFile(item?.filePath);
        snippetCompletion.command = {
            title: 'Import file',
            command: 'VueDiscoveryMTM.importFile',
            arguments: [item?.filePath, fileName],
        };

        // We don't want to insert anything here since this will be done in the importFile command
        snippetCompletion.insertText = '';

        return snippetCompletion;
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * @param {Object} prop
 * @param {String} charBefore
 * @param {String} charAfter
 * @returns {vscode.CompletionItem}
 */
function createPropCompletionItem(prop, charBefore, charAfter) {
    try {
        const propIconType = config('propIconType');
        const { name } = prop;
        const snippetCompletion = new CompletionItem(name, CompletionItemKind[`${propIconType}`]);
        const includeSpaceBefore = ![' ', ':'].includes(charBefore);
        const includeSpaceAfter = ![' '].includes(charAfter);
        snippetCompletion.insertText = new SnippetString(
            `${includeSpaceBefore ? ' ' : ''}${name}="$0"${includeSpaceAfter ? ' ' : ''}`
        );
        snippetCompletion.documentation = markdownProp(prop);
        snippetCompletion.detail = 'Vue Discovery MTM';

        return snippetCompletion;
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * @param {String} event
 * @param {String} charBefore
 * @param {String} charAfter
 * @returns {vscode.CompletionItem}
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
        return snippetCompletion;
    } catch (error) {
        outputChannel.append(error);
    }
}

function hasScriptTagInActiveTextEditor() {
    try {
        const text = window.activeTextEditor.document.getText();
        const scriptTagMatch = /<script/.exec(text);

        return scriptTagMatch && scriptTagMatch.index > -1;
    } catch (error) {
        outputChannel.append(error);
    }
}

function config(key) {
    try {
        return key in configOverride ? configOverride[key] : workspace.getConfiguration().get(`VueDiscoveryMTM.${key}`);
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Retrieves the name of the component
 * @param {String} file
 * @returns {Promise<String>} component name
 */
async function retrieveComponentName(file) {
    try {
        const vuedocOptions = { filename: file, features: ['name'] };
        const { name } = await vueParser.parse(vuedocOptions);
        if (!name) {
            return '';
        } else {
            const casing = config('componentCase');
            return casing === 'pascal' ? pascalCase(name) : kebabCase(name);
        }
    } catch (error) {
        outputChannel.append(error);
    }
}

function retrieveParsersMixin(file, parsers) {
    const { mixins } = new Parser(fs.readFileSync(file, 'utf8')).parse();
    if (mixins instanceof Array) {
        mixins.forEach(mixin => {
            const _file = jsFiles?.find(f => f.includes(mixin));
            if (_file) {
                parsers.push(vueParser.parse({ filename: _file, features: ['props'] }));
                retrieveParsersMixin(_file, parsers);
            }
        });
    }
}
/**
 * Retrieves the props from a file
 * @param {String} file
 * @returns {Promise<Array>} array of props
 */
async function newRetrievePropsFrom(file) {
    const parsers = [];
    parsers.push(vueParser.parse({ filename: file, features: ['props'] }));
    retrieveParsersMixin(file, parsers);
    return Promise.all(parsers)
        .then(merge.all)
        .then(result => result?.['props'] || [])
        .catch(error => outputChannel.append(error));
}

/**
 * Retrieves the events from a fire
 * @param {String} file
 */
function retrieveEventsFrom(file) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const { mixins, events } = new Parser(content).parse();

        let mixinEvents = [];

        if (mixins) {
            mixinEvents = mixins.reduce((accumulator, mixin) => {
                const _file = jsFiles?.find(f => f.includes(mixin));
                return !_file ? accumulator : [...accumulator, ...retrieveEventsFrom(_file)];
            }, []);
        }

        return [...mixinEvents, ...events];
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Retrieves if component template includes slots
 * @param {String} file
 * @returns {Promise<Boolean>}
 */
async function retrieveHasSlots(file) {
    try {
        const options = { filename: file };
        await vueParser.parseOptions(options);
        const regexp = /<slot name="(\w|-)+".*(\/>|>.*<\/slot>)/;
        return regexp.test(options?.source?.template || '');
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Retrieves the required props from a fire
 * @param {String} file
 * @returns {Promise<Array>}
 */
async function retrieveRequirePropsFromFile(file) {
    try {
        const props = await newRetrievePropsFrom(file);
        return props.filter(prop => prop.required).map(prop => prop.name);
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Retrieves range that includes the documentation of the component file
 * @param {String} file
 */
function retrieveRangeFromDocFile(file) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        let { start = 0, end = content.length } = Parser.startAtAndGetPositionOfStartAndEnd(
            content,
            'export default',
            '{',
            '}'
        );
        const offset = Math.max(content.indexOf('export default'), 0);
        start = start + offset;
        end = end + offset;
        const startLine = Math.max((content.substr(0, start).match(/\n/g) || []).length - 1, 0);
        const endLine = (content.substr(0, end).match(/\n/g) || []).length + 1;
        return new vscode.Range(startLine, 0, endLine, 0);
    } catch (error) {
        outputChannel.append(error);
    }
}
/**
 * Inserts the snippet for the component in the template section
 * @param {String} file
 * @param {String} fileName
 */
async function insertSnippet(file, fileName) {
    try {
        const requiredProps = await retrieveRequirePropsFromFile(file);
        const hasSlots = await retrieveHasSlots(file);
        const includeRef = config('includeRefAtribute');

        let tabStop = 1;
        const ref = includeRef ? ` ref="$${tabStop++}"` : '';

        const requiredPropsSnippetString = requiredProps.reduce((accumulator, prop) => {
            return `${accumulator} :${propCase(prop)}="$${tabStop++}"`;
        }, '');

        fileName = caseFileName(fileName);
        const openTagChar = getCharBefore() === '<' ? '' : '<';
        const closeTag = hasSlots ? `>$${tabStop}</${fileName}>` : '/>';

        const snippetString = `${openTagChar}${fileName}${ref}${requiredPropsSnippetString}${closeTag}`;

        getEditor().insertSnippet(new SnippetString(snippetString));
        outputChannel.appendLine(`insertado snippet en template:  ${snippetString}`);
    } catch (error) {
        outputChannel.append(error);
    }
}

function propCase(prop) {
    try {
        const casing = config('propCase');
        return casing === 'kebab' ? kebabCase(prop) : camelCase(prop);
    } catch (error) {
        outputChannel.append(error);
    }
}

function caseFileName(fileName) {
    try {
        const casing = config('componentCase');
        return casing === 'kebab' ? kebabCase(fileName) : pascalCase(fileName);
    } catch (error) {
        outputChannel.append(error);
    }
}

function getEditor() {
    return window.activeTextEditor;
}

function getDocument() {
    return getEditor().document;
}

function getDocumentText() {
    return getDocument().getText();
}

function getAlias(fileWithoutRootPath) {
    try {
        const aliases = findAliases();
        const aliasKey = Object.keys(aliases)?.find(key =>
            fileWithoutRootPath.startsWith(aliases[key][0].replace('*', ''))
        );

        let alias = null;

        if (aliasKey) {
            alias = { value: aliasKey.replace('*', ''), path: aliases[aliasKey][0].replace('*', '') };
        }

        return alias;
    } catch (error) {
        outputChannel.append(error);
    }
}

function getRelativePath(fileWithoutRootPath) {
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
        outputChannel.append(error);
    }
}

function getImportPath(file, fileName) {
    try {
        const fileWithoutRootPath = file.replace(`${getRootPath()}/`, '');
        const alias = getAlias(fileWithoutRootPath);

        return alias
            ? fileWithoutRootPath.replace(`${alias.path}`, alias.value)
            : `${getRelativePath(fileWithoutRootPath)}/${fileName}.vue`;
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Inserts the import in the scripts section
 * @param {String} file
 * @param {String} fileName
 */
async function insertImport(file, fileName) {
    try {
        const document = getDocument();
        const text = getDocumentText();
        const match = /<script/.exec(text);
        const importPath = getImportPath(file, fileName);
        const componentName = pascalCase((await retrieveComponentName(file)) || fileName);

        if (
            text.indexOf(`import ${componentName} from '${importPath}`) === -1 &&
            !isComponentRegistered(componentName)
        ) {
            const scriptTagPosition = document.positionAt(match.index);
            const insertPosition = new Position(scriptTagPosition.line + 1, 0);
            await getEditor().edit(edit => {
                edit.insert(insertPosition, `import ${componentName} from '${importPath}';\n`);
            });
            outputChannel.appendLine(`insertado import para ${componentName} desde ${importPath}`);
        }
    } catch (error) {
        outputChannel.append(error);
    }
}

function getIndentBase() {
    const editor = getEditor();

    return editor.options.insertSpaces ? ' '.repeat(toNumber(editor.options.tabSize)) : '\t';
}

function getIndent() {
    return getIndentBase().repeat(2);
}

/**
 * Inserts the component in a new components section
 * @param {String} text
 * @param {String} componentName
 */
async function insertComponents(text, componentName) {
    try {
        const match = /export[\s]*default[\s]*\{/.exec(text);

        if (!match || match.index === -1) {
            return;
        }

        const insertIndex = match.index + match[0].length;
        const propIndent = getIndentBase().repeat(1);
        const component = `\n${propIndent}components: {\n${getIndent()}${componentName}\n${propIndent}},`;

        await getEditor().edit(edit => {
            edit.insert(getDocument().positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        outputChannel.append(error);
    }
}

function componentCase(componentName) {
    return config('componentCase') === 'kebab'
        ? `'${kebabCase(componentName)}': ${pascalCase(componentName)}`
        : componentName;
}
/**
 * Inserts the component in an existing components section
 * @param {Object} match
 * @param {String} componentName
 */
async function insertInExistingComponents(match, componentName) {
    try {
        let matchInsertIndex = match[0].length;
        let found = false;

        while (!found) {
            matchInsertIndex--;

            if (/[\S]/.test(match[0].charAt(matchInsertIndex))) {
                found = true;
            }
        }

        let lastCharacter = match[0].charAt(matchInsertIndex);
        const insertIndex = match.index + matchInsertIndex + 1;

        if (lastCharacter === ',') {
            lastCharacter = '';
        } else {
            lastCharacter = ',';
        }

        const component = `${lastCharacter}\n${getIndent()}${componentName}`;

        await getEditor().edit(edit => {
            edit.insert(getDocument().positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        outputChannel.append(error);
    }
}
function addTrailingComma(component) {
    return !config('addTrailingComma') ? component : `${component},`;
}
/**
 * Checks whether to create a new components section or append to an existing one and appends it
 * @param {String} componentName
 * @returns {Promise<void>}
 */
async function insertComponent(componentName) {
    try {
        if (isComponentRegistered(componentName)) {
            return;
        }
        componentName = addTrailingComma(componentCase(componentName));
        const text = getDocumentText();

        // Component already registered
        if (text.indexOf(`\n${getIndent()}${componentName}`) !== -1) {
            return;
        }

        const match = /components( )*:( )*{[\s\S]*?(?=})/.exec(text);

        // Components not yet defined add section with component
        if (!match || match.index === -1) {
            return insertComponents(text, componentName);
        }

        // Add the component to components
        insertInExistingComponents(match, componentName);
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Find if the position is in a word between quotation marks
 * @param {vscode.Position} position
 * @returns {Boolean} true if the position is in quotation marks
 */
function isPositionInQuotationMarks(position) {
    const document = getDocument();
    const range = document.getWordRangeAtPosition(position, /"[^=<>]*"/);
    return range ? position.isAfter(range.start) && position.isBefore(range.end) : false;
}
/**
 * Find if the position is on the entry tag which name is passed by param
 * @param {String} selector name of the tag
 * @param {vscode.Position} position position on the document
 * @returns {boolean} true if position over the selected entry tag
 **/
function isPositionInEntryTag(selector, position) {
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
}

/**
 * Find if the position of document passed by params is over a component tag
 * @param {vscode.TextDocument} document
 * @returns {boolean} true if position over a component tag
 **/
function isPositionOverAComponentTag(document, position) {
    if (!isPositionInTemplateSection(position)) {
        return false;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w\.]*/g));

    return vueFiles?.some(item => kebabCase(item.componentName) === kebabCase(word));
}

/**
 * @param {vscode.TextDocument} document
 * @returns {String} */
function getComponenteTagPositionIsOver(document, position) {
    if (!isPositionInTemplateSection(position)) {
        return undefined;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w\.]*/g));
    // retornamos el nombre del componente para asegurarno sde que o cojemos ne el modo correcto
    // (kebab -case o PascalCase)
    return vueFiles?.find(item => kebabCase(item.componentName) === kebabCase(word))?.componentName;
}

function getActiveEditorPosition() {
    const editor = window.activeTextEditor;

    return editor.selection.active;
}

/** Return if position is over the template section of Vue file
 * @param {vscode.Position} position position
 * @returns {Boolean} true if position is over
 **/
function isPositionInTemplateSection(position) {
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
        outputChannel.append(error);
    }
}

function findAliases() {
    try {
        const { compilerOptions } = require(`${getRootPath()}/jsconfig.json`);

        return compilerOptions.paths;
    } catch (e) {
        return [];
    }
}

function getRootPath() {
    return workspace.workspaceFolders[0].uri.path.slice(1);
}

function matchTagName(markup) {
    const pattern = /<([^\s></]+)/;
    const match = markup.match(pattern);

    return match ? match[1] : false;
}

function getComponentNameForLine(line, character = null) {
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
        const casing = config('componentCase');
        return casing === 'kebab' ? kebabCase(component.toString()) : pascalCase(component.toString());
    } catch (error) {
        outputChannel.append(error);
    }
}
/**
 * Recupera la lista de events para la linea y caracter de entrada
 * @param {Number} line
 * @param {Number} character
 * @returns {Promise<Array>}
 */
async function getEventsForLine(line, character = null) {
    try {
        const component = getComponentNameForLine(line, character);

        if (component) {
            const file = vueFiles?.find(item => item.componentName === component)?.filePath;
            if (file) {
                return retrieveEventsFrom(file);
            }
        }
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Recupera los propertes para la linea y caracter dado
 * @param {Number} line
 * @param {Number} character
 * @returns {Promise<Array>}
 */
async function getPropsForLine(line, character = null) {
    try {
        const component = getComponentNameForLine(line, character);

        if (component) {
            const file = vueFiles?.find(item => item.componentName === component)?.filePath;
            if (file) {
                return await newRetrievePropsFrom(file);
            }
        }
    } catch (error) {
        outputChannel.append(error);
    }
}

/**
 * Devuelve el nombre del tag del componente sobre el que esta posicionad el cursor
 * @returns {String}  nombre del tag del componente
 **/
function getComponentAtCursor() {
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
        outputChannel.append(error);
    }
}

function isCursorInsideEntryTagComponent() {
    const componentName = getComponentAtCursor();
    return componentName ? isPositionInEntryTag(componentName, getEditor().selection.active) : false;
}

function getTagRangeAtPosition(document, position, selector = `(\\w|-)*`) {
    const eol = getEol();
    const stringRegExp = `<(${selector})(?:.|${eol})*?(?:<\\/\\1>|\\/>){1}`;
    const regExp = new RegExp(stringRegExp, 'g');
    // recuperamos todo el rango que incluye el componente completo aunque esté en varias líneas
    return getAlternativeWordRangeAtPosition(document, position, regExp);
}
/** Recupera el rango completo (multilinea) que engloba a la posicion actual para el componente y cumple con el match del regExp pasado*/
function getAlternativeWordRangeAtPosition(document, position, regExp) {
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
        return new vscode.Range(positionStart, positionEnd);
    }
}
/**
 * Return info of a prop in markdown mode
 * @param {Object} prop
 * @returns {MarkdownString} value
 */
function markdownProp(prop, isHover = false) {
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
        outputChannel.append(error);
    }
}

function hoverContentFromProps(props) {
    return props.map(x => markdownProp(x, true));
}

function getCharBefore(document = getDocument(), position = getActiveEditorPosition()) {
    return document.lineAt(position.line)?.text?.charAt(position.character - 1);
}
function getCharAfter(document = getDocument(), position = getActiveEditorPosition()) {
    return document.lineAt(position.line)?.text?.charAt(position.character);
}

/**
 *  @param {String} name name of the component
 * @returns {boolean} return true if component is registered in Vue */
function isComponentRegistered(name) {
    return vueRegisteredFiles?.some(item => pascalCase(item.componentName) === pascalCase(name));
}

/**
 * Provides tuple object with fileName and component name
 * @param {string} filePath
 * @returns {Promise<Object>}  object with 2 properties: fileName and componentName
 */
const getComponentTuple = async filePath => {
    const componentName = await retrieveComponentName(filePath);
    return { filePath, componentName };
};

const componentsHoverProvider = languages.registerHoverProvider(patternObject, {
    async provideHover(document, position) {
        if (isPositionInTemplateSection(position) && isPositionOverAComponentTag(document, position)) {
            const props = await getPropsForLine(position.line);
            if (props) {
                return { contents: hoverContentFromProps(props) };
            }
        }
    },
});

const componentsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems() {
            const position = getActiveEditorPosition();
            if (
                isPositionInTemplateSection(position) &&
                !isCursorInsideEntryTagComponent() &&
                !isPositionInQuotationMarks(position)
            ) {
                return vueFiles?.map(createComponentCompletionItem);
            }
        },
    },
    ' ',
    '<'
);

const eventsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            if (!isCursorInsideEntryTagComponent() || isPositionInQuotationMarks(position)) {
                return;
            }

            const events = await getEventsForLine(position.line, position.character);

            if (events) {
                const charBefore = getCharBefore(document, position);
                const charAfter = getCharAfter(document, position);

                // se filtran los props por los que ya tiene el componente para no repetirlos
                const text = document.getText(getTagRangeAtPosition(document, position));

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

const propsCompletionItemProvider = languages.registerCompletionItemProvider(
    patternObject,
    {
        async provideCompletionItems(document, position) {
            if (!isCursorInsideEntryTagComponent() || isPositionInQuotationMarks(position)) {
                return;
            }

            const props = await getPropsForLine(position.line, position.character);

            if (props) {
                const charBefore = getCharBefore(document, position);
                const charAfter = getCharAfter(document, position);

                // se filtran los props por los que ya tiene el componente para no repetirlos
                const text = document.getText(getTagRangeAtPosition(document, position));

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

const componentsDefinitionProvider = languages.registerDefinitionProvider(patternObject, {
    async provideDefinition(document, position) {
        if (!isPositionInTemplateSection(position) || !isPositionOverAComponentTag(document, position)) {
            return null;
        }
        const fileName = getComponenteTagPositionIsOver(document, position);
        const filepath = vueFiles?.find(item => item.componentName === fileName)?.filePath;

        return new Location(Uri.file(filepath), retrieveRangeFromDocFile(filepath));
    },
});

const importExisting = commands.registerCommand('VueDiscoveryMTM.importExisting', async () => {
    if (!hasScriptTagInActiveTextEditor()) {
        return window.showWarningMessage('Looks like there is no script tag in this file!');
    }

    const fileName = getComponentAtCursor();
    const file = vueFiles?.find(item => item.componentName === fileName)?.filePath;

    if (fileName && file) {
        const componentName = (await retrieveComponentName(file)) || fileName;
        await insertImport(file, componentName);
        await insertComponent(componentName);
    }
});

const importFile = commands.registerCommand('VueDiscoveryMTM.importFile', async (file, fileName) => {
    if (!hasScriptTagInActiveTextEditor()) {
        return window.showWarningMessage('Looks like there is no script tag in this file!');
    }

    await insertImport(file, fileName);
    const componentName = (await retrieveComponentName(file)) || fileName;
    await insertComponent(componentName);
    await insertSnippet(file, componentName);
});

const setConfigOption = commands.registerCommand('VueDiscoveryMTM.tests.setConfigOption', (key, value) => {
    configOverride[key] = value;
});

export async function activate(context) {
    try {
        outputChannel.clear();
        //Inicializamos lista componentes
        jsFiles = await getJsFiles();
        const data = await getVueFiles();

        await Promise.all(data.vueFiles.map(getComponentTuple)).then(result => {
            (vueFiles || []).push(...result);
        });

        await Promise.all(data.vueRegisteredFiles.map(getComponentTuple)).then(result => {
            (vueRegisteredFiles || []).push(...result);
        });

        context.subscriptions.push(
            componentsCompletionItemProvider,
            propsCompletionItemProvider,
            eventsCompletionItemProvider,
            componentsDefinitionProvider,
            componentsHoverProvider,
            importExisting,
            importFile,
            setConfigOption
        );

        outputChannel.appendLine('extensión activada');
    } catch (error) {
        outputChannel.append(error);
    }
}

export function deactivate() {
    outputChannel.appendLine('extensión desactivada');
    outputChannel.dispose();
}
