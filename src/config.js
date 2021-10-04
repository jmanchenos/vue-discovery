const { workspace, window, WebviewPanel } = require('vscode');
const configOverride = {};
const outputChannel = window.createOutputChannel('Vue Discovery - MTM');
let cyFiles = [];
let jsFiles = [];
let plugins = [];
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
const setCurrentPanel = panel => {
    currentPanel = panel;
};
const getVueFiles = () => vueFiles;
const getVueRegisteredFiles = () => vueRegisteredFiles;
const getJsFiles = () => jsFiles;
const getCyFiles = () => cyFiles;
const getPlugins = () => plugins;

/**@returns {WebviewPanel}*/
const getCurrentPanel = () => currentPanel;

module.exports = {
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
};
