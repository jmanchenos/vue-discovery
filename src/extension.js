import * as utils from './utils';
import * as config from './config';
import * as completionProvider from './completionProvider';
import * as hoverProvider from './hoverProvider';
import * as definitionProvider from './definitionProvider';
import * as commandProvider from './commandProvider';
import * as actionProvider from './actionProvider';

/**
 * @typedef {import ('vscode').ExtensionContext} ExtensionContext;
 */

const initConfig = async () => {
    try {
        config.outputChannel.clear();
        utils.getFilesByExtension('js').then(jsFiles => config.setJsFiles(jsFiles));
        utils.getCyFiles().then(cyFiles => config.setCyFiles(cyFiles));
        utils.getPluginsList().then(plugins => config.setPlugins(plugins));

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
    } catch (error) {
        console.error(error);
        config.outputChannel.appendLine('Error en la inicialización de la extensión');
    }
};

/**
 * @param {ExtensionContext} context
 * @returns {Promise<void>}
 */
export async function activate(context = null) {
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
            commandProvider.showComponentHelp(context),
            actionProvider.exampleActionProvider
        );
        //Inicializamos variables
        const initConfigTimestamp = Date.now();
        await initConfig();
        const endTimestamp = Date.now();
        config.outputChannel.appendLine('extensión activada');
        config.outputChannel.appendLine(`Ha tardado ${endTimestamp - initTimestamp} ms en cargar la extensión`);
        config.outputChannel.appendLine(
            `Ha tardado ${endTimestamp - initConfigTimestamp} ms en inicializar la extensión`
        );
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
