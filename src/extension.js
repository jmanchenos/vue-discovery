import { ExtensionContext } from 'vscode';
import * as utils from './utils';
import * as config from './config';
import * as completionProvider from './completionProvider';
import * as hoverProvider from './hoverProvider';
import * as definitionProvider from './definitionProvider';
import * as commandProvider from './commandProvider';

const initConfig = async () => {
    try {
        config.outputChannel.clear();
        const jsFiles = await utils.getFilesByExtension('js');
        const plugins = await utils.getPluginsList();
        const rootFiles = await utils.getFilesByExtension('vue');
        const registeredFiles = await utils.getFilesByExtension('vue', 'registeredDirectory');
        const preformattedData = {
            vueFiles: [...new Set([...rootFiles, ...registeredFiles])],
            vueRegisteredFiles: registeredFiles,
        };

        let vueFiles = [],
            vueRegisteredFiles = [];

        //Asignamos a cada fichero un map para recuperar nombre de componente y ruta del fichero
        await Promise.all(preformattedData.vueFiles.map(utils.getComponentTuple)).then(result => {
            (vueFiles || []).push(...result);
        });
        await Promise.all(preformattedData.vueRegisteredFiles.map(utils.getComponentTuple)).then(result => {
            (vueRegisteredFiles || []).push(...result);
        });
        config.setJsFiles(jsFiles);
        config.setPlugins(plugins);
        config.setVueFiles(vueFiles);
        config.setVueRegisteredFiles(vueRegisteredFiles);
        config.setCurrentPanel(undefined);
    } catch (error) {
        console.error(error);
        config.outputChannel.appendLine('Error en la inicialización de la extensión');
    }
};

/**
 * @param {ExtensionContext} context
 * @returns {Promise<void>}
 */
export async function activate(context) {
    try {
        const initTimestamp = Date.now();
        context.subscriptions.push(
            completionProvider.componentsCompletionItemProvider,
            completionProvider.propsCompletionItemProvider,
            completionProvider.eventsCompletionItemProvider,
            completionProvider.thisCompletionItemProvider,
            completionProvider.pluginCompletionItemProvider,
            completionProvider.objectCompletionItemProvider,
            completionProvider.cypressCompletionItemProvider,
            definitionProvider.componentsDefinitionProvider,
            hoverProvider.componentsHoverProvider,
            commandProvider.importFile,
            commandProvider.setConfigOption,
            commandProvider.showComponentHelp(context)
        );
        //Inicializamos variables
        await initConfig();
        const endTimestamp = Date.now();
        config.outputChannel.appendLine('extensión activada');
        config.outputChannel.appendLine(`Ha tardado ${endTimestamp - initTimestamp} ms`);
    } catch (error) {
        console.error(error);
    }
}

/**
 * @returns {Promise<void>}
 */
export async function deactivate() {
    config.outputChannel.appendLine('extensión desactivada');
    config.outputChannel.dispose();
}
