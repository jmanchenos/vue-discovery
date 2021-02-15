const vscode = require('vscode');
const { CompletionItemKind, CompletionItem, SnippetString, window, workspace, Position, languages, commands } = vscode;

const glob = require('glob');
const fs = require('fs');
const path = require('path');
const Parser = require('./parser');
const vueParser = require('@vuese/parser');
const { toNumber, kebabCase, camelCase, upperFirst } = require('lodash');
const configOverride = {};
let jsFiles,
    vueFiles,
    vueRegisteredFiles = [];

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

async function getVueFiles() {
    const rootFiles = await getFilesByExtension('vue');
    const registeredFiles = await getFilesByExtension('vue', 'registeredDirectory');
    const setVueFiles = new Set([...rootFiles, ...registeredFiles]);
    return { vueFiles: [...setVueFiles], vueRegisteredFiles: registeredFiles };
}

async function getJsFiles() {
    return await getFilesByExtension('js');
}

/**
 * Retrieve the component name from a path
 * eg src/components/Table.vue returns Table
 * @param {String} file
 */
function retrieveComponentNameFromFile(file) {
    const parts = file.split('/');

    return parts[parts.length - 1].split('.')[0];
}

/**
 * Retrieve the component name with directory
 * eg src/components/Table.vue returns components/Table.vue
 * @param {String} file
 */
function retrieveWithDirectoryInformationFromFile(file) {
    const parts = file.split('/');

    return parts.slice(parts.length - 2, parts.length).join('/');
}

/**
 * Creates a completion item for a components from a tuple {filePath, componentName}
 * @param {Object} item
 */
function createComponentCompletionItem(item) {
    const fileName = retrieveComponentNameFromFile(item?.filePath);

    const componentName = item.componentName || fileName;
    const snippetCompletion = new CompletionItem(componentName, CompletionItemKind.Constructor);

    snippetCompletion.detail = retrieveWithDirectoryInformationFromFile(item?.filePath);
    snippetCompletion.command = {
        title: 'Import file',
        command: 'vueDiscoveryManchen.importFile',
        arguments: [item?.filePath, fileName],
    };

    // We don't want to insert anything here since this will be done in the importFile command
    snippetCompletion.insertText = '';

    return snippetCompletion;
}

/**
 * @param {String} prop
 * @param {boolean}  isBeforeSpace
 * @param {boolean} isAfterSpace
 * @returns {vscode.CompletionItem}
 */
function createPropCompletionItem(prop, isBeforeSpace, isAfterSpace) {
    const snippetCompletion = new CompletionItem(prop, CompletionItemKind.Property);

    snippetCompletion.insertText = new SnippetString(
        `${isBeforeSpace ? '' : ' '}${prop}="$0"${isAfterSpace ? '' : ' '}`
    );

    return snippetCompletion;
}

function createEventCompletionItem(event, isBeforeSpace, isAfterSpace) {
    const snippetCompletion = new CompletionItem(event, CompletionItemKind.Event);

    snippetCompletion.insertText = new SnippetString(
        `${isBeforeSpace ? '' : ' '}@${kebabCase(event)}="$0"${isAfterSpace ? '' : ' '}`
    );

    return snippetCompletion;
}

function hasScriptTagInActiveTextEditor() {
    const text = window.activeTextEditor.document.getText();
    const scriptTagMatch = /<script/.exec(text);

    return scriptTagMatch && scriptTagMatch.index > -1;
}

function config(key) {
    if (key in configOverride) {
        return configOverride[key];
    }

    return workspace.getConfiguration().get(`vueDiscoveryManchen.${key}`);
}

/**
 * Retrieves the name of the component
 * @param {String} file
 */
function retrieveComponentName(file) {
    const content = fs.readFileSync(file, 'utf8');
    const options = {
        onComputed: null,
        onDesc: null,
        onProp: null,
        onEvent: null,
        onMixin: null,
        onMethod: null,
        onData: null,
        onWatch: null,
    };
    const { name } = vueParser.parser(content, options);
    const casing = config('componentCase');
    if (!name) {
        return '';
    } else {
        return casing === 'pascal' ? pascalCase(name) : kebabCase(name);
    }
}

