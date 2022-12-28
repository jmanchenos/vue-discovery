import { commands, window, Position, SnippetString, ViewColumn } from 'vscode';
import * as utils from './utils';
import { outputChannel, getConfig, setConfig, getCurrentPanel, setCurrentPanel } from './config';

/**
 * @typedef {import ('vscode').ExtensionContext} ExtensionContext;
 * @typedef {import ('vscode').Disposable} Disposable
 */

function getImportPath(file, fileName) {
    try {
        const fileWithoutRootPath = file.replace(`${utils.getRootPath()}/`, '');
        const alias = utils.getAlias(fileWithoutRootPath);

        return alias
            ? fileWithoutRootPath.replace(`${alias.path}`, alias.value)
            : `${utils.getRelativePath(fileWithoutRootPath)}/${fileName}.vue`;
    } catch (error) {
        console.error(error);
    }
}
/**
 * Inserts the import in the scripts section
 * @param {String} file
 * @param {String} fileName
 */
async function insertImport(file, fileName) {
    try {
        const document = utils.getDocument();
        const text = utils.getDocumentText();
        const match = /<script/.exec(text);
        const importPath = getImportPath(file, fileName);
        const componentName = utils.pascalCase((await utils.retrieveComponentName(file)) || fileName);

        if (
            text.indexOf(`import ${componentName} from '${importPath}`) === -1 &&
            !utils.isComponentRegistered(componentName)
        ) {
            const scriptTagPosition = document.positionAt(match.index);
            const insertPosition = new Position(scriptTagPosition.line + 1, 0);
            await utils.getEditor().edit(edit => {
                edit.insert(insertPosition, `import ${componentName} from '${importPath}';\n`);
            });
            outputChannel.appendLine(`insertado import para ${componentName} desde ${importPath}`);
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Inserts the component in a new components section
 * @param {String} text
 * @param {String} componentName
 * @param {String} eol: \n o \r\n
 */
async function insertComponents(text, componentName, eol) {
    try {
        const match = /export\s*default\s*\{/.exec(text);

        if (!match || match.index === -1) {
            return;
        }
        const insertIndex = match.index + match[0].length;
        const propIndent = utils.getIndentBase().repeat(1);
        const component = `${eol}${propIndent}components: {${eol}${utils.getIndent()}${componentName}${eol}${propIndent}},`;

        await utils.getEditor().edit(edit => {
            edit.insert(utils.getDocument().positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Inserts the component in an existing components section
 * @param {Object} match
 * @param {String} componentString
 * @param {String} eol  \n o \r\n
 */
async function insertInExistingComponents(match, componentString, eol) {
    try {
        let matchInsertIndex = match[0].length;
        let found = false;

        while (!found) {
            matchInsertIndex--;

            if (/\S/.test(match[0].charAt(matchInsertIndex))) {
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

        const component = `${lastCharacter}${eol}${utils.getIndent()}${componentString}`;

        await utils.getEditor().edit(edit => {
            edit.insert(utils.getDocument().positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        console.error(error);
    }
}
/**
 * Checks whether to create a new components section or append to an existing one and appends it
 * @param {String} componentName
 * @returns {Promise<void>}
 */
async function insertComponent(componentName) {
    try {
        if (utils.isComponentRegistered(componentName)) {
            return;
        }
        const componentString = utils.addTrailingComma(utils.pascalCase(componentName));
        const text = utils.getDocumentText();
        const eol = utils.getEol();

        const testYaRegistrado = new RegExp(`components\\s*:\\s*{[^}]*${componentString}\\W`, 'g').test(text);
        if (testYaRegistrado) {
            return;
        }
        const match = /components( )*:( )*{[\s\S]*?(?=})/.exec(text);

        // Components not yet defined add section with component
        if (!match || match.index === -1) {
            return insertComponents(text, componentString, eol);
        } else {
            // Add the component to components
            insertInExistingComponents(match, componentString, eol);
        }
    } catch (error) {
        console.error(error);
    }
}
/**
 * Inserts the snippet for the component in the template section
 * @param {String} file
 * @param {String} fileName
 */
async function addComponentSnippet(file, fileName) {
    try {
        const requiredProps = await utils.retrieveRequirePropsFromFile(file);
        const hasSlots = await utils.retrieveHasSlots(file);
        const includeRef = getConfig('includeRefAtribute');
        let tabStop = 1;
        const ref = includeRef ? ` ref="$${tabStop++}"` : '';
        const requiredPropsSnippetString = requiredProps.reduce(
            (accumulator, prop) => `${accumulator} :${utils.propCase(prop)}="$${tabStop++}"`,
            ''
        );
        const tagName = utils.componentCase(fileName);
        const openTagChar = utils.getCharBefore() === '<' ? '' : '<';
        const closeTag = hasSlots ? `>$${tabStop}</${tagName}>` : '/>';
        const snippetString = `${openTagChar}${tagName}${ref}${requiredPropsSnippetString} ${closeTag}`;
        utils.getEditor().insertSnippet(new SnippetString(snippetString));
        outputChannel.appendLine(`insertado snippet en template:  ${snippetString}`);
    } catch (error) {
        console.error(error);
    }
}

const generateHtml = (url, name) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalle del componente ${name}</title>
    <style type="text/css">
        html, body, div, iframe { margin: 0; padding: 0; height: 100%; }
        iframe { display: block; width: 100%; border: none; }
    </style>
</head>
<body>
    <iframe src="${url}">
</body>
</html>
 `;
};

const importFile = commands.registerCommand('VueDiscoveryMTM.importFile', async (file, fileName) => {
    if (!utils.hasScriptTagInActiveTextEditor()) {
        return window.showWarningMessage('Looks like there is no script tag in this file!');
    }
    const componentName = (await utils.retrieveComponentName(file)) || fileName;
    await insertImport(file, fileName);
    await insertComponent(componentName);
    await addComponentSnippet(file, componentName);
});

const setConfigOption = commands.registerCommand('VueDiscoveryMTM.tests.setConfigOption', setConfig);

/**
 *
 * @param {ExtensionContext} context contexto
 * @returns {Disposable}
 */
const showComponentHelp = context =>
    commands.registerCommand('VueDiscoveryMTM.showComponentHelp', async componentInput => {
        const urlShowcase = getConfig('componentShowcaseUrl');
        const useShowcase = getConfig('useComponentShowcase');

        if (!useShowcase || !urlShowcase) {
            return;
        }
        let componente = componentInput;
        if (!componente) {
            const document = utils.getDocument();
            const position = utils.getActiveEditorPosition();
            if (
                !utils.isPositionInTemplateSection(position) ||
                !utils.isPositionOverAComponentTag(document, position)
            ) {
                getCurrentPanel()?.dispose();
                return;
            }
            componente = utils.getComponenteTagPositionIsOver(document, position);
        }

        // Lanzamos la carga del showcase para el componente actual
        const url = `${urlShowcase}/docs/${utils.pascalCase(componente)}.html`;

        //validamos que exista la url
        const timeout = getConfig('componentShowcaseTimeout') || 3000;
        const response = await utils.fetchWithTimeout(url, { method: 'HEAD' }, timeout);
        const isOk = response ? response.status === 200 : false;

        if (!isOk) {
            getCurrentPanel()?.dispose();
            outputChannel.appendLine(
                `Llamada al comando showComponentHelp no válida: ${response ? response.status : ''} `
            );
            return;
        }

        if (!getCurrentPanel()) {
            // Create and show panel
            setCurrentPanel(
                window.createWebviewPanel(
                    'showComponentHelp',
                    'Detalle uso del componente',
                    {
                        viewColumn: ViewColumn.Beside,
                        preserveFocus: true,
                    },
                    {
                        enableScripts: true,
                        enableCommandUris: true,
                    }
                )
            );
        }

        // And set its HTML content
        const text = generateHtml(url, componente);
        getCurrentPanel().webview.html = text;

        // Reset when the current panel is closed
        getCurrentPanel().onDidDispose(
            () => {
                setCurrentPanel(undefined);
            },
            null,
            context.subscriptions
        );
    });

export { importFile, setConfigOption, showComponentHelp };
