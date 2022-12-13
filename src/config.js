import { workspace, window } from 'vscode';
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
const setVueFiles = files => {
    vueFiles = files;
};
const setVueRegisteredFiles = files => {
    vueRegisteredFiles = files;
};
const setJsFiles = files => {
    jsFiles = files;
};
const setCyFiles = files => {
    cyFiles = files;
};
const setPlugins = files => {
    plugins = files;
};
const setConstants = files => {
    constants = files;
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

/** @returns {WebviewPanel}*/
const getCurrentPanel = () => currentPanel;

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
};