/**
 * Retrieves the props from a file
 * @param {String} file
 */
function retrievePropsFrom(file) {
    const content = fs.readFileSync(file, 'utf8');
    const { mixins, props } = new Parser(content).parse();
    let mixinProps = {};

    if (mixins) {
        mixinProps = mixins.reduce((accumulator, mixin) => {
            const file = jsFiles?.find(file => file.includes(mixin));

            if (!file) {
                return accumulator;
            }

            return { ...accumulator, ...retrievePropsFrom(file) };
        }, {});
    }

    return { ...mixinProps, ...props };
}

/**
 * Retrieves the events from a fire
 * @param {String} file
 */
function retrieveEventsFrom(file) {
    const content = fs.readFileSync(file, 'utf8');
    const { mixins, events } = new Parser(content).parse();

    let mixinEvents = [];

    if (mixins) {
        mixinEvents = mixins.reduce((accumulator, mixin) => {
            const file = jsFiles?.find(file => file.includes(mixin));

            if (!file) {
                return accumulator;
            }

            return [...accumulator, ...retrieveEventsFrom(file)];
        }, []);
    }

    return [...mixinEvents, ...events];
}

/**
 * Retrieves the required props from a fire
 * @param {String} file
 */
function retrieveRequirePropsFromFile(file) {
    const props = retrievePropsFrom(file);

    if (!props) {
        return;
    }

    return Object.keys(props).filter(prop => {
        return props[prop].required;
    });
}

/**
 * Inserts the snippet for the component in the template section
 * @param {String} file
 * @param {String} fileName
 */
function insertSnippet(file, fileName) {
    const requiredProps = retrieveRequirePropsFromFile(file);

    let tabStop = 1;

    const requiredPropsSnippetString = requiredProps.reduce((accumulator, prop) => {
        return (accumulator += ` :$${tabStop++}${propCase(prop)}="$${tabStop++}"`);
    }, '');

    fileName = caseFileName(fileName);

    const snippetString = `<${fileName}${requiredPropsSnippetString}>$0</${fileName}>`;

    getEditor().insertSnippet(new SnippetString(snippetString));
}

function propCase(prop) {
    const casing = config('propCase');
    return casing === 'kebab' ? kebabCase(prop) : camelCase(prop);
}

function caseFileName(fileName) {
    const casing = config('componentCase');
    return casing === 'kebab' ? kebabCase(fileName) : pascalCase(fileName);
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
    const aliases = findAliases();
    const aliasKey = Object.keys(aliases)?.find(alias =>
        fileWithoutRootPath.startsWith(aliases[alias][0].replace('*', ''))
    );

    let alias = null;

    if (aliasKey) {
        alias = { value: aliasKey.replace('*', ''), path: aliases[aliasKey][0].replace('*', '') };
    }

    return alias;
}

function getRelativePath(fileWithoutRootPath) {
    const openFileWithoutRootPath = getDocument().uri.fsPath.replace(getRootPath() + '/', '');

    const importPath = path.relative(path.dirname(openFileWithoutRootPath), path.dirname(fileWithoutRootPath));

    if (importPath === '') {
        return '.';
    }

    if (importPath.startsWith('..')) {
        return importPath;
    }

    return `./${importPath}`;
}

function getImportPath(file, fileName) {
    const fileWithoutRootPath = file.replace(getRootPath() + '/', '');
    const alias = getAlias(fileWithoutRootPath);

    if (alias) {
        return fileWithoutRootPath.replace(`${alias.path}`, alias.value);
    }

    return `${getRelativePath(fileWithoutRootPath)}/${fileName}.vue`;
}

/**
 * Inserts the import in the scripts section
 * @param {String} file
 * @param {String} fileName
 */
