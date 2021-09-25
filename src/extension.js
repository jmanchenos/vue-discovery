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
        config.setJsFiles(await utils.getFilesByExtension('js'));

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
        //Inicializamos variables
        initConfig();
        context.subscriptions.push(
            completionProvider.componentsCompletionItemProvider,
            completionProvider.propsCompletionItemProvider,
            completionProvider.eventsCompletionItemProvider,
            completionProvider.thisCompletionItemProvider,
            completionProvider.cypressCompletionItemProvider,
            definitionProvider.componentsDefinitionProvider,
            hoverProvider.componentsHoverProvider,
            commandProvider.importFile,
            commandProvider.setConfigOption,
            commandProvider.showComponentHelp(context)
        );

        config.outputChannel.appendLine('extensión activada');
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
