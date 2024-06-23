import * as utils from './utils';
import * as config from './config';
import * as completionProvider from './completionProvider';
import * as hoverProvider from './hoverProvider';
import * as definitionProvider from './definitionProvider';
import * as commandProvider from './commandProvider';
import * as contextMenuProvider from './contextMenuProvider';
import { window, workspace } from 'vscode';

/**
 * @typedef {import ('vscode').ExtensionContext} ExtensionContext;
 */

config.outputChannel.clear();

const setupCurrentWorkspace = async document => {
    try {
        const initConfigTimestamp = Date.now();
        const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
        const currentWorkspaceFolder = config.getCurrentWorkspaceFolder();
        // Comprobar si el espacio de trabajo ha cambiado
        if (
            workspaceFolder &&
            (!currentWorkspaceFolder || currentWorkspaceFolder.uri.toString() !== workspaceFolder.uri.toString())
        ) {
            config.outputChannel.appendLine(
                `Se ha cambiado de carpeta de espacio de trabajo: ${workspaceFolder.uri.toString()}`
            );
            config.setCurrentWorkspaceFolder(workspaceFolder);
            await Promise.all([
                utils.getFilesByExtension('js').then(jsFiles => config.setJsFiles(jsFiles)),
                utils.getCyFiles().then(cyFiles => config.setCyFiles(cyFiles)),
                utils.getPluginsList().then(plugins => config.setPlugins(plugins)),
                utils.getConstantsList().then(constants => config.setConstants(constants)),
            ]);

            const preformattedData = {};
            const rootFiles = [];
            const registeredFiles = [];
            await Promise.all([
                utils.getFilesByExtension('vue').then(res => rootFiles.push(...res)),
                utils.getFilesByExtension('vue', 'registeredDirectory').then(res => registeredFiles.push(...res)),
            ]).then(() => {
                preformattedData.vueFiles = [...new Set([...rootFiles, ...registeredFiles])];
                preformattedData.vueRegisteredFiles = registeredFiles;
            });

            //Asignamos a cada fichero un map para recuperar nombre de componente y ruta del fichero
            await Promise.all(preformattedData.vueFiles.map(utils.getComponentTuple)).then(result =>
                config.setVueFiles(result || [])
            );
            await Promise.all(preformattedData.vueRegisteredFiles.map(utils.getComponentTuple)).then(result =>
                config.setVueRegisteredFiles(result || [])
            );
            config.setCurrentPanel(undefined);
            const endInitTimestamp = Date.now();
            config.outputChannel.appendLine(
                `Tiempo de carga de configuración: ${endInitTimestamp - initConfigTimestamp} ms`
            );
        }
    } catch (error) {
        console.error(error);
        config.outputChannel.appendLine('Error en la carga de la configuración  para el workspace');
    }
};

export let context;

/**
 * @param {ExtensionContext} ctx
 * @returns {Promise<void>}
 */
export async function activate(ctx = null) {
    try {
        context = ctx;
        const initTimestamp = Date.now();
        context.subscriptions.push(
            completionProvider.componentsCompletionItemProvider,
            completionProvider.propsCompletionItemProvider,
            completionProvider.eventsCompletionItemProvider,
            completionProvider.thisCompletionItemProvider,
            completionProvider.pluginCompletionItemProvider,
            completionProvider.objectCompletionItemProvider,
            completionProvider.cypressCompletionItemProvider,
            completionProvider.constantsCompletionItemProvider,
            completionProvider.refsCompletionItemProvider,
            definitionProvider.componentsDefinitionProvider,
            definitionProvider.cypressDefinitionProvider,
            definitionProvider.pluginDefinitionProvider,
            definitionProvider.refsDefinitionProvider,
            hoverProvider.componentsHoverProvider,
            commandProvider.importFile,
            commandProvider.setConfigOption,
            commandProvider.showComponentHelp(context),
            commandProvider.deleteNodeModules,
            contextMenuProvider.createTestFileProvider
        );
        // Suscribirse al evento onDidChangeActiveTextEditor
        window.onDidChangeActiveTextEditor(
            async editor => {
                try {
                    // Obtener el espacio de trabajo asociado al archivo abierto en el editor
                    editor && (await setupCurrentWorkspace(editor.document));
                } catch (err) {
                    console.error('Error en onDidChangeActiveTextEditor: ', err);
                }
            },
            null,
            context.subscriptions
        );

        // Suscribirse al evento  que salva un fichero
        workspace.onDidSaveTextDocument(
            async document => {
                try {
                    await config.setVueObjects(document);
                } catch (err) {
                    console.error('Error en onDidSaveTextDocument: ', err);
                }
            },
            null,
            context.subscriptions
        );
        workspace.onDidOpenTextDocument(
            async document => {
                try {
                    if (!config.getCurrentWorkspaceFolder()) {
                        await setupCurrentWorkspace(document);
                    }
                    if (!config.getVueObjects(document)) {
                        config.setVueObjects(document);
                    }
                } catch (err) {
                    console.error('Error en onDidOpenTextDocument: ', err);
                }
            },
            null,
            context.subscriptions
        );
        workspace.onDidCloseTextDocument(
            async document => {
                try {
                    config.removeVueObjects(document);
                } catch (err) {
                    console.error('Error en onDidCloseTextDocument: ', err);
                }
            },
            null,
            context.subscriptions
        );

        const endTimestamp = Date.now();
        config.outputChannel.appendLine('extensión activada');
        config.outputChannel.appendLine(`Ha tardado ${endTimestamp - initTimestamp} ms en cargar la extensión`);
    } catch (error) {
        console.error(error);
    }
}

/**
 * @returns {Promise<void>}
 */
export async function deactivate() {
    config.outputChannel.dispose();
    context.subscriptions.forEach(subscription => subscription.dispose());
    config.outputChannel.appendLine('extensión desactivada');
}