async function insertImport(file, fileName) {
    const document = getDocument();
    const text = getDocumentText();
    const match = /<script/.exec(text);
    const importPath = getImportPath(file, fileName);
    const componentName = retrieveComponentName(file) || fileName;

    if (text.indexOf(`import ${componentName} from '${importPath}`) === -1 && !isComponentRegistered(componentName)) {
        const scriptTagPosition = document.positionAt(match.index);
        const insertPosition = new Position(scriptTagPosition.line + 1, 0);
        await getEditor().edit(edit => {
            edit.insert(insertPosition, `import ${componentName} from '${importPath}'\n`);
        });
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
}

function componentCase(componentName) {
    if (config('componentCase') === 'kebab') {
        return `'${kebabCase(componentName)}': ${pascalCase(componentName)}`;
    }

    return componentName;
}
/**
 * Inserts the component in an existing components section
 * @param {Object} match
 * @param {String} componentName
 */
async function insertInExistingComponents(match, componentName) {
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
}
function addTrailingComma(component) {
    if (!config('addTrailingComma')) {
        return component;
    }

    return component + ',';
}
/**
 * Checks whether to create a new components section or append to an existing one and appends it
 * @param {String} componentName
 */
async function insertComponent(componentName) {
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
}

function isPositionInBetweenTag(selector, position) {
    const document = getDocument();
    const text = getDocumentText();
    const start = text.indexOf(`<${selector}>`);
    const end = text.indexOf(`</${selector}>`);

    if (start === -1 || end === -1) {
        return false;
    }

    const startLine = document.positionAt(start).line;
    const endLine = document.positionAt(end).line;

    return position.line > startLine && position.line < endLine;
}

/**
 * @param {vscode.TextDocument} document
 * @returns {boolean} */
function isPositionOverAComponentTag(document, position) {
    if (!isCursorInTemplateSection()) {
        return false;
    }
    const word = document.getText(document.getWordRangeAtPosition(position, /\w[-\w\.]*/g));

    return vueFiles?.some(item => kebabCase(item.componentName) === kebabCase(word));
}

function isCursorInBetweenTag(selector) {
    return isPositionInBetweenTag(selector, getEditor().selection.active);
}

function getActiveEditorPosition() {
    const editor = window.activeTextEditor;

    return editor.selection.active;
}

function isCursorInTemplateSection() {
    return isCursorInBetweenTag('template');
}

function findAliases() {
    try {
        const { compilerOptions } = require(getRootPath() + '/jsconfig.json');

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

    if (match) {
        return match[1];
    }

    return false;
}

function getComponentNameForLine(line, character = null) {
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
}

async function getEventsForLine(line, character = null) {
    const component = getComponentNameForLine(line, character);

    if (!component) {
        return;
    }

    const file = vueFiles?.find(item => item.componentName === component)?.filePath;

    if (!file) {
        return;
    }

    return retrieveEventsFrom(file);
}
async function getPropsForLine(line, character = null) {
    const component = getComponentNameForLine(line, character);

    if (!component) {
        return;
    }

    const file = vueFiles?.find(item => item.componentName === component)?.filePath;

    if (!file) {
        return;
    }

    return retrievePropsFrom(file);
}

function getComponentAtCursor() {
    const position = getActiveEditorPosition();

    if (!position) {
        return false;
    }

    return getComponentNameForLine(position.line);
}
function isCursorInsideComponent() {
    return getComponentAtCursor() !== false;
}

function hoverContentFromProps(props) {
    return Object.keys(props).map(propName => {
        const { required, type } = props[propName];
        const requiredText = required ? '(required) ' : '';
        const typeText = type ? `: ${type.name}` : '';
        return `${requiredText}${propName}${typeText}`;
    });
}

/**
 *  @param {String} name name of the component
 * @returns {boolean} return true if component is registered in Vue */
function isComponentRegistered(name) {
    return vueRegisteredFiles?.some(item => retrieveComponentName(item?.filePath) === name);
}

function activate(context) {
    /**
     * @param {vscode.DocumentSelector} selector A selector that defines the documents this provider is applicable to.
     * @param {vscode.HoverProvider} provider A hover provider
     * @returns {vscode.Disposable} A disposable that unregisters this provider when being disposed.
     */
    languages.registerHoverProvider(
        { pattern: '**/*.vue' },
        {
            async provideHover(document, position) {
                if (!isPositionInBetweenTag('template', position)) {
                    return;
                }
                if (!isPositionOverAComponentTag(document, position)) {
                    return;
                }
                const props = await getPropsForLine(position.line);
                if (!props) {
                    return;
                }
                return { contents: hoverContentFromProps(props) };
            },
        }
    );

    const componentsCompletionItemProvider = languages.registerCompletionItemProvider(
        { pattern: '**/*.vue' },
        {
            async provideCompletionItems() {
                if (!isCursorInTemplateSection() || isCursorInsideComponent()) {
                    return;
                }
                jsFiles = await getJsFiles();
                const data = await getVueFiles();
                vueFiles = data.vueFiles.map(getComponentTuple);
                vueRegisteredFiles = data.vueRegisteredFiles.map(getComponentTuple);
                return vueFiles?.map(createComponentCompletionItem);
            },
        }
    );

    /**
     * Provides tuple object with fileName and component name
     * @param {string} filePath
     * @returns {object}  object with 2 properties: fileName and componentName
     */
    const getComponentTuple = function(filePath) {
        const componentName = retrieveComponentName(filePath);
        return { filePath, componentName };
    };

    const eventsCompletionItemProvider = languages.registerCompletionItemProvider(
        { pattern: '**/*.vue' },
        {
            async provideCompletionItems(document, position) {
                if (!isCursorInsideComponent()) {
                    return;
                }

                const events = await getEventsForLine(position.line, position.character);

                if (!events) {
                    return;
                }

                const isBeforeSpace =
                    getDocument()
                        .lineAt(position.line)
                        ?.text?.charAt(position.character - 1) === ' ';
                const isAfterSpace =
                    getDocument()
                        .lineAt(position.line)
                        ?.text?.charAt(position.character) === ' ';

                return events.map(event => createEventCompletionItem(event, isBeforeSpace, isAfterSpace));
            },
        },
        '@'
    );

    const propsCompletionItemProvider = languages.registerCompletionItemProvider(
        { pattern: '**/*.vue' },
        {
            async provideCompletionItems(document, position) {
                if (!isCursorInsideComponent()) {
                    return;
                }

                const props = await getPropsForLine(position.line, position.character);

                if (!props) {
                    return;
                }

                const isBeforeSpace =
                    getDocument()
                        .lineAt(position.line)
                        ?.text?.charAt(position.character - 1) === ' ';
                const isAfterSpace =
                    getDocument()
                        .lineAt(position.line)
                        ?.text?.charAt(position.character) === ' ';

                return Object.keys(props).map(prop => createPropCompletionItem(prop, isBeforeSpace, isAfterSpace));
            },
        },
        ':'
    );

    const importExisting = commands.registerCommand('vueDiscoveryManchen.importExisting', async () => {
        if (!hasScriptTagInActiveTextEditor()) {
            return window.showWarningMessage('Looks like there is no script tag in this file!');
        }

        const fileName = getComponentAtCursor();
        const file = vueFiles?.find(item => item.componentName === fileName)?.filePath;

        if (!fileName || !file) {
            return;
        }

        const componentName = retrieveComponentName(file) || fileName;
        await insertImport(file, componentName);
        await insertComponent(componentName);
    });

    const importFile = commands.registerCommand('vueDiscoveryManchen.importFile', async (file, fileName) => {
        if (!hasScriptTagInActiveTextEditor()) {
            return window.showWarningMessage('Looks like there is no script tag in this file!');
        }

        await insertImport(file, fileName);
        const componentName = retrieveComponentName(file) || fileName;
        await insertComponent(componentName);
        await insertSnippet(file, componentName);
    });

    const setConfigOption = commands.registerCommand('vueDiscoveryManchen.tests.setConfigOption', (key, value) => {
        configOverride[key] = value;
    });
    context.subscriptions.push(
        componentsCompletionItemProvider,
        propsCompletionItemProvider,
        eventsCompletionItemProvider,
        importExisting,
        importFile,
        setConfigOption
    );
}

module.exports = {
    activate,
};
