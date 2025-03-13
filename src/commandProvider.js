import { commands, window, Position, SnippetString, ViewColumn } from 'vscode';
import * as utils from './utils.js';
import { outputChannel, getConfig, setConfig, getCurrentPanel, setCurrentPanel } from './config.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

/**
 * @typedef {import ('vscode').ExtensionContext} ExtensionContext;
 * @typedef {import ('vscode').Disposable} Disposable
 * @typedef {import ('vscode').Uri} Uri
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
        const includeDataCy = getConfig('includeDataCyAttribute');
        let tabStop = 1;
        const ref = includeDataCy ? ` data-cy="$${tabStop++}"` : '';
        const requiredPropsSnippetString =
            requiredProps?.reduce(
                (accumulator, prop) => `${accumulator} :${utils.propCase(prop)}="$${tabStop++}"`,
                ''
            ) || '';
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

/**
 * Generates an HTML string with an embedded iframe.
 *
 * @param {string} url - The URL to be embedded in the iframe.
 * @param {string} name - The name of the component.
 * @returns {string} The generated HTML string.
 */
const generateHtml = (url, name) => {
    const cspSource = getCurrentPanel().webview.cspSource;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="color-scheme" content="light">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalle del componente ${name}</title>
   <style type="text/css">
        /* Reset CSS para el body y html */
        html, body {
            margin: 0;
            padding: 0;
            background-color: white; /* Forzar fondo blanco */
            color: black; /* Forzar color negro */
            font-family: sans-serif; /* Forzar fuente */
            font-size: 16px; /* Forzar tamaño de fuente */
            line-height: 1.5; /* Forzar interlineado */
            /* ... otros estilos de reseteo ... */
        }

        /* Estilos para el iframe */
        iframe {
            display: block;
            width: 100%;
            height: 100vh; /* Usar altura de la ventana */
            border: none;
            background-color: white; /* Forzar fondo blanco */
        }
    </style>
</head>
<body>
    <iframe src="${url}">
</body>
</html>
 `;
};
/**
 * Registers the 'VueDiscoveryMTM.importFile' command and imports a file into a Vue component.
 *
 * @param {string} file - The file to import.
 * @param {string} fileName - The name of the file.
 * @returns {Promise<void>} - A promise that resolves when the import process is complete.
 */
const importFile = commands.registerCommand('VueDiscoveryMTM.importFile', async (file, fileName) => {
    if (!utils.hasScriptTagInActiveTextEditor()) {
        return window.showWarningMessage('Looks like there is no script tag in this file!');
    }
    const componentName = (await utils.retrieveComponentName(file)) || fileName;
    await insertImport(file, fileName);
    await insertComponent(componentName);
    await addComponentSnippet(file, componentName);
});

/**
 * Sets the configuration option for VueDiscoveryMTM.tests.
 *
 * @param {string} command - The command to register.
 * @param {Function} callback - The callback function to execute when the command is triggered.
 * @returns {Disposable} - A disposable object that can be used to unregister the command.
 */
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
        const componentName = utils.pascalCase(componente);
        // Lanzamos la carga del showcase para el componente actual
        const url = `${urlShowcase}/${componentName.substring(2)}`;
        // const url = `${urlShowcase}/docs/${componentName}.html`;
        const title = `Detalle uso del componente ${componentName}`;

        // si es el mismo componente hacemos dispose
        if (getCurrentPanel()?.title === title) {
            getCurrentPanel().dispose();
            return;
        }

        //validamos que exista la url
        const timeout = getConfig('componentShowcaseTimeout') || 3000;
        outputChannel.appendLine(`Llamada al comando showComponentHelp: ${url} `);
        try {
            await utils.fetchWithTimeout(url, { method: 'HEAD' }, timeout);
        }catch (error) {
            getCurrentPanel()?.dispose();
            outputChannel.appendLine(
                `Llamada al comando showComponentHelp no válida: ${error.name==='Abort'?'Timeout error':error.message||''} `
            );
            return;
        }

        if (!getCurrentPanel()) {
            // Create and show panel
            setCurrentPanel(
                window.createWebviewPanel(
                    'showComponentHelp',
                    title,
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
        const text = generateHtml(url, componentName);
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

/**
 * Deletes the node_modules folder for a given URI.
 *
 * @param {Uri} uri - The URI of the file or directory.
 * @returns {Promise<void>} - A promise that resolves when the node_modules folder is deleted.
 */
const deleteNodeModules = commands.registerCommand('VueDiscoveryMTM.deleteNodeModules', async uri => {
    if (uri?.fsPath) {
        const nodeModulesPath = utils.findNodeModulesPath(uri);
        outputChannel.appendLine(`nodeModulesPath a borrar: ${nodeModulesPath}`);
        if (nodeModulesPath) {
            // preguntar al usuario si estamos seguros de borrar la carpeta, para ello generar un quickPick
            const respuesta = await window.showQuickPick(['Sí', 'No'], {
                placeHolder: '¿Estás seguro de que deseas eliminar la carpeta node_modules?',
            });
            if (respuesta === 'Sí') {
                window.setStatusBarMessage('Eliminando la carpeta node_modules...');
                await borrarNodeModules(nodeModulesPath);
                window.setStatusBarMessage('');
            } else {
                outputChannel.appendLine('Se canceló la eliminación de la carpeta node_modules.');
                window.showInformationMessage('Se canceló la eliminación de la carpeta node_modules.');
            }
        } else {
            outputChannel.appendLine('No se encontró la carpeta node_modules en este directorio.');
            window.showWarningMessage('No se encontró la carpeta node_modules en este directorio.');
        }
    }
});

/**
 * Deletes the node_modules folder at the specified path.
 *
 * @param {string} nodeModulesPath - The path to the node_modules folder.
 * @returns {Promise<void>} A promise that resolves when the folder is deleted successfully.
 * @throws {Error} If there is an error while deleting the folder.
 */
const borrarNodeModules = async nodeModulesPath => {
    return new Promise((resolve, reject) => {
        fs.rm(nodeModulesPath, { recursive: true, force: true }, err => {
            if (err) {
                outputChannel.appendLine(`Error al borrar node_modules: ${err.message}`);
                window.showErrorMessage(`Error al borrar node_modules: ${err.message}`);
                reject(new Error(`Error al borrar node_modules: ${err.message}`));
            } else {
                outputChannel.appendLine('Carpeta node_modules borrada con éxito.');
                window.showInformationMessage('Carpeta node_modules borrada con éxito.');
                resolve();
            }
        });
    });
};

/**
 * Creates a test unit file provider command.
 *
 * @param {Uri} uri - The URI of the file.
 * @returns {Promise<void>} - A promise that resolves when the test unit file is created.
 */
const createTestUnitFile = commands.registerCommand('VueDiscoveryMTM.createTestUnitFile', async uri => {
    const log = (msg = '', type = 'info') => {
        outputChannel.appendLine(msg);
        switch (type) {
            case 'error':
                window.showErrorMessage(msg);
                break;
            case 'warning':
                window.showWarningMessage(msg);
                break;
            case 'info':
                window.showInformationMessage(msg);
                break;
            default:
        }
    };
    if (uri?.fsPath && path.extname(uri.fsPath) === '.vue') {
        const workspaceFsPath = utils.getWorkspaceRootUri(uri).fsPath;
        const relativePath = utils.getRelativePathForUri(uri).replace('./src', '@');
        const testUnitLibrary = utils.findTestUnitScriptPath(uri);
        if (!testUnitLibrary) {
            log(
                `No existe el fichero con la libreria necesaria para generar el fichero de test unitarios: ${testUnitLibrary}`,
                'error'
            );
            return;
        }
        window.setStatusBarMessage('Generando fichero de test...');
        try {
            const command = `node  ${testUnitLibrary} "${relativePath}"`;
            exec(command, { cwd: workspaceFsPath }, (error, stdout, stderr) => {
                if (error) {
                    log(`Error al ejecutar: ${error.message}`, 'error');
                    return;
                }
                if (stderr) {
                    log(`Error: ${stderr}`, 'error');
                    return;
                }
                if (stdout) {
                    log(`Resultado: ${stdout}`);
                } else {
                    log('Fichero de test generado con éxito', 'info');
                }
            });
        } catch (error) {
            log(`Error al generar el fichero de test: ${error.message}`, 'error');
        }
        window.setStatusBarMessage('');
    } else {
        log('Este comando solo funciona con archivos .vue', 'warning');
    }
});

export { importFile, setConfigOption, showComponentHelp, deleteNodeModules, createTestUnitFile };
