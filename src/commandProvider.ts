import { commands, window, Position, SnippetString, ViewColumn } from 'vscode';
import type { Disposable, ExtensionContext, Uri } from 'vscode';
import * as utils from './utils';
import { outputChannel, getConfig, setConfig, getCurrentPanel, setCurrentPanel, getVueFiles } from '@/config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import type { VueFileEntry } from '@/types';

/**
 * Normaliza el argumento del comando de importacion.
 * Acepta tanto la entrada completa del componente (usada por el CompletionProvider)
 * como una simple ruta al fichero (API publica del comando).
 */
const resolveComponentEntry = (item: VueFileEntry | string, fileName?: string): VueFileEntry => {
    if (typeof item !== 'string') {
        return item;
    }
    const filePath = item;
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const known = getVueFiles().find(entry => entry.filePath.replace(/\\/g, '/').toLowerCase() === normalized);
    return known ?? { filePath, componentName: fileName ?? '' };
};

/**
 * Genera la ruta de importacion de un componente Vue.
 */
function getImportPath(item: VueFileEntry, fileName: string): string | undefined {
    try {
        const fileWithoutRootPath = item.filePath.replace(`${utils.getRootPath()}/`, '');
        const alias = utils.getAlias(fileWithoutRootPath);

        return alias
            ? fileWithoutRootPath.replace(`${alias.path}`, alias.value)
            : `${utils.getRelativePath(fileWithoutRootPath)}/${fileName}.vue`;
    } catch (error) {
        console.error('Error en getImportPath:', error);
        return undefined;
    }
}

/**
 * Inserts the import in the scripts section
 */
async function insertImport(item: VueFileEntry, fileName: string): Promise<void> {
    try {
        const componentName = utils.pascalCase(item.componentName || fileName);
        if (!utils.isComponentRegistered(componentName)) {
            const document = utils.getDocument();
            const text = utils.getDocumentText();
            const editor = utils.getEditor();
            if (!document || !text || !editor) {
                return;
            }
            const match = /<script/.exec(text);
            if (!match) {
                return;
            }
            const importPath = getImportPath(item, fileName);
            if (!importPath) {
                return;
            }
            if (text.indexOf(`import ${componentName} from '${importPath}`) === -1) {
                const scriptTagPosition = document.positionAt(match.index);
                const insertPosition = new Position(scriptTagPosition.line + 1, 0);
                await editor.edit(edit => {
                    edit.insert(insertPosition, `import ${componentName} from '${importPath}';\n`);
                });
                outputChannel.appendLine(`insertado import para ${componentName} desde ${importPath}`);
            }
        }
    } catch (error) {
        console.error('Error en insertImport:', error);
    }
}

/**
 * Inserts the component in a new components section
 */
