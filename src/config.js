import { workspace, window } from 'vscode';
import * as vueParser from '@vuedoc/parser';

/**
 * @typedef {import ('vscode').WebviewPanel} WebviewPanel;
 */

const configOverride = {};
const outputChannel = window.createOutputChannel('Vue Discovery - MTM');
let cyFiles = [];
let jsFiles = [];
let plugins = [];
let constants = [];
let vueFiles = [];
let vueRegisteredFiles = [];
let currentPanel = undefined;
let currentWorkspaceFolder;

//indicar que la variable que vamos a definir parsedVudeMap es del tipo Map
/** @type {Map<string, any>} */
const parsedVueMap = new Map();

const setConfig = (key, value) => {
    configOverride[key] = value;
};
const getConfig = key => {
    try {
        return key in configOverride ? configOverride[key] : workspace.getConfiguration().get(`VueDiscoveryMTM.${key}`);
    } catch (error) {
        console.error(error);
    }
};
const setVueFiles = (files = []) => {
    vueFiles = files;
};
const setVueRegisteredFiles = (files = []) => {
    vueRegisteredFiles = files;
};
const setJsFiles = (files = []) => {
    jsFiles = files;
};
const setCyFiles = (files = []) => {
    cyFiles = files;
};
const setPlugins = (files = []) => {
    plugins = files;
};
const setConstants = (files = []) => {
    constants = files;
};
const setCurrentWorkspaceFolder = folder => {
    currentWorkspaceFolder = folder;
};
const setCurrentPanel = panel => {
    currentPanel = panel;
};
const getVueFiles = () => vueFiles;
const getVueRegisteredFiles = () => vueRegisteredFiles;
const getJsFiles = () => jsFiles;
const getCyFiles = () => cyFiles;
const getPlugins = () => plugins;
const getConstants = () => constants;
const getCurrentWorkspaceFolder = () => currentWorkspaceFolder;

/** @returns {WebviewPanel}*/
const getCurrentPanel = () => currentPanel;

/* guardar parseado del fichero vue actual */
const getVueObjects = document => parsedVueMap.get(document.uri.toString());
const setVueObjects = async document => {
    // si el documento tiene la extension Vue
    if (document.fileName.endsWith('.vue')) {
        const vuedocOptions = { filename: document.fileName };
        const { data, computed, props, methods } = await vueParser.parse(vuedocOptions);
        parsedVueMap.set(document.uri.toString(), { data, props, methods, computed });
        outputChannel.appendLine(`Se ha cargado la configuración para el documento vue ${document.fileName}`);
    }
};
const removeVueObjects = document => parsedVueMap.delete(document.uri.toString());

export {
    outputChannel,
    setConfig,
    getConfig,
    currentPanel,
    setVueFiles,
    setVueRegisteredFiles,
    setJsFiles,
    setCyFiles,
    setPlugins,
    getVueFiles,
    getVueRegisteredFiles,
    getJsFiles,
    getCyFiles,
    getPlugins,
    setCurrentPanel,
    getCurrentPanel,
    getConstants,
    setConstants,
    getCurrentWorkspaceFolder,
    setCurrentWorkspaceFolder,
    getVueObjects,
    setVueObjects,
    removeVueObjects,
};