async function insertComponents(text: string, componentName: string, eol: string): Promise<void> {
    try {
        const match = /export\s*default\s*\{/.exec(text);

        if (!match || match.index === -1) {
            return;
        }
        const insertIndex = match.index + match[0].length;
        const propIndent = utils.getIndentBase().repeat(1);
        const component = `${eol}${propIndent}components: {${eol}${utils.getIndent()}${componentName}${eol}${propIndent}},`;

        await utils.getEditor()?.edit(edit => {
            edit.insert(utils.getDocument()!.positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        console.error('Error en insertComponent:', error);
    }
}

/**
 * Inserts the component in an existing components section
 */
async function insertInExistingComponents(match: RegExpExecArray, componentString: string, eol: string): Promise<void> {
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

        await utils.getEditor()?.edit(edit => {
            edit.insert(utils.getDocument()!.positionAt(insertIndex), component);
        });
        outputChannel.appendLine(`insertado componente en lista componentes: ${component}`);
    } catch (error) {
        console.error('Error en insertInExistingComponents:', error);
    }
}

/**
 * Checks whether to create a new components section or append to an existing one and appends it
 */
async function insertComponent(componentName: string): Promise<void> {
    try {
        if (utils.isComponentRegistered(componentName)) {
            return;
        }
        const componentString = utils.addTrailingComma(utils.pascalCase(componentName));
        const text = utils.getDocumentText();
        if (!text) {
            return;
        }
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
            return insertInExistingComponents(match, componentString, eol);
        }
    } catch (error) {
        console.error('Error en insertComponent:', error);
    }
}

/**
 * Inserts the snippet for the component in the template section
 */
async function addComponentSnippet(item: VueFileEntry, fileName: string): Promise<void> {
    try {
        const requiredProps = await utils.retrieveRequirePropsFromFile(item);
        const hasSlots = await utils.retrieveHasSlots(item);
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
        // Se espera a la insercion para que el comando no termine antes de
        // que el snippet este en el documento.
        await utils.getEditor()?.insertSnippet(new SnippetString(snippetString));
        outputChannel.appendLine(`insertado snippet en template:  ${snippetString}`);
    } catch {
        outputChannel.appendLine(`No se ha podido insertar snippet en template para :  ${fileName}`);
    }
}

/**
 * Generates an HTML string with an embedded iframe.
 */
const generateHtml = (url: string, name: string): string => {
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
 */
const importFile = commands.registerCommand(
    'VueDiscoveryMTM.importFile',
    async (item: VueFileEntry | string, fileName?: string) => {
        try {
            if (!utils.hasScriptTagInActiveTextEditor()) {
                return window.showWarningMessage('Looks like there is no script tag in this file!');
            }
            const entry = resolveComponentEntry(item, fileName);
            const componentName = entry.componentName || fileName || '';
            await insertImport(entry, componentName);
            await insertComponent(componentName);
            await addComponentSnippet(entry, componentName);
        } catch (error) {
            outputChannel.appendLine(`Error en importFile: ${(error as Error).message}`);
        }
    }
);

/**
 * Sets the configuration option for VueDiscoveryMTM.tests.
 */
const setConfigOption = commands.registerCommand('VueDiscoveryMTM.tests.setConfigOption', setConfig);

/**
 * Registra el comando que muestra el showcase de un componente.
 */
const showComponentHelp = (context: ExtensionContext): Disposable =>
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
                !document ||
                !utils.isPositionInTemplateSection(position) ||
                !utils.isPositionOverAComponentTag(document, position)
            ) {
                getCurrentPanel()?.dispose();
                return;
            }
            componente = utils.getComponenteTagPositionIsOver(document, position);
        }
        const componentName = utils.pascalCase(componente ?? '');
        // Lanzamos la carga del showcase para el componente actual
        const url = `${urlShowcase}/${componentName.substring(2)}`;
        const title = `Detalle uso del componente ${componentName}`;

        // si es el mismo componente hacemos dispose
        if (getCurrentPanel()?.title === title) {
            getCurrentPanel()?.dispose();
            return;
        }

        //validamos que exista la url
        const timeout = getConfig('componentShowcaseTimeout') || 3000;
        outputChannel.appendLine(`Llamada al comando showComponentHelp: ${url} `);
        try {
            await utils.fetchWithTimeout(url, { method: 'HEAD' }, timeout);
        } catch (error) {
            getCurrentPanel()?.dispose();
            outputChannel.appendLine(
                `Llamada al comando showComponentHelp no válida: ${(error as Error).name === 'Abort' ? 'Timeout error' : (error as Error).message || ''} `
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
        if (getCurrentPanel()) {
            getCurrentPanel()!.webview.html = text;
        }

        // Reset when the current panel is closed
        getCurrentPanel()?.onDidDispose(
            () => {
                setCurrentPanel(undefined);
            },
            null,
            context.subscriptions
        );
    });

/**
 * Deletes the node_modules folder for a given URI.
 */
const deleteNodeModules = commands.registerCommand('VueDiscoveryMTM.deleteNodeModules', async (uri?: Uri) => {
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
 */
const borrarNodeModules = async (nodeModulesPath: string): Promise<void> => {
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
 */
const createTestUnitFile = commands.registerCommand('VueDiscoveryMTM.createTestUnitFile', async (uri?: Uri) => {
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
            log(`Error al generar el fichero de test: ${(error as Error).message}`, 'error');
        }
        window.setStatusBarMessage('');
    } else {
        log('Este comando solo funciona con archivos .vue', 'warning');
    }
});

export { importFile, setConfigOption, showComponentHelp, deleteNodeModules, createTestUnitFile };
